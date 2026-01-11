import { Router } from 'express';
import multer from 'multer';
import authenticate from '../auth/auth.middleware'; // ⭐ default import
import * as cosmeticController from './cosmetic.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ================= 기존 ================= */

router.post(
  '/cosmetics',
  authenticate,
  upload.single('photo'),
  cosmeticController.uploadCosmetic
);

router.get(
  '/cosmetics/me',
  authenticate,
  cosmeticController.getMyCosmeticsHandler
);

router.post(
  '/cosmetics/bulk',
  authenticate,
  upload.array('photo', 10),
  cosmeticController.uploadCosmeticBulk
);

router.get(
  '/cosmetics/:id',
  authenticate,
  cosmeticController.getCosmeticDetailHandler
);

router.delete(
  '/cosmetics/:id',
  authenticate,
  cosmeticController.deleteCosmeticHandler
);

/* ================= detect ================= */

router.post(
  '/cosmetics/detect',
  authenticate,
  upload.single('photo'),
  cosmeticController.detectCosmeticHandler
);

export default router;
