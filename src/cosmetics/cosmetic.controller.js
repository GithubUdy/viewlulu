"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCosmeticsHandler = exports.uploadCosmetic = void 0;
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("../config/s3");
const auth_middleware_1 = require("../auth/auth.middleware");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const cosmetic_repository_1 = require("./cosmetic.repository");
/**
 * POST /cosmetics
 * 화장품 사진 업로드
 */
const uploadCosmetic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '파일이 없습니다.' });
        }
        const userId = req.user.userId;
        const file = req.file;
        const ext = path_1.default.extname(file.originalname);
        const cosmeticId = (0, uuid_1.v4)();
        const s3Key = `users/${userId}/cosmetics/${cosmeticId}${ext}`;
        // 1️⃣ S3 업로드
        await s3_1.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: s3_1.S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        // 2️⃣ DB 저장
        const cosmetic = await (0, cosmetic_repository_1.createCosmetic)({
            userId,
            s3Key,
            originalName: file.originalname,
            mimeType: file.mimetype,
        });
        return res.status(201).json({
            message: '화장품 등록 완료',
            cosmetic,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: '화장품 업로드 실패' });
    }
};
exports.uploadCosmetic = uploadCosmetic;
/**
 * GET /cosmetics/me
 * 내 화장품 목록 조회
 */
const getMyCosmeticsHandler = async (req, res) => {
    try {
        const userId = req.user.userId;
        const cosmetics = await (0, cosmetic_repository_1.getMyCosmetics)(userId);
        return res.status(200).json(cosmetics);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: '조회 실패' });
    }
};
exports.getMyCosmeticsHandler = getMyCosmeticsHandler;
//# sourceMappingURL=cosmetic.controller.js.map