import { Response } from 'express';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/s3';
import { AuthRequest } from '../auth/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';

import {
  createCosmetic,
  createCosmeticGroup,
  createCosmeticInGroup,
  getMyCosmeticGroups,
  getCosmeticDetail,

  getGroupS3KeysForDelete,
  deleteCosmeticsByGroupId,
  deleteCosmeticGroupById,
  getSingleCosmeticS3KeyForDelete,
  deleteSingleCosmeticById,

  getDetectCandidates,
} from './cosmetic.repository';

/* =========================================================
 * Public URL helper (기존 유지)
 * ========================================================= */

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

/* =========================================================
 * S3 GetObject -> Buffer
 * ========================================================= */

const streamToBuffer = async (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const getS3ObjectBuffer = async (key: string): Promise<Buffer> => {
  const obj = await s3.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );

  if (!obj.Body) throw new Error('S3_BODY_EMPTY');
  return streamToBuffer(obj.Body);
};

/* =========================================================
 * aHash + Hamming Distance
 * ========================================================= */

const computeAHash = async (input: Buffer): Promise<string> => {
  const { data } = await sharp(input)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const avg = sum / data.length;

  let bits = '';
  for (let i = 0; i < data.length; i++) {
    bits += data[i] >= avg ? '1' : '0';
  }
  return bits;
};

const hammingDistance = (a: string, b: string): number => {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  dist += Math.abs(a.length - b.length);
  return dist;
};

/* =========================================================
 * POST /cosmetics/detect (최종 안정판)
 * ========================================================= */

export const detectCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    // 1) 업로드 이미지 해시
    const inputHash = await computeAHash(req.file.buffer);

    // 2) 내 파우치 후보
    const candidates = await getDetectCandidates(userId);
    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ message: '등록된 화장품이 없습니다.' });
    }

    let bestGroupId: number | null = null;
    let bestDistance = Number.MAX_SAFE_INTEGER;

    const MAX_COMPARE = 30;
    const slice = candidates.slice(0, MAX_COMPARE);

    for (const c of slice) {
      if (!c.thumbnailKey) continue;

      try {
        const buf = await getS3ObjectBuffer(c.thumbnailKey);
        const candHash = await computeAHash(buf);
        const dist = hammingDistance(inputHash, candHash);

        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroupId = c.groupId;
        }
      } catch (e) {
        console.error('[detect][candidate error]', c.groupId, e);
      }
    }

    if (!bestGroupId) {
      return res.status(500).json({ message: '인식 처리 실패' });
    }

    const THRESHOLD = 18;
    if (bestDistance > THRESHOLD) {
      return res.status(404).json({
        message: '일치하는 화장품을 찾지 못했습니다.',
        bestDistance,
      });
    }

    return res.status(200).json({
      detectedId: String(bestGroupId),
      bestDistance,
    });
  } catch (error) {
    console.error('[detectCosmeticHandler]', error);
    return res.status(500).json({ message: '인식 실패' });
  }
};
