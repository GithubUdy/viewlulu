// cosmetic.controller.ts (최종: 이미지 URL 안전 매핑 추가)
import { Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/s3';
import { AuthRequest } from '../auth/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import {
  createCosmetic,
  createCosmeticGroup,
  createCosmeticInGroup,
  getMyCosmeticGroups,
  getCosmeticDetail,
} from './cosmetic.repository';

/**
 * ✅ 퍼블릭 URL 생성기
 * - env로 S3_PUBLIC_BASE_URL을 주면 그걸 우선 사용
 * - 아니면 기본 S3 virtual-hosted 스타일 사용
 *
 * 예) S3_PUBLIC_BASE_URL=https://viewlulus3.s3.ap-northeast-2.amazonaws.com
 */
const S3_PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ||
  `https://${S3_BUCKET}.s3.ap-northeast-2.amazonaws.com`;

const toPublicUrl = (keyOrUrl: string | null | undefined) => {
  if (!keyOrUrl) return null;
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
  // key에 공백/특수문자 있을 수 있어 encodeURI 처리
  return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encodeURI(
    keyOrUrl.replace(/^\//, '')
  )}`;
};

/**
 * POST /cosmetics
 * (기존 단일 업로드 유지)
 */
export const uploadCosmetic = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    const userId = req.user!.userId;
    const file = req.file;

    const ext = path.extname(file.originalname);
    const cosmeticId = uuidv4();

    const s3Key = `users/${userId}/cosmetics/${cosmeticId}${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const cosmetic = await createCosmetic({
      userId,
      s3Key,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    return res.status(201).json({
      message: '화장품 등록 완료',
      cosmetic,
    });
  } catch (error) {
    console.error('[uploadCosmetic]', error);
    return res.status(500).json({ message: '화장품 업로드 실패' });
  }
};

/**
 * GET /cosmetics/me
 * ✅ thumbnailUrl을 "바로 쓸 수 있는 URL"로 내려줌
 * - 기존 구조/필드명 유지
 */
export const getMyCosmeticsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groups = await getMyCosmeticGroups(userId);

    const mapped = groups.map((g: any) => ({
      ...g,
      // DB에 저장된 값이 key든 url이든, 최종적으로 url로 정규화
      thumbnailUrl: toPublicUrl(g.thumbnailUrl),
      // 디버깅용으로 key도 남기고 싶으면(프론트 깨지지 않음) 추가 가능:
      // thumbnailKey: g.thumbnailUrl,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('[getMyCosmeticsHandler]', error);
    return res.status(500).json({ message: '조회 실패' });
  }
};

/**
 * POST /cosmetics/bulk
 * (기존 로직 유지)
 */
export const uploadCosmeticBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, email } = req.user!;

    const nameRaw = req.body?.name;
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    if (files.length === 0) {
      return res.status(400).json({ message: 'photos are required' });
    }

    const group = await createCosmeticGroup({
      userId,
      userEmail: email,
      name,
    });

    try {
      for (const file of files) {
        const ext = path.extname(file.originalname);
        const imageId = uuidv4();

        const s3Key = `users/${userId}/cosmetics/${group.id}/${imageId}${ext}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        await createCosmeticInGroup({
          userId,
          groupId: group.id,
          s3Key,
          originalName: file.originalname,
          mimeType: file.mimetype,
        });
      }
    } catch (innerError) {
      console.error('[uploadCosmeticBulk][upload loop]', innerError);
      return res.status(500).json({ message: '화장품 등록 실패' });
    }

    return res.status(201).json({
      id: group.id,
      name: group.name,
      created_at: group.created_at,
    });
  } catch (error) {
    console.error('[uploadCosmeticBulk]', error);
    return res.status(500).json({ message: '화장품 등록 실패' });
  }
};

/**
 * GET /cosmetics/:id
 * ✅ photos 각 항목에 url 필드 추가 (기존 s3Key 유지)
 */
export const getCosmeticDetailHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const cosmeticId = Number(req.params.id);

    if (isNaN(cosmeticId)) {
      return res.status(400).json({ message: 'invalid cosmetic id' });
    }

    const cosmetic = await getCosmeticDetail({
      groupId: cosmeticId,
      userId,
    });

    if (!cosmetic) {
      return res.status(404).json({ message: '화장품을 찾을 수 없습니다.' });
    }

    const photos = Array.isArray(cosmetic.photos)
      ? cosmetic.photos.map((p: any) => ({
          ...p,
          url: toPublicUrl(p.s3Key),
        }))
      : [];

    return res.status(200).json({
      ...cosmetic,
      photos,
    });
  } catch (error) {
    console.error('[getCosmeticDetailHandler]', error);
    return res.status(500).json({ message: '화장품 상세 조회 실패' });
  }
};
