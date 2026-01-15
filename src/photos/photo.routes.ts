import { Router } from 'express'
import { uploadPhoto } from './photo.controller'
import authenticate from '../auth/auth.middleware'
import { upload } from '../config/multer'

const router = Router()

router.post(
  '/photos',
  authenticate,
  upload.single('photo'),
  uploadPhoto
)

export default router
