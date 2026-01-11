/**
 * cosmetic.repository.ts (최종 안정본)
 * --------------------------------------------------
 * ✅ 기존 단일 업로드 구조 유지
 * ✅ 화장품 그룹(bulk) 구조 추가
 * ✅ MyPouch 그룹 기준 조회 지원
 */

import { query } from '../db';

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

export const getMyCosmetics = async (userId: number) => {
  const result = await query(
    `
    SELECT id, s3_key, created_at
    FROM cosmetics
    WHERE user_id = $1
      AND group_id IS NULL
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/* ==================================================
 * 🔥 신규: 화장품 그룹 (사진 여러 장 = 화장품 1개)
 * ================================================== */

/**
 * 화장품 그룹 생성
 */
export const createCosmeticGroup = async ({
  userId,
  name,
}: {
  userId: number;
  name: string;
}) => {
  const result = await query(
    `
    INSERT INTO cosmetic_groups (user_id, name)
    VALUES ($1, $2)
    RETURNING id, user_id, name, created_at
    `,
    [userId, name]
  );

  return result.rows[0];
};

/**
 * 그룹에 속한 화장품 사진 생성
 */
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

/**
 * MyPouch용 화장품 그룹 리스트
 * - 화장품 1개 = 그룹 1개
 * - 대표 이미지(thumbnail) 1장 포함
 */
export const getMyCosmeticGroups = async (userId: number) => {
  const result = await query(
    `
    SELECT
      cg.id,
      cg.name,
      cg.created_at,
      MIN(c.s3_key) AS thumbnail
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
 * (선택) 그룹 상세 조회용
 * - 다음 단계에서 바로 사용 가능
 * ================================================== */

/**
 * 화장품 그룹 상세 (사진 배열)
 */
export const getCosmeticGroupDetail = async (groupId: number) => {
  const result = await query(
    `
    SELECT
      cg.id,
      cg.name,
      cg.created_at,
      c.s3_key
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
