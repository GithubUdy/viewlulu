"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPhoto = void 0;
const db_1 = require("../db");
const createPhoto = async ({ userId, s3Key, originalName, mimeType, }) => {
    const result = await (0, db_1.query)(`
    INSERT INTO photos (user_id, s3_key, original_name, mime_type)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, s3_key, created_at
    `, [userId, s3Key, originalName, mimeType]);
    return result.rows[0];
};
exports.createPhoto = createPhoto;
//# sourceMappingURL=photo.repository.js.map