import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';

import {
  uploadCosmetic,
  getMyCosmeticsHandler,
  getCosmeticDetailHandler,
  uploadCosmeticBulk,
  deleteCosmeticHandler,
  detectCosmeticHandler,
} from './cosmetic.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/cosmetics', authenticate, upload.single('photo'), uploadCosmetic);
router.get('/cosmetics/me', authenticate, getMyCosmeticsHandler);
router.post('/cosmetics/bulk', authenticate, upload.array('photo', 10), uploadCosmeticBulk);
router.get('/cosmetics/:id', authenticate, getCosmeticDetailHandler);
router.delete('/cosmetics/:id', authenticate, deleteCosmeticHandler);

router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  detectCosmeticHandler
);

export default router;
