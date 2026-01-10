"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCosmetics = exports.createCosmetic = void 0;
const db_1 = require("../db");
const createCosmetic = async ({ userId, s3Key, originalName, mimeType, }) => {
    const result = await (0, db_1.query)(`
    INSERT INTO cosmetics (user_id, s3_key, original_name, mime_type)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, s3_key, created_at
    `, [userId, s3Key, originalName, mimeType]);
    return result.rows[0];
};
exports.createCosmetic = createCosmetic;
const getMyCosmetics = async (userId) => {
    const result = await (0, db_1.query)(`
    SELECT id, s3_key, created_at
    FROM cosmetics
    WHERE user_id = $1
    ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
};
exports.getMyCosmetics = getMyCosmetics;
//# sourceMappingURL=cosmetic.repository.js.map