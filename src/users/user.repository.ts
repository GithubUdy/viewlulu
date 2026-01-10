import { query } from '../db'

export const findUserByEmail = async (email: string) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  )
  return result.rows[0]
}

export const createUser = async ({
  email,
  password_hash,
  name,
}: {
  email: string
  password_hash: string
  name: string
}) => {
  const result = await query(
    `
    INSERT INTO users (email, password_hash, name)
    VALUES ($1, $2, $3)
    RETURNING id, email, name
    `,
    [email, password_hash, name]
  )

  return result.rows[0]
}
