import express from 'express'
import routes from './routes'
import cosmeticRoutes from './cosmetics/cosmetic.routes';

const app = express()

app.use(express.json())
app.use(routes)
app.use(cosmeticRoutes);

export default app
