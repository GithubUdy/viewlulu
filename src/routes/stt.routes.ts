import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const PY_WHISPER_URL = 'http://127.0.0.1:8000/stt/whisper';
// 서버 배포 환경이면 내부 IP 또는 docker 네트워크 주소

router.post('/whisper', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: 'record.wav',
      contentType: req.file.mimetype || 'audio/wav',
    });

    const pyRes = await axios.post(PY_WHISPER_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    return res.json(pyRes.data);
  } catch (e: any) {
    console.error('[STT PROXY ERROR]', e?.message);
    return res.status(500).json({ message: 'Whisper STT failed' });
  }
});

export default router;
