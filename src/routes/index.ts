import { Router } from 'express'
import photoRoutes from '../photos/photo.routes'

const router = Router()

/**
 * ❗ authRoutes는 app.ts에서만 관리
 */
router.use(photoRoutes)

export default router
