/**
 * cosmetic.routes.ts (FINAL STABLE)
 * --------------------------------------------------
 * 화장품 관련 API 라우터
 * - 단일 업로드
 * - bulk 업로드 (4장 저장)
 * - detect (사진 1장으로 기존 화장품 비교)
 *
 * ❗ 기존 업로드 로직 절대 변경하지 않음
 * ❗ detect는 프론트 FormData.append('file', ...) 기준
 * ❗ multer Unexpected field 오류 방지
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
  updateCosmeticHandler,
} from './cosmetic.controller';

const router = Router();

/* =====================================================
 * multer 설정 (기존 유지)
 * ===================================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/* ================= 업로드 (기존 유지, 절대 변경 ❌) ================= */

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

/* ================= detect (🔥 핵심) ================= */

/**
 * detect
 * - 프론트: FormData.append('file', ...)
 * - multer: single('file')
 * - 다른 라우트에 영향 없음
 */
router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('file'), // ⭐️ field name 정확히 일치
  detectCosmeticHandler
);

/* ================= 조회 / 삭제 (기존 유지) ================= */

router.get('/cosmetics/me', authenticate, getMyCosmeticsHandler);
router.get('/cosmetics/:id', authenticate, getCosmeticDetailHandler);
router.patch(
  '/cosmetics/:id',
  authenticate,
  updateCosmeticHandler
);

router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

export default router;
