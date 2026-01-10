import { Router } from 'express'
import authRoutes from '../auth/auth.routes'
import photoRoutes from '../photos/photo.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use(photoRoutes)

export default router
