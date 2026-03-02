import sharp from 'sharp';
import crypto from 'crypto';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function uploadImage(buffer: Buffer): Promise<{ imageUrl: string; imageHash: string }> {
  const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const processedImage = await sharp(buffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const key = `menus/${uuidv4()}.jpg`;

  await s3.putObject({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: processedImage,
    ContentType: 'image/jpeg',
  }).promise();

  const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { imageUrl, imageHash };
}

export async function getSignedUrl(key: string): Promise<string> {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Expires: 3600,
  });
}
