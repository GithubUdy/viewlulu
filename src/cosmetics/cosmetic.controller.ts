/**
 * cosmetic.controller.ts (최종 안정본)
 * --------------------------------------------------
 * ✅ 기존 단일 업로드(/cosmetics) 로직/응답 유지 (절대 깨지지 않게)
 * ✅ 신규 bulk 업로드(/cosmetics/bulk) 추가
 * ✅ 예외 처리/검증 강화 + 운영 로그 강화
 */

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
  getMyCosmeticGroups, // 🔥 추가
  getCosmeticDetail, // ✅ 추가
} from './cosmetic.repository';


/**
 * POST /cosmetics
 * 화장품 사진 업로드 (기존 단일 업로드)
 * ⚠️ 기존 기능 절대 유지
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

    // 1️⃣ S3 업로드
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    // 2️⃣ DB 저장
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
 * 내 화장품 목록 조회
 * ⚠️ 현재는 기존 getMyCosmetics(userId) 유지 중
 * (그룹 기준으로 바꾸려면 repository에 getMyCosmeticGroups 추가 후 여기만 교체)
 */
export const getMyCosmeticsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const cosmetics = await getMyCosmeticGroups(userId);


    return res.status(200).json(cosmetics);
  } catch (error) {
    console.error('[getMyCosmeticsHandler]', error);
    return res.status(500).json({ message: '조회 실패' });
  }
};

/**
 * POST /cosmetics/bulk
 * 화장품 1개 등록 (사진 여러 장 + 이름)
 */
export const uploadCosmeticBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, email } = req.user!;

    // name 검증
    const nameRaw = req.body?.name;
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    // multer.array('photo') 로 들어온 파일들 검증
    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    if (files.length === 0) {
      return res.status(400).json({ message: 'photos are required' });
    }

    // 1️⃣ 화장품 그룹 생성
    const group = await createCosmeticGroup({
      userId,
      userEmail: email,
      name,
    });


    try {
      // 2️⃣ 사진 여러 장 처리
      for (const file of files) {
        const ext = path.extname(file.originalname);
        const imageId = uuidv4();

        // group.id 하위로 폴더를 나눠 저장
        const s3Key = `users/${userId}/cosmetics/${group.id}/${imageId}${ext}`;

        // S3 업로드
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        // DB 저장 (group_id 연결)
        await createCosmeticInGroup({
          userId,
          groupId: group.id,
          s3Key,
          originalName: file.originalname,
          mimeType: file.mimetype,
        });
      }
    } catch (innerError) {
      /**
       * 🔥 중요한 안정성 포인트
       * - 그룹은 생성됐는데 사진 저장 중 실패하면 데이터가 남을 수 있음
       * - 완전한 트랜잭션 처리(업로드+DB)는 어렵지만,
       *   최소한 "사진 0장 그룹"을 정리하고 싶다면 repository에 delete 함수를 구현해서 여기서 호출
       */
      console.error('[uploadCosmeticBulk][upload loop]', innerError);

      // (선택) 그룹 정리 로직을 원하면 아래 주석을 풀고 repository 함수 구현
      // try {
      //   await deleteCosmeticGroupById({ userId, groupId: group.id });
      // } catch (cleanupError) {
      //   console.error('[uploadCosmeticBulk][cleanup failed]', cleanupError);
      // }

      return res.status(500).json({ message: '화장품 등록 실패' });
    }

    // 성공 응답
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
 * 화장품 상세 조회
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

    return res.status(200).json(cosmetic);
  } catch (error) {
    console.error('[getCosmeticDetailHandler]', error);
    return res.status(500).json({ message: '화장품 상세 조회 실패' });
  }
};
