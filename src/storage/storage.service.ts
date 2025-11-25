import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET')!;

    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      region: 'auto',
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY')!,
        secretAccessKey: this.configService.get<string>('R2_SECRET_KEY')!,
      },
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const commandInput: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: "inline",
      Metadata: {
        'cache-control': 'no-transform',
      },
    };

    await this.s3.send(new PutObjectCommand(commandInput));

    const publicDomain = this.configService.get<string>('R2_PUBLIC_URL')!;
    return `${publicDomain}/${encodeURIComponent(key)}`;
  }

  async deleteFile(key: string) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err) {
      console.warn(`File ${key} not found for deletion`);
    }
  }
}