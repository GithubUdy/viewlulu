// src/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { findUserByEmail, createUser } from '../users/user.repository';
import { signJwt } from '../config/jwt';

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser(email, hashedPassword, name);
    return user;
  }

  static async login(email: string, password: string) {
    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
