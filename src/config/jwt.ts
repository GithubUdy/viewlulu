import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = '7d'

export const generateAccessToken = (userId: number) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
  })
}
