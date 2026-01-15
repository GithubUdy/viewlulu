import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware';
import { detectCosmeticHandler } from './cosmetic.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB,
});

router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  detectCosmeticHandler
);

export default router;
