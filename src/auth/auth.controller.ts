import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { verifyAccessToken, signAccessToken } from '../config/jwt';
import { findUserByRefreshToken } from '../users/user.repository';

/**
 * 회원가입
 * POST /auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, age, gender } = req.body;

    if (!email || !password || !name || !age || !gender) {
      return res.status(400).json({
        message: 'email, password, name, age, gender는 필수입니다.',
      });
    }

    const user = await AuthService.register(
      email,
      password,
      name,
      Number(age),
      gender,
    );

    return res.status(201).json(user);
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(400).json({
        message: '이미 존재하는 이메일입니다.',
      });
    }

    return res.status(500).json({ message: '서버 오류' });
  }
};

/**
 * 로그인
 * POST /auth/login
 * ✅ accessToken + refreshToken 발급
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'email과 password는 필수입니다.',
      });
    }

    const result = await AuthService.login(email, password);

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    return res.status(500).json({ message: '서버 오류' });
  }
};

/**
 * 🔄 토큰 재발급
 * POST /auth/refresh
 * ✅ DB에 저장된 refreshToken 검증 필수
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'NO_REFRESH_TOKEN' });
    }

    // 1️⃣ JWT 유효성 검증
    const decoded = verifyAccessToken(refreshToken) as any;

    // 2️⃣ DB에 실제 존재하는 refreshToken인지 확인
    const user = await findUserByRefreshToken(refreshToken);
    if (!user) {
      return res.status(401).json({ message: 'INVALID_REFRESH_TOKEN' });
    }

    // 3️⃣ accessToken 재발급
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch {
    return res.status(401).json({
      message: 'INVALID_REFRESH_TOKEN',
    });
  }
};

/**
 * 🚪 로그아웃
 * POST /auth/logout
 * ✅ refreshToken 기준 DB에서 삭제
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'NO_REFRESH_TOKEN' });
    }

    await AuthService.logout(refreshToken);

    return res.status(200).json({ message: 'LOGOUT_SUCCESS' });
  } catch {
    return res.status(500).json({ message: '서버 오류' });
  }
};
