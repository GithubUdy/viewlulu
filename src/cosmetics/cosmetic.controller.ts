import { Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/s3';
import { AuthRequest } from '../auth/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  createCosmetic,
  getMyCosmetics,
} from './cosmetic.repository';

/**
 * POST /cosmetics
 * 화장품 사진 업로드
 */
export const uploadCosmetic = async (
  req: AuthRequest,
  res: Response
) => {
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
    console.error(error);
    return res.status(500).json({ message: '화장품 업로드 실패' });
  }
};

/**
 * GET /cosmetics/me
 * 내 화장품 목록 조회
 */
export const getMyCosmeticsHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const cosmetics = await getMyCosmetics(userId);

    return res.status(200).json(cosmetics);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '조회 실패' });
  }
};
