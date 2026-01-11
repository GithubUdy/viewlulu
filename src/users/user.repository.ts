import { pool } from '../config/db';

export const findUserByEmail = async (email: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
};

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
