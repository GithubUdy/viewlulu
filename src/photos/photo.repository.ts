import { query } from '../db';

export const createPhoto = async ({
  userId,
  s3Key,
  thumbnailKey,
  originalName,
  mimeType,
}: {
  userId: number;
  s3Key: string;
  thumbnailKey: string;
  originalName: string;
  mimeType: string;
}) => {
  const result = await query(
    `
    INSERT INTO photos
      (user_id, s3_key, thumbnail_key, original_name, mime_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, s3_key, thumbnail_key, created_at
    `,
    [userId, s3Key, thumbnailKey, originalName, mimeType]
  );

  return result.rows[0];
};
