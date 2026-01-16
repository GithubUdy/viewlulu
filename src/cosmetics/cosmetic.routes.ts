import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware';
import {
  detectCosmeticHandler,
  uploadCosmetic,
  uploadCosmeticBulk,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  deleteCosmeticHandler,
} from './cosmetic.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/* ================= 단일 업로드 ================= */
router.post(
  '/cosmetics',
  authenticate,
  upload.single('photo'),
  uploadCosmetic
);

/* ================= bulk 업로드 (🔥 이게 핵심) ================= */
router.post(
  '/cosmetics/bulk',
  authenticate,
  upload.array('photos', 4), // ✅ 프론트와 필드명 일치
  uploadCosmeticBulk
);

/* ================= detect ================= */
router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  detectCosmeticHandler
);

/* ================= 조회 / 삭제 ================= */
router.get('/cosmetics/me', authenticate, getMyCosmeticsHandler);
router.get('/cosmetics/:id', authenticate, getCosmeticDetailHandler);
router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

export default router;
