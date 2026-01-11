import { Router } from 'express'
import { authenticate } from '../auth/auth.middleware'
import { AuthRequest } from '../auth/auth.middleware'

const router = Router()

router.get('/test-auth', authenticate, (req: AuthRequest, res) => {
  res.json({
    message: '인증 성공',
    user: req.user,
  })
})

export default router
