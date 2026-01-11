import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../config/jwt';
import { JwtPayload } from '../types/auth';

/**
 * AuthRequest
 * - JWT 인증 후 req.user 주입
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * authenticate
 * --------------------------------------------------
 * ✅ named export (routes와 100% 호환)
 * ✅ Express middleware signature 보장
 * ✅ throw 방어 처리
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: '토큰이 없습니다.' });
    return;
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = verifyJwt(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
