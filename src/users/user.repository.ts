import { pool } from '../config/db';

export const findUserByEmail = async (email: string) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] ?? null;
};

export const createUser = async (
  email: string,
  passwordHash: string,
  name: string,
) => {
  const result = await pool.query(
    `
    INSERT INTO users (email, password_hash, name)
    VALUES ($1, $2, $3)
    RETURNING id, email, name
    `,
    [email, passwordHash, name]
  );

  return result.rows[0];
};
