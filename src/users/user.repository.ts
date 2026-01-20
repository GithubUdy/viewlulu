import { pool } from '../config/db';

/**
 * 이메일로 사용자 조회
 */
export const findUserByEmail = async (email: string) => {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      email,
      password_hash,
      name,
      age,
      gender,
      refresh_token
    FROM users
    WHERE email = $1
    `,
    [email],
  );

  return rows[0] ?? null;
};

/**
 * 회원 생성
 */
export const createUser = async (
  email: string,
  passwordHash: string,
  name: string,
  age: number,
  gender: string,
) => {
  const { rows } = await pool.query(
    `
    INSERT INTO users (email, password_hash, name, age, gender)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, name, age, gender
    `,
    [email, passwordHash, name, age, gender],
  );

  return rows[0];
};

/**
 * Refresh Token 저장 (로그인 시)
 */
export const saveRefreshToken = async (
  userId: number,
  refreshToken: string,
) => {
  await pool.query(
    `
    UPDATE users
    SET refresh_token = $1
    WHERE id = $2
    `,
    [refreshToken, userId],
  );
};

/**
 * Refresh Token으로 사용자 조회 (재발급용)
 */
export const findUserByRefreshToken = async (refreshToken: string) => {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      email,
      name,
      age,
      gender
    FROM users
    WHERE refresh_token = $1
    `,
    [refreshToken],
  );

  return rows[0] ?? null;
};

/**
 * Refresh Token 삭제 (로그아웃)
 */
export const deleteRefreshToken = async (userId: number) => {
  await pool.query(
    `
    UPDATE users
    SET refresh_token = NULL
    WHERE id = $1
    `,
    [userId],
  );
};
