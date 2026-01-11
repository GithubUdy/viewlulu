import { Router } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = Router();
const upload = multer({ dest: "tmp/" }); // 임시 저장

/**
 * POST /ai/search
 * RN → Node → Python AI → Node → RN
 */
router.post("/search", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "file is required" });
  }

  const filePath = req.file.path;

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const aiRes = await axios.post(
      "http://localhost:8000/pouch/search",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60_000, // AI 서버 여유 시간
      }
    );

    return res.json(aiRes.data);
  } catch (err: any) {
    console.error("AI search error:", err.message);
    return res.status(500).json({ message: "AI search failed" });
  } finally {
    // 임시 파일 삭제
    fs.unlink(filePath, () => {});
  }
});

export default router;
