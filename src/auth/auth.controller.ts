import { Request, Response } from 'express'
import { AuthService } from './auth.service'

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({
        message: 'email, password, name은 필수입니다.',
      })
    }

    const user = await AuthService.register(email, password, name)
    return res.status(201).json(user)
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(400).json({
        message: '이미 존재하는 이메일입니다.',
      })
    }

    return res.status(500).json({ message: '서버 오류' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'email과 password는 필수입니다.',
      })
    }

    const result = await AuthService.login(email, password)
    return res.status(200).json(result)
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
    }

    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    return res.status(500).json({ message: '서버 오류' });
  }
}
