/**
 * cosmetic.controller.ts (FINAL STABLE)
 * --------------------------------------------------
 * ✅ 기존 기능 절대 유지 (upload / list / bulk / detail / delete / detect)
 * ✅ exports 누락 방지 (routes.ts에서 import하는 모든 핸들러 제공)
 * ✅ 런타임 방어 강화 (req.user, file, params, S3 body 등)
 * ✅ detect: aHash + Hamming (기존 로직 유지)
 */

import { Response } from 'express';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import axios from 'axios';
import FormData from 'form-data';
import { s3, S3_BUCKET } from '../config/s3';
import { AuthRequest } from '../auth/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';

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
 * S3 GetObject -> Buffer (기존 유지 + 안전 강화)
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
 * aHash + Hamming Distance (기존 유지)
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
 * 기존 API들 (절대 깨지면 안 됨)
 * ========================================================= */

/** POST /cosmetics (single upload) */
/** POST /cosmetics */
export const uploadCosmetic = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });

    const userId = req.user.userId;
    const file = req.file;

    const ext = path.extname(file.originalname || '') || '.jpg';
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

/** GET /cosmetics/me */
export const getMyCosmeticsHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userId = req.user.userId;
    const groups = await getMyCosmeticGroups(userId);

    const mapped = groups.map((g: any) => ({
      groupId: g.groupId ?? g.id,
      cosmeticName: g.cosmeticName ?? g.name,
      createdAt: g.createdAt ?? g.created_at,
      thumbnailUrl: toPublicUrl(g.thumbnailUrl),
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('[getMyCosmeticsHandler]', error);
    return res.status(500).json({ message: '조회 실패' });
  }
};


/** POST /cosmetics/bulk (group upload) */
export const uploadCosmeticBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { userId, email } = req.user;

    const nameRaw = req.body?.name;
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    if (!name) return res.status(400).json({ message: 'name is required' });

    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    if (files.length === 0) {
      return res.status(400).json({ message: 'photos are required' });
    }

    const group = await createCosmeticGroup({
      userId,
      userEmail: email ?? '',
      name,
    });

    try {
      for (const file of files) {
        const ext = path.extname(file.originalname || '') || '.jpg';
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
export const createCosmeticBulkHandler = uploadCosmeticBulk;

/** GET /cosmetics/:id (group detail) */
export const getCosmeticDetailHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userId = req.user.userId;
    const cosmeticId = Number(req.params.id);

    if (Number.isNaN(cosmeticId)) {
      return res.status(400).json({ message: 'invalid cosmetic id' });
    }

    const cosmetic = await getCosmeticDetail({ groupId: cosmeticId, userId });
    if (!cosmetic) {
      return res.status(404).json({ message: '화장품을 찾을 수 없습니다.' });
    }

    const photos = Array.isArray(cosmetic.photos)
      ? cosmetic.photos.map((p: any) => ({ ...p, url: toPublicUrl(p.s3Key) }))
      : [];

    return res.status(200).json({ ...cosmetic, photos });
  } catch (error) {
    console.error('[getCosmeticDetailHandler]', error);
    return res.status(500).json({ message: '화장품 상세 조회 실패' });
  }
};

/** DELETE /cosmetics/:id (group delete first, then single delete fallback) */
export const deleteCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userId = req.user.userId;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) return res.status(400).json({ message: 'invalid cosmetic id' });

    // 1) 그룹(=bulk) 삭제 우선
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

    // 2) (호환) 단일 cosmetics.id 삭제
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

const avgOfBestTwo = (distances: number[]) => {
  if (distances.length === 0) return Number.MAX_SAFE_INTEGER;
  if (distances.length === 1) return distances[0];

  const sorted = [...distances].sort((a, b) => a - b);
  return (sorted[0] + sorted[1]) / 2;
};


/* =========================================================
 * POST /cosmetics/detect (FINAL - GROUP SEARCH)
 * ========================================================= */

export const detectCosmeticHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    const userId = req.user.userId;

    /* --------------------------------------------------
     * 1️⃣ 내 파우치 그룹 + S3 keys 조회
     * -------------------------------------------------- */
    const candidates = await getDetectCandidates(userId);

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({
        message: '등록된 화장품이 없습니다.',
      });
    }

    /* --------------------------------------------------
     * 2️⃣ S3 이미지 → 임시 파일로 다운로드
     * -------------------------------------------------- */
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'));
    const groups: Record<string, string[]> = {};

    for (const c of candidates) {
      const groupTmpDir = path.join(tmpRoot, String(c.groupId));
      fs.mkdirSync(groupTmpDir, { recursive: true });

      groups[c.groupId] = [];

      for (const s3Key of c.s3Keys) {
        const buffer = await getS3ObjectBuffer(s3Key);

        const ext = path.extname(s3Key) || '.jpg';
        const tmpPath = path.join(
          groupTmpDir,
          `${uuidv4()}${ext}`
        );

        fs.writeFileSync(tmpPath, buffer);
        groups[c.groupId].push(tmpPath);
      }
    }

    /* --------------------------------------------------
     * 3️⃣ Python 서버로 multipart 전송
     * -------------------------------------------------- */
    const form = new FormData();

    // 🔥 촬영 이미지
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'capture.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
      knownLength: req.file.size,
    });

    // 🔥 groups JSON
    form.append('groups', JSON.stringify(groups));

    const pyRes = await axios.post(
      'http://viewlulu.site:8000/pouch/group-search',
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 60_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const data = pyRes.data;

    /* --------------------------------------------------
     * 4️⃣ 로그 (🔥 핵심)
     * -------------------------------------------------- */
    console.info('[DETECT][GROUP]', {
      userId,
      matched: data.matched,
      detectedGroupId: data.detectedGroupId ?? null,
      score: data.score ?? null,
    });

    /* --------------------------------------------------
     * 5️⃣ 응답
     * -------------------------------------------------- */
    if (!data.matched) {
      return res.status(404).json({
        message: data.message || '일치하는 화장품을 찾지 못했습니다.',
      });
    }

    return res.status(200).json({
      detectedId: data.detectedGroupId,
      score: data.score,
    });
  } catch (error: any) {
    console.error(
      '[detectCosmeticHandler][GROUP_SEARCH]',
      error?.response?.data || error
    );

    return res.status(500).json({
      message: '인식 처리 중 오류가 발생했습니다.',
    });
  }
};
