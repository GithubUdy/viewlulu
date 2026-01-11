// cosmetic.controller.ts (🔥 FINAL STABLE)
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
 * Public URL helper
 * ========================================================= */

const S3_PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ||
  `https://${S3_BUCKET}.s3.ap-northeast-2.amazonaws.com`;

const toPublicUrl = (keyOrUrl?: string | null) => {
  if (!keyOrUrl) return null;
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
  return `${S3_PUBLIC_BASE_URL}/${encodeURI(keyOrUrl)}`;
};

/* =========================================================
 * S3 Buffer helper
 * ========================================================= */

const streamToBuffer = async (stream: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

const getS3ObjectBuffer = async (key: string): Promise<Buffer> => {
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  if (!obj.Body) throw new Error('S3_BODY_EMPTY');
  return streamToBuffer(obj.Body);
};

/* =========================================================
 * aHash
 * ========================================================= */

const computeAHash = async (buf: Buffer): Promise<string> => {
  const { data } = await sharp(buf)
    .resize(8, 8)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  return Array.from(data)
    .map(v => (v >= avg ? '1' : '0'))
    .join('');
};

const hammingDistance = (a: string, b: string) => {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) d++;
  }
  return d + Math.abs(a.length - b.length);
};

/* =========================================================
 * 기존 API들 (유지)
 * ========================================================= */
// uploadCosmetic, uploadCosmeticBulk, getMyCosmeticsHandler,
// getCosmeticDetailHandler, deleteCosmeticHandler
// 👉 네가 준 코드 그대로 유지 (변경 없음)

/* =========================================================
 * 🔥 POST /cosmetics/detect (최종)
 * ========================================================= */

export const detectCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    // 1) 입력 이미지 해시
    const inputHash = await computeAHash(req.file.buffer);

    // 2) 후보 그룹
    const candidates = await getDetectCandidates(userId);
    if (!candidates.length) {
      return res.status(404).json({ message: '등록된 화장품이 없습니다.' });
    }

    let bestGroupId: number | null = null;
    let bestDistance = Number.MAX_SAFE_INTEGER;

    for (const c of candidates.slice(0, 30)) {
      if (!c.thumbnailKey) continue;

      try {
        const buf = await getS3ObjectBuffer(c.thumbnailKey);
        const hash = await computeAHash(buf);
        const dist = hammingDistance(inputHash, hash);

        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroupId = c.groupId;
        }
      } catch (e) {
        console.error('[detect][candidate skip]', c.groupId, e);
      }
    }

    if (!bestGroupId || bestDistance > 18) {
      return res.status(404).json({
        message: '일치하는 화장품을 찾지 못했습니다.',
        bestDistance,
      });
    }

    // ✅ 핵심 수정: 화장품 상세까지 반환
    const cosmetic = await getCosmeticDetail({
      groupId: bestGroupId,
      userId,
    });

    if (!cosmetic) {
      return res.status(404).json({ message: '화장품 정보를 찾을 수 없습니다.' });
    }

    return res.status(200).json({
      detectedId: String(bestGroupId),
      bestDistance,
      cosmetic: {
        ...cosmetic,
        photos: cosmetic.photos.map((p: any) => ({
          ...p,
          url: toPublicUrl(p.s3Key),
        })),
      },
    });
  } catch (error) {
    console.error('[detectCosmeticHandler]', error);
    return res.status(500).json({ message: '인식 실패' });
  }
};
