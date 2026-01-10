"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const auth_middleware_2 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
router.get('/test-auth', auth_middleware_1.authenticate, (req, res) => {
    res.json({
        message: '인증 성공',
        user: req.user,
    });
});
exports.default = router;
//# sourceMappingURL=test.routes.js.map