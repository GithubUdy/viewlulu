import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware';
import {
  detectCosmeticHandler,
  createCosmeticBulkHandler,
} from './cosmetic.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * 🔍 화장품 인식 (사진 1장)
 */
router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  detectCosmeticHandler
);

/**
 * 📦 화장품 저장 (사진 4장 + name)
 * ⚠️ 중요: array ❌, fields ✅
 */
router.post(
  '/cosmetics/bulk',
  authenticate,
  upload.fields([
    { name: 'photos', maxCount: 4 },
    { name: 'name', maxCount: 1 },
  ]),
  createCosmeticBulkHandler
);

export default router;
