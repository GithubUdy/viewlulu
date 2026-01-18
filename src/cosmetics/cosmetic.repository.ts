// cosmetic.repository.ts (최종본)
import { query } from '../db';
import { pool } from '../config/db';

/* ==================================================
 * 기존: 단일 화장품(사진 1장 = 1 row)
 * ❗ 절대 수정/삭제 금지
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

export const getMyPouchCosmetics = async (userId: number) => {
  const result = await query(
    `
    SELECT
      cg.id           AS "cosmeticId",
      cg.name         AS "cosmeticName",
      cg.user_email   AS "userEmail",
      cg.created_at   AS "createdAt",
      ARRAY_AGG(c.s3_key ORDER BY c.created_at ASC) AS photos
    FROM cosmetic_groups cg
    JOIN cosmetics c
      ON c.group_id = cg.id
    WHERE cg.user_id = $1
    GROUP BY cg.id
    ORDER BY cg.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/* ==================================================
 * 🔥 신규: 화장품 그룹 (사진 여러 장 = 화장품 1개)
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
    RETURNING id, user_id, user_email, name, created_at
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
 * 🔥 MyPouch 전용: 화장품 그룹 목록 조회
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
    LEFT JOIN cosmetics c
      ON c.group_id = cg.id
    WHERE cg.user_id = $1
    GROUP BY cg.id
    ORDER BY cg.created_at DESC;

    `,
    [userId]
  );

  return result.rows;
};

export const getCosmeticGroupDetail = async (groupId: number) => {
  const result = await query(
    `
    SELECT
      cg.id,
      cg.name,
      cg.created_at,
      c.s3_key,
    FROM cosmetic_groups cg
    JOIN cosmetics c
      ON c.group_id = cg.id
    WHERE cg.id = $1
    ORDER BY c.created_at ASC
    `,
    [groupId]
  );

  return result.rows;
};

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
    JOIN cosmetics c
      ON c.group_id = cg.id
    WHERE cg.id = $1
      AND cg.user_id = $2
    GROUP BY cg.id
    `,
    [groupId, userId]
  );

  return result.rows[0];
};

/* ==================================================
 * ✅ 삭제 기능 추가 (기존 기능 영향 없음)
 * ================================================== */

/** 그룹(=bulk) 삭제용: 해당 그룹의 s3_key 전부 가져오기 + 소유권 검사 포함 */
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
    ORDER BY c.created_at ASC
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
    `
    DELETE FROM cosmetics
    WHERE group_id = $1 AND user_id = $2
    `,
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
  return result.rows[0] as { id: number } | undefined;
};

/** (호환) 단일 cosmetics.id 삭제용 */
export const getSingleCosmeticS3KeyForDelete = async ({
  cosmeticId,
  userId,
}: {
  cosmeticId: number;
  userId: number;
}) => {
  const result = await query(
    `
    SELECT s3_key AS "s3Key"
    FROM cosmetics
    WHERE id = $1 AND user_id = $2
    `,
    [cosmeticId, userId]
  );
  return result.rows[0] as { s3Key: string } | undefined;
};

export const deleteSingleCosmeticById = async ({
  cosmeticId,
  userId,
}: {
  cosmeticId: number;
  userId: number;
}) => {
  const result = await query(
    `
    DELETE FROM cosmetics
    WHERE id = $1 AND user_id = $2
    RETURNING id
    `,
    [cosmeticId, userId]
  );
  return result.rows[0] as { id: number } | undefined;
};

export type DetectCandidate = {
  groupId: number;
  s3Key: string;
};

/**
 * detect 후보 조회 (각 그룹 대표 1장)
 * --------------------------------------------------
 * 반환 필드:
 * - group_id
 * - s3_key
 */

export const getDetectCandidates = async (userId: number) => {
  const { rows } = await pool.query(
    `
    SELECT
      cg.id AS "groupId",
      MIN(c.s3_key) AS "s3Key"
    FROM cosmetic_groups cg
    JOIN cosmetics c ON c.group_id = cg.id
    WHERE cg.user_id = $1
    GROUP BY cg.id
    ORDER BY cg.created_at DESC
    `,
    [userId]
  );

  return rows;
};

