import bcrypt from 'bcrypt';
import {
  findUserByEmail,
  createUser,
  saveRefreshToken,
  deleteRefreshToken,
  findUserByRefreshToken,
} from '../users/user.repository';
import {
  signAccessToken,
  signRefreshToken,
} from '../config/jwt';

export class AuthService {
  /**
   * 회원가입
   */
  static async register(
    email: string,
    password: string,
    name: string,
    age: number,
    gender: string,
  ) {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return await createUser(
      email,
      passwordHash,
      name,
      age,
      gender,
    );
  }

  /**
   * 로그인
   * ✅ accessToken + refreshToken 발급
   * ✅ refreshToken DB 저장
   */
  static async login(email: string, password: string) {
    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // 🔥 refreshToken 서버 저장
    await saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
      },
    };
  }

  /**
   * 로그아웃
   * ✅ refreshToken 기준으로 사용자 찾아서 삭제
   */
  static async logout(refreshToken: string) {
    const user = await findUserByRefreshToken(refreshToken);

    if (!user) {
      // 이미 로그아웃 되었거나 토큰이 잘못된 경우
      return;
    }

    await deleteRefreshToken(user.id);
  }
}
