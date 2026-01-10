import { pool } from "../config/db";

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
