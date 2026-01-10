"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.findUserByEmail = void 0;
const db_1 = require("../db");
const findUserByEmail = async (email) => {
    const result = await (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
};
exports.findUserByEmail = findUserByEmail;
const createUser = async ({ email, password_hash, name, }) => {
    const result = await (0, db_1.query)(`
    INSERT INTO users (email, password_hash, name)
    VALUES ($1, $2, $3)
    RETURNING id, email, name
    `, [email, password_hash, name]);
    return result.rows[0];
};
exports.createUser = createUser;
//# sourceMappingURL=user.repository.js.map