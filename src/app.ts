import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';
import aiRoutes from "./routes/ai.routes";

const app = express();

/**
 * ✅ auth / JSON 전용
 */
app.use('/auth', express.json(), express.urlencoded({ extended: true }), authRoutes);

/**
 * ✅ 기타 JSON 라우트가 있으면 여기에
 * (지금은 없음)
 */

/**
 * ✅ multipart 라우트 (JSON 파서 ❌)
 */
app.use(cosmeticRoutes);
app.use(routes);
app.use("/ai", aiRoutes);

/**
 * 헬스 체크
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
