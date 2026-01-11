import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';

const app = express();

/**
 * ✅ 1️⃣ JSON / URLENCODED 파서
 * - auth/login, auth/register 등에서 필수
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ✅ 2️⃣ 공통 라우트
 */
app.use(routes);

/**
 * ✅ 3️⃣ 인증 라우트
 */
app.use('/auth', authRoutes);

/**
 * ✅ 4️⃣ 헬스 체크
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * ✅ 5️⃣ 화장품 라우트 (multer 포함)
 */
app.use(cosmeticRoutes);

export default app;
