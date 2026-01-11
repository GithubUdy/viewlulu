import { pool } from '../config/db';

export const findUserByEmail = async (email: string) => {
  const [rows]: any = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
  );

  return rows[0] ?? null;
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const [result]: any = await pool.query(
    'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
    [email, password, name],
  );

  return {
    id: result.insertId,
    email,
    name,
  };
};
