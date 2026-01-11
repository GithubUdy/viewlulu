// cosmetic.routes.ts (최종본)
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';

import {
  uploadCosmetic,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  uploadCosmeticBulk,
  deleteCosmeticHandler, // ✅ 추가
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

// ✅ 삭제 라우트 추가
router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

export default router;
