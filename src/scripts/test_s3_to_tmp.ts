/**
 * (노드서버) src/scripts/test_s3_to_tmp.ts
 * --------------------------------------------------
 * S3 이미지 1개를 다운로드해서 /tmp에 저장하는 테스트 스크립트
 * ✅ 기존 기능 영향 없음
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../config/s3';

const streamToBuffer = async (stream: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

const getS3ObjectBuffer = async (key: string): Promise<Buffer> => {
  const obj = await s3.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );

  if (!obj.Body) throw new Error('S3_BODY_EMPTY');
  return streamToBuffer(obj.Body);
};

(async () => {
  const s3Key = process.argv[2];

  if (!s3Key) {
    console.error('Usage: ts-node src/scripts/test_s3_to_tmp.ts <S3_KEY>');
    process.exit(1);
  }

  console.log('S3_BUCKET:', S3_BUCKET);
  console.log('S3_KEY:', s3Key);

  const buf = await getS3ObjectBuffer(s3Key);

  const ext = path.extname(s3Key) || '.jpg';
  const outPath = path.join(os.tmpdir(), `viewlulu-s3-test-${Date.now()}${ext}`);

  fs.writeFileSync(outPath, buf);

  console.log('✅ Saved to:', outPath);
  console.log('✅ Size(bytes):', buf.length);
})().catch((e) => {
  console.error('❌ FAILED:', e);
  process.exit(1);
});
