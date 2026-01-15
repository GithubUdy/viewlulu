import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../config/jwt';
import { JwtPayload } from '../types/auth';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: '토큰이 없습니다.' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = verifyJwt(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

export default authenticate;
