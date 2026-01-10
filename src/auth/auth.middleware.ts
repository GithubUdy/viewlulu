import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../config/jwt'

export interface AuthRequest extends Request {
  user?: {
    userId: number
    email: string
  }
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const payload = verifyJwt(token)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' })
  }
}
