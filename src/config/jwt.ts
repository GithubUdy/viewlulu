import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

// ⛔ access token (짧게)
const ACCESS_EXPIRES_IN = '1m';

// ✅ refresh token (길게 – 앱 삭제 전까지 유지 목적)
const REFRESH_EXPIRES_IN = '90d';

/**
 * Access Token 발급
 */
export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
};

/**
 * Refresh Token 발급
 */
export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
};

/**
 * Access Token 검증
 * (미들웨어용)
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

/**
 * Refresh Token 검증
 * (재발급용)
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
