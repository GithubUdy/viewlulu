"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const db_1 = require("../config/db");
const query = (text, params) => {
    return db_1.pool.query(text, params);
};
exports.query = query;
//# sourceMappingURL=index.js.map