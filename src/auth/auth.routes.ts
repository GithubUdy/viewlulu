import { Router } from 'express'
import {
  login,
  register,
  refresh,
  logout,
} from './auth.controller'

const router = Router()

router.post('/register', register)
router.post('/login', login)

// 🔥 반드시 추가
router.post('/refresh', refresh)
router.post('/logout', logout)

export default router
