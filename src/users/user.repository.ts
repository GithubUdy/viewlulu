// src/users/user.repository.ts
import { query } from '../db';

export const findUserByEmail = async (email: string) => {
  const result = await query(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  return result[0] ?? null;
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const result = await query(
    'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
    [email, password, name],
  );

  return {
    id: result.insertId,
    email,
    name,
  };
};
