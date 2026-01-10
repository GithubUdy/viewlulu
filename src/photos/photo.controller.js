"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPhoto = void 0;
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("../config/s3");
const auth_middleware_1 = require("../auth/auth.middleware");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const photo_repository_1 = require("./photo.repository");
const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '파일이 없습니다.' });
        }
        const file = req.file;
        const userId = req.user.userId;
        const ext = path_1.default.extname(file.originalname);
        const photoId = (0, uuid_1.v4)();
        const fileKey = `users/${userId}/photos/${photoId}${ext}`;
        // 1️⃣ S3 업로드
        await s3_1.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: s3_1.S3_BUCKET,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        // 2️⃣ DB 메타데이터 저장
        const photo = await (0, photo_repository_1.createPhoto)({
            userId,
            s3Key: fileKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
        });
        return res.status(201).json({
            message: '업로드 성공',
            photo,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: '사진 업로드 실패' });
    }
};
exports.uploadPhoto = uploadPhoto;
//# sourceMappingURL=photo.controller.js.map