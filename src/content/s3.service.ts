import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly bucket = process.env.AWS_S3_BUCKET_CONTENT ?? '';
  private readonly isConfigured = !!process.env.AWS_S3_BUCKET_CONTENT;

  generateS3Key(userId: string, filename: string): string {
    const timestamp = Date.now();
    const ext = filename.split('.').pop() ?? '';
    return `content/uploads/${userId}/${timestamp}-${randomUUID()}.${ext}`;
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ upload_url: string; s3_key: string; expires_in: number }> {
    if (this.isConfigured) {
      // Real S3 presigned URL (requires @aws-sdk/client-s3)
      // TODO: implement with PutObjectCommand + getSignedUrl
      return {
        upload_url: `https://${this.bucket}.s3.amazonaws.com/${key}?presigned=true`,
        s3_key: key,
        expires_in: 3600,
      };
    }

    // Mock for development without AWS
    return {
      upload_url: `http://localhost:3001/mock-s3-upload/${key}`,
      s3_key: key,
      expires_in: 3600,
    };
  }

  async generateSignedPlaybackUrl(
    hlsManifestKey: string | null,
    s3Key: string | null,
  ): Promise<{ url: string; expires_in: number }> {
    const key = hlsManifestKey ?? s3Key;

    if (this.isConfigured && key) {
      // Real CloudFront signed URL
      // TODO: implement with CloudFront key pair signing
      return {
        url: `https://cdn.ndrk-lms.in/${key}?signed=true`,
        expires_in: 3600,
      };
    }

    // Mock for development
    return {
      url: `http://localhost:3001/mock-playback/${key ?? 'no-key'}`,
      expires_in: 3600,
    };
  }
}
