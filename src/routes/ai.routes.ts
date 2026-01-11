import { Router } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "tmp/" });

/**
 * POST /ai/search
 * RN → Node → Python AI → Node → RN
 */
router.post("/search", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "이미지가 없습니다.",
    });
  }

  const filePath = req.file.path;

  try {
    const formData = new FormData();
    formData.append(
      "file",
      fs.createReadStream(filePath),
      req.file.originalname
    );

    const aiRes = await axios.post(
      "http://127.0.0.1:8000/pouch/search",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 15_000,
      }
    );

    const { top1, top5 } = aiRes.data;

    // 🔥 score 기준 판단 (UX 핵심)
    if (!top1 || top1.score < 0.45) {
      return res.json({
        success: false,
        message: "내 파우치에 없는 화장품이에요.",
        candidates: top5 ?? [],
      });
    }

    return res.json({
      success: true,
      productId: top1.product_id,
      score: top1.score,
      candidates: top5,
    });
  } catch (err: any) {
    console.error(
      "AI search error:",
      err.response?.data || err.message
    );

    return res.status(500).json({
      success: false,
      message: "AI 검색 중 오류가 발생했어요.",
    });
  } finally {
    // ✅ 임시 파일 삭제
    fs.unlink(filePath, () => {});
  }
});

export default router;
