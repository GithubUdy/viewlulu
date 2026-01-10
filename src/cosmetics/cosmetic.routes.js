"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../auth/auth.middleware");
const cosmetic_controller_1 = require("./cosmetic.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/cosmetics', auth_middleware_1.authenticate, upload.single('photo'), cosmetic_controller_1.uploadCosmetic);
router.get('/cosmetics/me', auth_middleware_1.authenticate, cosmetic_controller_1.getMyCosmeticsHandler);
exports.default = router;
//# sourceMappingURL=cosmetic.routes.js.map