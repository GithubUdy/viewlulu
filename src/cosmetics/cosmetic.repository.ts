// cosmetic.repository.ts (FINAL - DB 100% MATCH)
import { query } from '../db';

/* ==================================================
 * 기존: 단일 화장품 (❗절대 수정 금지)
 * ================================================== */

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

/* ==================================================
 * 🔥 신규: 화장품 그룹
 * ================================================== */

export const createCosmeticGroup = async ({
  userId,
  userEmail,
  name,
}: {
  userId: number;
  userEmail: string;
  name: string;
}) => {
  const result = await query(
    `
    INSERT INTO cosmetic_groups (user_id, user_email, name)
    VALUES ($1, $2, $3)
    RETURNING id, name, created_at
    `,
    [userId, userEmail, name]
  );

  return result.rows[0];
};

export const createCosmeticInGroup = async ({
  userId,
  groupId,
  s3Key,
  originalName,
  mimeType,
}: {
  userId: number;
  groupId: number;
  s3Key: string;
  originalName: string;
  mimeType: string;
}) => {
  const result = await query(
    `
    INSERT INTO cosmetics (user_id, group_id, s3_key, original_name, mime_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, s3_key
    `,
    [userId, groupId, s3Key, originalName, mimeType]
  );

  return result.rows[0];
};

/* ==================================================
 * ✅ MyPouch 전용 (대표 1장)
 * ================================================== */

export const getMyCosmeticGroups = async (userId: number) => {
  const result = await query(
    `
    SELECT
      cg.id AS "groupId",
      cg.name AS "cosmeticName",
      cg.created_at AS "createdAt",
      MIN(c.s3_key) AS "thumbnailUrl"
    FROM cosmetic_groups cg
    JOIN cosmetics c ON c.group_id = cg.id
    WHERE cg.user_id = $1
    GROUP BY cg.id
    ORDER BY cg.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/* ==================================================
 * ✅ 상세 조회 (여러 장)
 * ================================================== */

export const getCosmeticDetail = async ({
  groupId,
  userId,
}: {
  groupId: number;
  userId: number;
}) => {
  const result = await query(
    `
    SELECT
      cg.id AS "cosmeticId",
      cg.name AS "cosmeticName",
      cg.created_at AS "createdAt",
      ARRAY_AGG(
        json_build_object(
          's3Key', c.s3_key,
          'originalName', c.original_name,
          'mimeType', c.mime_type
        )
        ORDER BY c.created_at ASC
      ) AS photos
    FROM cosmetic_groups cg
    JOIN cosmetics c ON c.group_id = cg.id
    WHERE cg.id = $1
      AND cg.user_id = $2
    GROUP BY cg.id
    `,
    [groupId, userId]
  );

  return result.rows[0];
};

/* ==================================================
 * ✅ 삭제 로직 (기존 유지)
 * ================================================== */

export const getGroupS3KeysForDelete = async ({
  groupId,
  userId,
}: {
  groupId: number;
  userId: number;
}) => {
  const result = await query(
    `
    SELECT c.s3_key AS "s3Key"
    FROM cosmetic_groups cg
    JOIN cosmetics c ON c.group_id = cg.id
    WHERE cg.id = $1 AND cg.user_id = $2
    `,
    [groupId, userId]
  );
  return result.rows as { s3Key: string }[];
};

export const deleteCosmeticsByGroupId = async ({
  groupId,
  userId,
}: {
  groupId: number;
  userId: number;
}) => {
  await query(
    `DELETE FROM cosmetics WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
};

export const deleteCosmeticGroupById = async ({
  groupId,
  userId,
}: {
  groupId: number;
  userId: number;
}) => {
  const result = await query(
    `
    DELETE FROM cosmetic_groups
    WHERE id = $1 AND user_id = $2
    RETURNING id
    `,
    [groupId, userId]
  );
  return result.rows[0];
};

/* ==================================================
 * ✅ detect 후보 (대표 1장만)
 * ================================================== */

export type DetectCandidate = {
  groupId: number;
  thumbnailKey: string;
};

export const getDetectCandidates = async (userId: number) => {
  const result = await query(
    `
    SELECT
      cg.id AS "groupId",
      MIN(c.s3_key) AS "thumbnailKey"
    FROM cosmetic_groups cg
    JOIN cosmetics c ON c.group_id = cg.id
    WHERE cg.user_id = $1
    GROUP BY cg.id
    ORDER BY cg.created_at DESC
    `,
    [userId]
  );

  return result.rows as DetectCandidate[];
};
