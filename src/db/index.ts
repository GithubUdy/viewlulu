import { pool } from "../config/db";
export { pool };
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
