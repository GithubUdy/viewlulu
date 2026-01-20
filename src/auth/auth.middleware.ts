import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
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
    return res.status(401).json({ message: 'NO_TOKEN' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = verifyAccessToken(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    // ❗ access token 만료는 "에러"만 반환
    return res.status(401).json({ message: 'TOKEN_EXPIRED' });
  }
};

export default authenticate;
