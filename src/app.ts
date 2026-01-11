import express from 'express';

import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

/**
 * =====================================================
 * 1️⃣ 인증 / JSON 전용 라우트
 * -----------------------------------------------------
 * - JSON 요청만 들어오는 라우트
 * - multipart 요청 ❌
 * =====================================================
 */
app.use(
  '/auth',
  express.json(),
  express.urlencoded({ extended: true }),
  authRoutes
);

/**
 * =====================================================
 * 2️⃣ multipart/form-data 라우트 (🔥 가장 중요)
 * -----------------------------------------------------
 * - multer가 처리해야 함
 * - ❌ JSON 파서 절대 붙이면 안 됨
 * - /cosmetics/detect 포함
 * =====================================================
 */
app.use(cosmeticRoutes);

/**
 * =====================================================
 * 3️⃣ AI 라우트
 * -----------------------------------------------------
 * - 내부에서 fetch / axios 사용
 * - multipart 안 씀
 * =====================================================
 */
app.use(
  '/ai',
  express.json(),
  express.urlencoded({ extended: true }),
  aiRoutes
);

/**
 * =====================================================
 * 4️⃣ 나머지 JSON 라우트
 * -----------------------------------------------------
 * - routes 안에 있는 일반 API
 * =====================================================
 */
app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  routes
);

/**
 * =====================================================
 * 5️⃣ 헬스 체크
 * =====================================================
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
