/**
 * app.ts (FINAL + DEBUG TRACE)
 * --------------------------------------------------
 * ✅ 기존 라우트 구조/순서 유지
 * ✅ multipart → auth(JSON) → 기타 JSON 흐름 유지
 * ✅ Network Error / nginx / body 파싱 문제 추적용 로그 추가
 * ✅ 전역 에러 핸들러 추가 (서버 크래시 방지)
 */

import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

/* =====================================================
 * 🔥 GLOBAL REQUEST LOGGER (가장 중요)
 * - 프론트 요청이 서버에 도착했는지 확인
 * - Network Error vs 서버 내부 에러 구분
 * ===================================================== */
app.use((req, res, next) => {
  console.log('==============================');
  console.log('[REQ]', new Date().toISOString());
  console.log('method:', req.method);
  console.log('url:', req.originalUrl);
  console.log('headers:', {
    host: req.headers.host,
    'content-type': req.headers['content-type'],
    authorization: req.headers.authorization ? 'Bearer ***' : undefined,
  });
  console.log('==============================');
  next();
});

/**
 * =====================================================
 * ✅ multipart 먼저 (JSON 파서 ❌)
 * - multer가 body를 먼저 받아야 함
 * ===================================================== */
app.use(cosmeticRoutes);

/**
 * =====================================================
 * ✅ auth / JSON 전용
 * - 회원가입 / 로그인
 * ===================================================== */
app.use(
  '/auth',
  express.json(),
  express.urlencoded({ extended: true }),
  authRoutes
);

/**
 * =====================================================
 * ✅ 기타 JSON 라우트
 * ===================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);
app.use('/ai', aiRoutes);

/**
 * =====================================================
 * 헬스 체크
 * ===================================================== */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * =====================================================
 * 🔥 GLOBAL ERROR HANDLER (마지막 방어선)
 * - try/catch 안 걸린 에러도 로그로 남김
 * ===================================================== */
app.use((err: any, req: any, res: any, next: any) => {
  console.error('🔥🔥🔥 UNHANDLED ERROR 🔥🔥🔥');
  console.error('url:', req?.originalUrl);
  console.error(err);
  res.status(500).json({ message: 'INTERNAL_SERVER_ERROR' });
});

export default app;
