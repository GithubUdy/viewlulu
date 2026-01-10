import { Response } from 'express'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET } from '../config/s3'
import { AuthRequest } from '../auth/auth.middleware'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { createPhoto } from './photo.repository'

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' })
    }

    const file = req.file
    const userId = req.user!.userId

    const ext = path.extname(file.originalname)
    const photoId = uuidv4()

    const fileKey = `users/${userId}/photos/${photoId}${ext}`

    // 1️⃣ S3 업로드
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    // 2️⃣ DB 메타데이터 저장
    const photo = await createPhoto({
      userId,
      s3Key: fileKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
    })

    return res.status(201).json({
      message: '업로드 성공',
      photo,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: '사진 업로드 실패' })
  }
}
