import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import {
  type UploadApiErrorResponse,
  type UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async uploadOrganizationLogo(file: Express.Multer.File): Promise<string> {
    return this.uploadImage(file, 'nursery/organizations/logos');
  }

  async uploadPlantImage(file: Express.Multer.File): Promise<string> {
    return this.uploadImage(file, 'nursery/plants/images');
  }

  private configureCloudinary(): void {
    if (this.isConfigured) {
      return;
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.isConfigured = true;
  }

  private async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    if (!file?.buffer) {
      throw new BadRequestException('Image file is required');
    }

    this.configureCloudinary();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(
              new InternalServerErrorException(
                error.message || 'Cloudinary upload failed',
              ),
            );
            return;
          }

          if (!result?.secure_url) {
            reject(
              new InternalServerErrorException(
                'Cloudinary upload failed to return a URL',
              ),
            );
            return;
          }

          resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
