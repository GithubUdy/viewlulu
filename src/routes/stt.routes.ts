// /**
//  * stt.routes.ts
//  * --------------------------------------------------
//  * - Whisper STT 프록시 라우트 (RN → Node → Python(FastAPI))
//  * - RN에서 올라온 음성 파일(포맷 불문)을 Node에서 ffmpeg로 강제 변환:
//  *   → WAV / PCM_s16le / mono / 16kHz 로 표준화
//  * - 표준화된 WAV를 Python /stt/whisper로 multipart/form-data로 전달
//  * - Python STT 결과(JSON: { text, contains_chalkak })를 RN에 반환
//  *
//  * ✅ 안정성 원칙(중요):
//  * - 음성은 "보조 트리거"이므로, 어떤 오류가 나도 RN 기능이 깨지지 않게
//  *   항상 200 + 기본값({ text:'', contains_chalkak:false })으로 종료 가능
//  *
//  * Endpoint:
//  *   POST /api/stt/whisper
//  *
//  * Field:
//  *   file (audio/*)
//  */

// import express from 'express';
// import multer from 'multer';
// import axios from 'axios';
// import FormData from 'form-data';
// import fs from 'fs';
// import fsp from 'fs/promises';
// import path from 'path';
// import os from 'os';
// import { spawn } from 'child_process';

// const router = express.Router();

// /** ✅ 보조 트리거 기본값(절대 앱 깨지지 않게) */
// const DEFAULT_RESULT = { text: '', contains_chalkak: false };

// /**
//  * 메모리 기반 업로드
//  * - 디스크 저장 ❌ (단, ffmpeg 변환을 위해 tmp에 잠깐 저장은 필요)
//  */
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 25 * 1024 * 1024, // 25MB 안전 제한
//   },
// });

// /**
//  * Python Whisper STT 서버 주소
//  * - 배포 환경에서는 내부 IP / Docker 네트워크 주소로 교체
//  */
// const PY_WHISPER_URL =
//   process.env.PY_WHISPER_URL || 'http://127.0.0.1:8000/stt/whisper';

// /** 타임아웃(ms) */
// const STT_TIMEOUT_MS = Number(process.env.STT_PROXY_TIMEOUT_MS || 30000);

// /** tmp 저장 경로 (기본: OS temp) */
// const TMP_DIR = process.env.STT_TMP_DIR || os.tmpdir();

// /** 간단한 uniq id */
// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// /**
//  * ffmpeg로 입력 오디오를 Whisper 표준 WAV로 변환
//  * - output: WAV / PCM_s16le / mono / 16kHz
//  *
//  * ⚠️ 서버에 ffmpeg 바이너리 설치 필요:
//  *   Ubuntu: sudo apt-get update && sudo apt-get install -y ffmpeg
//  */
// async function convertToWhisperWav(inputPath: string, outputPath: string) {
//   await new Promise<void>((resolve, reject) => {
//     const args = [
//       '-y',
//       '-i',
//       inputPath,
//       '-ac',
//       '1',
//       '-ar',
//       '16000',
//       '-acodec',
//       'pcm_s16le',
//       outputPath,
//     ];

//     const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

//     let err = '';
//     p.stderr.on('data', d => {
//       err += d.toString();
//     });

//     p.on('error', reject);

//     p.on('close', code => {
//       if (code === 0) return resolve();
//       reject(new Error(`ffmpeg failed (code=${code}): ${err.slice(-1000)}`));
//     });
//   });
// }

// /**
//  * POST /api/stt/whisper
//  */
// router.post('/whisper', upload.single('file'), async (req, res) => {
//   // ✅ 어떤 예외가 떠도 RN이 깨지지 않도록 "마지막 안전망"은 항상 DEFAULT_RESULT
//   const safeReturn = (logMsg?: any) => {
//     if (logMsg) console.error('[STT PROXY ERROR]', logMsg);
//     return res.status(200).json(DEFAULT_RESULT);
//   };

//   if (!req.file) {
//     // 파일이 없으면 클라이언트 버그지만, 앱이 깨지면 안 되니 기본값으로 반환
//     return safeReturn('No audio file (field name must be "file")');
//   }

//   // tmp 파일 경로 준비
//   const id = uid();
//   const inputExt =
//     req.file.originalname && path.extname(req.file.originalname)
//       ? path.extname(req.file.originalname)
//       : '.bin';
//   const inputPath = path.join(TMP_DIR, `viewlulu-stt-${id}${inputExt}`);
//   const outputPath = path.join(TMP_DIR, `viewlulu-stt-${id}.wav`);

//   try {
//     // 1) tmp에 원본 저장
//     await fsp.writeFile(inputPath, req.file.buffer);

//     // 2) ffmpeg 변환 (포맷 강제 표준화)
//     try {
//       await convertToWhisperWav(inputPath, outputPath);
//     } catch (ffErr: any) {
//       // ffmpeg가 없거나 변환 실패해도 앱에 영향 X
//       // (가능하면 원본을 그대로 Python에 보내는 fallback도 시도)
//       console.error('[STT][FFMPEG] convert failed:', ffErr?.message ?? ffErr);
//       console.log('[STT] file=', req.file?.originalname, req.file?.mimetype, req.file?.size);

//       // fallback: 원본 그대로 Python에 보내보기 (성공하면 그대로 사용)
//       try {
//         const formFallback = new FormData();
//         formFallback.append('file', req.file.buffer, {
//           filename: req.file.originalname || 'record.bin',
//           contentType: req.file.mimetype || 'application/octet-stream',
//           knownLength: req.file.size,
//         });

//         const pyResFallback = await axios.post(PY_WHISPER_URL, formFallback, {
//           headers: { ...formFallback.getHeaders() },
//           timeout: STT_TIMEOUT_MS,
//           maxBodyLength: Infinity,
//           maxContentLength: Infinity,
//         });

//         const data = pyResFallback.data ?? DEFAULT_RESULT;
//         // RN이 기대하는 형태로 강제
//         return res.status(200).json({
//           text: typeof data.text === 'string' ? data.text : '',
//           contains_chalkak: Boolean(data.contains_chalkak),
//         });
//       } catch (fallbackErr: any) {
//         return safeReturn(
//           fallbackErr?.response?.data?.detail ||
//             fallbackErr?.response?.data ||
//             fallbackErr?.message ||
//             'ffmpeg+fallback failed',
//         );
//       }
//     }

//     // 3) 변환된 WAV를 Python으로 전달
//     const wavBuf = await fsp.readFile(outputPath);

//     const form = new FormData();
//     form.append('file', wavBuf, {
//       filename: 'record.wav',
//       contentType: 'audio/wav',
//       knownLength: wavBuf.length,
//     });

//     const pyRes = await axios.post(PY_WHISPER_URL, form, {
//       headers: {
//         ...form.getHeaders(),
//       },
//       timeout: STT_TIMEOUT_MS,
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//     });

//     const data = pyRes.data ?? DEFAULT_RESULT;

//     // ✅ Python 응답을 RN이 깨지지 않게 정규화해서 반환
//     return res.status(200).json({
//       text: typeof data.text === 'string' ? data.text : '',
//       contains_chalkak: Boolean(data.contains_chalkak),
//     });
//   } catch (e: any) {
//     return safeReturn(
//       e?.response?.data?.detail ||
//         e?.response?.data ||
//         e?.message ||
//         'Whisper STT proxy failed',
//     );
//   } finally {
//     // 4) tmp 정리 (실패해도 무시)
//     try {
//       if (fs.existsSync(inputPath)) await fsp.unlink(inputPath);
//     } catch {}
//     try {
//       if (fs.existsSync(outputPath)) await fsp.unlink(outputPath);
//     } catch {}
//   }
// });

// export default router;
