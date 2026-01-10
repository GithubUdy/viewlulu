import { query } from '../db';

export const createCosmetic = async ({
  userId,
  s3Key,
  originalName,
  mimeType,
}: {
  userId: number;
  s3Key: string;
  originalName: string;
  mimeType: string;
}) => {
  const result = await query(
    `
    INSERT INTO cosmetics (user_id, s3_key, original_name, mime_type)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, s3_key, created_at
    `,
    [userId, s3Key, originalName, mimeType]
  );

  return result.rows[0];
};

export const getMyCosmetics = async (userId: number) => {
  const result = await query(
    `
    SELECT id, s3_key, created_at
    FROM cosmetics
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};
