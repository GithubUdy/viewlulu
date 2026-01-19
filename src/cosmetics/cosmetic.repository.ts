// cosmetic.repository.ts (FINAL STABLE)
import { query } from '../db';
import { pool } from '../config/db';

/* ==================================================
 * 기존: 단일 화장품 (사진 1장 = 1 row)
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

/* ==================================================
 * 🔥 화장품 그룹 생성 / 등록
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
 * MyPouch UI 전용 조회 (목록 / 상세)
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
    ORDER BY cg.created_at DESC
    `,
    [userId]
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
 * 🔥 Detect 전용: 사용자 파우치 그룹 + 이미지 키 조회
 * ==================================================
 * - detectCosmeticHandler 전용
 * - Python /pouch/group-search 입력 데이터
 * ================================================== */

export type DetectCandidate = {
  groupId: number;
  s3Keys: string[];
};

export const getDetectCandidates = async (
  userId: number
): Promise<DetectCandidate[]> => {
  const { rows } = await pool.query(
    `
    SELECT
      cg.id AS "groupId",
      ARRAY_AGG(c.s3_key ORDER BY c.created_at ASC) AS "s3Keys"
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

/* ==================================================
 * 삭제 로직 (기존 유지)
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
