/**
 * cosmetic.routes.ts
 * --------------------------------------------------
 * 화장품 관련 API 라우터
 * - 단일 업로드
 * - bulk 업로드 (4장 저장)
 * - detect (사진 1장으로 기존 4장과 비교)
 *
 * ❗ 업로드 로직은 이미 검증 완료 → 절대 변경하지 않음
 */

import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware';
import {
  uploadCosmetic,
  uploadCosmeticBulk,
  detectCosmeticHandler,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  deleteCosmeticHandler,
} from './cosmetic.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/* ================= 업로드 (기존 유지) ================= */

// 단일 업로드
router.post(
  '/cosmetics',
  authenticate,
  upload.single('photo'),
  uploadCosmetic
);

// bulk 업로드 (4장)
router.post(
  '/cosmetics/bulk',
  authenticate,
  upload.array('photos', 4),
  uploadCosmeticBulk
);

/* ================= detect (신규 / 수정) ================= */

// ✅ 사진 1장으로 기존 화장품 인식
router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'), // ⚠️ field name 반드시 'photo'
  detectCosmeticHandler
);

/* ================= 조회 / 삭제 (기존 유지) ================= */

router.get('/cosmetics/me', authenticate, getMyCosmeticsHandler);
router.get('/cosmetics/:id', authenticate, getCosmeticDetailHandler);
router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

export default router;
