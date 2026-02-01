/**
 * stt.routes.ts
 * --------------------------------------------------
 * - Whisper STT 프록시 라우트
 * - React Native → Node → Python(FastAPI) 중계
 * - multipart/form-data 음성 파일 전달
 * - Python STT 결과(JSON)를 그대로 RN에 반환
 *
 * Endpoint:
 *   POST /api/stt/whisper
 *
 * Field:
 *   file (audio/wav)
 */

import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

/**
 * 메모리 기반 업로드
 * - 디스크 저장 ❌
 * - RN → Python 즉시 전달
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB 안전 제한
  },
});

/**
 * Python Whisper STT 서버 주소
 * - 배포 환경에서는 내부 IP / Docker 네트워크 주소로 교체
 */
const PY_WHISPER_URL =
  process.env.PY_WHISPER_URL || 'http://127.0.0.1:8000/stt/whisper';

/**
 * POST /api/stt/whisper
 */
router.post('/whisper', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No audio file (field name must be "file")',
      });
    }

    const form = new FormData();

    // ⚠️ filename / contentType 유지 중요
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'record.wav',
      contentType: req.file.mimetype || 'audio/wav',
      knownLength: req.file.size,
    });

    const pyRes = await axios.post(PY_WHISPER_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: Number(process.env.STT_PROXY_TIMEOUT_MS || 30000),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // ✅ Python 응답을 그대로 RN으로 반환
    return res.status(pyRes.status).json(pyRes.data);
  } catch (e: any) {
    const status = e?.response?.status || 502;
    const detail =
      e?.response?.data?.detail ||
      e?.response?.data ||
      e?.message ||
      'Whisper STT proxy failed';

    console.error('[STT PROXY ERROR]', detail);

    return res.status(status).json({ message: detail });
  }
});

export default router;
