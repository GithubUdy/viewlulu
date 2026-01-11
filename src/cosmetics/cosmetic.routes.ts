import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware';

import {
  uploadCosmetic,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  uploadCosmeticBulk,
  deleteCosmeticHandler,
  detectCosmeticHandler,
} from './cosmetic.controller';

const router = Router();

/**
 * ✅ multer: memoryStorage
 * - detect / upload 모두 buffer 필요
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (안전)
  },
});

/* =====================================================
 * 기존 기능 (절대 깨지면 안 됨)
 * ===================================================== */

router.post(
  '/cosmetics',
  authenticate,
  upload.single('photo'),
  uploadCosmetic
);

router.get(
  '/cosmetics/me',
  authenticate,
  getMyCosmeticsHandler
);

router.post(
  '/cosmetics/bulk',
  authenticate,
  upload.array('photo', 10),
  uploadCosmeticBulk
);

router.get(
  '/cosmetics/:id',
  authenticate,
  getCosmeticDetailHandler
);

router.delete(
  '/cosmetics/:id',
  authenticate,
  deleteCosmeticHandler
);

/* =====================================================
 * 🔥 화장품 인식 (Node → Python)
 * POST /cosmetics/detect
 * field name: photo
 * ===================================================== */

router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),   // ⭐ 핵심
  detectCosmeticHandler
);

export default router;
