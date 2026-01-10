"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photo_controller_1 = require("./photo.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
router.post('/photos', auth_middleware_1.authenticate, multer_1.upload.single('photo'), photo_controller_1.uploadPhoto);
exports.default = router;
//# sourceMappingURL=photo.routes.js.map