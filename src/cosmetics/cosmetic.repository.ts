// cosmetic.repository.ts (🔥 FINAL STABLE)
import { query } from '../db';

/* ==================================================
 * 기존: 단일 화장품 (절대 수정 금지)
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
 * 🔥 화장품 그룹 생성
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
 * 🔥 MyPouch 목록
 * ================================================== */

export const getMyCosmeticGroups = async (userId: number) => {
  const result = await query(
    `
    SELECT
      cg.id          AS "groupId",
      cg.name        AS "cosmeticName",
      cg.user_email  AS "userEmail",
      cg.created_at  AS "createdAt",

      -- ✅ 대표 이미지: 가장 먼저 업로드된 1장
      (
        SELECT c2.s3_key
        FROM cosmetics c2
        WHERE c2.group_id = cg.id
        ORDER BY c2.created_at ASC
        LIMIT 1
      ) AS "thumbnailUrl"

    FROM cosmetic_groups cg
    WHERE cg.user_id = $1
    ORDER BY cg.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/* ==================================================
 * 🔥 화장품 상세
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
 * 🔥 Detect 전용 후보 조회 (가장 중요)
 * ================================================== */

export type DetectCandidate = {
  groupId: number;
  thumbnailKey: string;
};

export const getDetectCandidates = async (
  userId: number,
  limit: number = 30   // ✅ 안전 제한
): Promise<DetectCandidate[]> => {
  const result = await query(
    `
    SELECT
      cg.id AS "groupId",
      (
        SELECT c2.s3_key
        FROM cosmetics c2
        WHERE c2.group_id = cg.id
        ORDER BY c2.created_at ASC
        LIMIT 1
      ) AS "thumbnailKey"
    FROM cosmetic_groups cg
    WHERE cg.user_id = $1
    ORDER BY cg.created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
};

/* ==================================================
 * 🔥 삭제 관련 (기존 유지)
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
  return result.rows[0];
};
