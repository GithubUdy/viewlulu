// cosmetic.controller.ts (최종본: 이미지 URL 매핑 + 삭제 기능 추가)
import { Response } from 'express';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

  // ✅ 삭제용 추가
  getGroupS3KeysForDelete,
  deleteCosmeticsByGroupId,
  deleteCosmeticGroupById,
  getSingleCosmeticS3KeyForDelete,
  deleteSingleCosmeticById,
} from './cosmetic.repository';

/**
 * ✅ 퍼블릭 URL 생성기 (기존 유지)
 */
const S3_PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ||
  `https://${S3_BUCKET}.s3.ap-northeast-2.amazonaws.com`;

const toPublicUrl = (keyOrUrl: string | null | undefined) => {
  if (!keyOrUrl) return null;
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
  return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encodeURI(
    keyOrUrl.replace(/^\//, '')
  )}`;
};

/**
 * POST /cosmetics (기존 단일 업로드 유지)
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
 */
export const getMyCosmeticsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groups = await getMyCosmeticGroups(userId);

    const mapped = groups.map((g: any) => ({
      ...g,
      thumbnailUrl: toPublicUrl(g.thumbnailUrl),
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('[getMyCosmeticsHandler]', error);
    return res.status(500).json({ message: '조회 실패' });
  }
};

/**
 * POST /cosmetics/bulk
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
          url: toPublicUrl(p.s3Key), // ✅ 기존 유지
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

/**
 * ✅ DELETE /cosmetics/:id
 * - 우선 groupId(=bulk 등록된 화장품)로 삭제 시도
 * - 없으면 단일 cosmetics.id 삭제(호환)
 */
export const deleteCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'invalid cosmetic id' });
    }

    // 1) 그룹(=bulk) 삭제 우선
    const groupKeys = await getGroupS3KeysForDelete({ groupId: id, userId });

    if (groupKeys.length > 0) {
      // 1-1) S3 객체 삭제
      for (const { s3Key } of groupKeys) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
          })
        );
      }

      // 1-2) DB 삭제 (cosmetics -> cosmetic_groups)
      await deleteCosmeticsByGroupId({ groupId: id, userId });
      const deletedGroup = await deleteCosmeticGroupById({ groupId: id, userId });

      if (!deletedGroup) {
        return res.status(500).json({ message: '그룹 삭제 실패' });
      }

      return res.status(200).json({ message: '삭제 완료', type: 'group', id });
    }

    // 2) (호환) 단일 cosmetics.id 삭제
    const single = await getSingleCosmeticS3KeyForDelete({ cosmeticId: id, userId });

    if (!single) {
      return res.status(404).json({ message: '삭제할 화장품을 찾을 수 없습니다.' });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: single.s3Key,
      })
    );

    const deleted = await deleteSingleCosmeticById({ cosmeticId: id, userId });
    if (!deleted) {
      return res.status(500).json({ message: '삭제 실패' });
    }

    return res.status(200).json({ message: '삭제 완료', type: 'single', id });
  } catch (error) {
    console.error('[deleteCosmeticHandler]', error);
    return res.status(500).json({ message: '삭제 중 오류가 발생했습니다.' });
  }
};
