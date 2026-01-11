import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';

import {
  uploadCosmetic,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  uploadCosmeticBulk,
  deleteCosmeticHandler,
  detectCosmeticHandler, // ✅ 추가
} from './cosmetic.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/cosmetics', authenticate, upload.single('photo'), uploadCosmetic);

router.get('/cosmetics/me', authenticate, getMyCosmeticsHandler);

router.post(
  '/cosmetics/bulk',
  upload.array('photo', 10), // ✅ 기존 유지
  authenticate,              // ✅ 기존 유지
  uploadCosmeticBulk
);

router.get('/cosmetics/:id', authenticate, getCosmeticDetailHandler);

router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

// ✅ 화장품 인식(비교) API 추가
router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  detectCosmeticHandler
);


export default router;
