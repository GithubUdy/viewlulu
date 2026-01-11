import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';
import { uploadCosmeticBulk } from './cosmetic.controller';
import {
  uploadCosmetic,
  getMyCosmeticsHandler,
} from './cosmetic.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

export default router;
