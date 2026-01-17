import sharp from 'sharp';

export async function createThumbnail(
  buffer: Buffer,
  size = 512
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}
