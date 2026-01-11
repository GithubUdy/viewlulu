import express from 'express'
import routes from './routes'
import cosmeticRoutes from './cosmetics/cosmetic.routes';
import authRoutes from './auth/auth.routes';


const app = express()
app.use(express.json())
app.use(routes)
app.use('/auth', authRoutes)
app.get('/', (req, res) => {
  res.json({status: 'ok'})
})
app.use(cosmeticRoutes);

export default app
