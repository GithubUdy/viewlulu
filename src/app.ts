import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

/**
 * ✅ multipart 먼저 (JSON 파서 ❌)
 * multer가 body를 먼저 받아야 함
 */
app.use(cosmeticRoutes);

/**
 * ✅ auth / JSON 전용
 */
app.use(
  '/auth',
  express.json(),
  express.urlencoded({ extended: true }),
  authRoutes
);

/**
 * ✅ 기타 JSON 라우트
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);
app.use('/ai', aiRoutes);

/**
 * 헬스 체크
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
