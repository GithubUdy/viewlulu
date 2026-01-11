import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';

const app = express();

/**
 * ✅ 1️⃣ JSON 파서
 * - 로그인 / 회원가입 전용
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ✅ 2️⃣ auth / 일반 API
 */
app.use('/auth', authRoutes);
app.use(routes);

/**
 * ❗❗❗ 중요 ❗❗❗
 * cosmeticRoutes는 JSON 파서 "이후"가 아니라
 * JSON 파서를 타지 않도록 분리해야 함
 */
app.use(cosmeticRoutes);

/**
 * 헬스 체크
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
