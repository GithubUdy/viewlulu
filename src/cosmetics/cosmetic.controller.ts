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

  // ✅ detect 후보
  getDetectCandidates,
} from './cosmetic.repository';

/* ================= 기존 URL 매핑 유틸(유지) ================= */

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

/* ================= (중요) S3 GetObject -> Buffer ================= */

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

/* ================= aHash(8x8) 구현 =================
 * - 빠르고, 라이브러리 의존 없이 정상 동작
 * - 화장품 “대략적 유사도” 비교에는 충분
 */

const computeAHash = async (input: Buffer): Promise<string> => {
  // 8x8 grayscale raw pixels
  const { data } = await sharp(input)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // data: length 64 (0~255)
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const avg = sum / data.length;

  let bits = '';
  for (let i = 0; i < data.length; i++) {
    bits += data[i] >= avg ? '1' : '0';
  }
  return bits; // 64-bit string
};

const hammingDistance = (a: string, b: string): number => {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  // 길이 차이는 패널티
  dist += Math.abs(a.length - b.length);
  return dist;
};

/* ================= 기존 API들 (유지) ================= */

export const uploadCosmetic = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });

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

    return res.status(201).json({ message: '화장품 등록 완료', cosmetic });
  } catch (error) {
    console.error('[uploadCosmetic]', error);
    return res.status(500).json({ message: '화장품 업로드 실패' });
  }
};

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

export const uploadCosmeticBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, email } = req.user!;

    const nameRaw = req.body?.name;
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    if (!name) return res.status(400).json({ message: 'name is required' });

    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];
    if (files.length === 0) return res.status(400).json({ message: 'photos are required' });

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

export const getCosmeticDetailHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const cosmeticId = Number(req.params.id);

    if (isNaN(cosmeticId)) return res.status(400).json({ message: 'invalid cosmetic id' });

    const cosmetic = await getCosmeticDetail({ groupId: cosmeticId, userId });
    if (!cosmetic) return res.status(404).json({ message: '화장품을 찾을 수 없습니다.' });

    const photos = Array.isArray(cosmetic.photos)
      ? cosmetic.photos.map((p: any) => ({ ...p, url: toPublicUrl(p.s3Key) }))
      : [];

    return res.status(200).json({ ...cosmetic, photos });
  } catch (error) {
    console.error('[getCosmeticDetailHandler]', error);
    return res.status(500).json({ message: '화장품 상세 조회 실패' });
  }
};

export const deleteCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = Number(req.params.id);

    if (isNaN(id)) return res.status(400).json({ message: 'invalid cosmetic id' });

    const groupKeys = await getGroupS3KeysForDelete({ groupId: id, userId });

    if (groupKeys.length > 0) {
      for (const { s3Key } of groupKeys) {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
      }

      await deleteCosmeticsByGroupId({ groupId: id, userId });
      const deletedGroup = await deleteCosmeticGroupById({ groupId: id, userId });
      if (!deletedGroup) return res.status(500).json({ message: '그룹 삭제 실패' });

      return res.status(200).json({ message: '삭제 완료', type: 'group', id });
    }

    const single = await getSingleCosmeticS3KeyForDelete({ cosmeticId: id, userId });
    if (!single) return res.status(404).json({ message: '삭제할 화장품을 찾을 수 없습니다.' });

    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: single.s3Key }));
    const deleted = await deleteSingleCosmeticById({ cosmeticId: id, userId });
    if (!deleted) return res.status(500).json({ message: '삭제 실패' });

    return res.status(200).json({ message: '삭제 완료', type: 'single', id });
  } catch (error) {
    console.error('[deleteCosmeticHandler]', error);
    return res.status(500).json({ message: '삭제 중 오류가 발생했습니다.' });
  }
};

/* =========================================================
 * ✅ POST /cosmetics/detect
 * - 업로드된 사진 vs 내 파우치(각 그룹 대표 1장) 비교
 * - aHash + Hamming distance로 최적 매칭 groupId 반환
 * ========================================================= */

export const detectCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    // 1) 업로드 이미지 해시
    const inputHash = await computeAHash(req.file.buffer);

    // 2) 내 후보(그룹 대표 이미지 key 목록)
    const candidates = await getDetectCandidates(userId);
    if (candidates.length === 0) {
      return res.status(404).json({ message: '등록된 화장품이 없습니다.' });
    }

    // 3) 후보들과 비교 (대표 1장씩)
    let bestGroupId: number | null = null;
    let bestDistance = Number.MAX_SAFE_INTEGER;

    // 너무 느릴까봐 상한 설정(원하면 조절)
    const MAX_COMPARE = 30;
    const slice = candidates.slice(0, MAX_COMPARE);

    for (const c of slice) {
      try {
        const buf = await getS3ObjectBuffer(c.thumbnailKey);
        const candHash = await computeAHash(buf);
        const dist = hammingDistance(inputHash, candHash);

        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroupId = c.groupId;
        }
      } catch (e) {
        console.error('[detectCosmeticHandler][candidate error]', c.groupId, c.thumbnailKey, e);
        // 후보 1개 실패는 전체 실패로 처리하지 않음
      }
    }

    if (!bestGroupId) {
      return res.status(500).json({ message: '인식 처리 실패' });
    }

    // 4) 거리 기준으로 “너무 다르면” 미검출 처리 (임계값)
    // aHash 64비트에서 0~64. 보통 10~20 사이가 "꽤 유사"
    const THRESHOLD = 18;
    if (bestDistance > THRESHOLD) {
      return res.status(404).json({
        message: '일치하는 화장품을 찾지 못했습니다.',
        bestDistance,
      });
    }

    // ✅ 프론트 요구: detectedId
    return res.status(200).json({
      detectedId: String(bestGroupId),
      bestDistance,
    });
  } catch (error) {
    console.error('[detectCosmeticHandler]', error);
    return res.status(500).json({ message: '인식 실패' });
  }
};
