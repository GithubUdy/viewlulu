import express from 'express';
import routes from './routes';
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';

const app = express();

/**
 * ✅ JSON 파서 (auth 전용)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ✅ 인증
 */
app.use('/auth', authRoutes);

/**
 * ✅ 기타 라우트 (photos 등)
 */
app.use(routes);

/**
 * ✅ 화장품 (multer multipart)
 */
app.use(cosmeticRoutes);

/**
 * 헬스 체크
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
