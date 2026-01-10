"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const express_1 = require("express");
const jwt_1 = require("../config/jwt");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const payload = (0, jwt_1.verifyJwt)(token);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map