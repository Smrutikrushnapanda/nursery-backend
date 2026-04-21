import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

@Injectable()
export class FileUploadService {
  private uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    // Set upload path - can be configured via environment variable
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || path.join(process.cwd(), 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // Get the base upload path
  getBasePath(): string {
    return this.uploadPath;
  }

  // Create storage with custom subfolder
  createStorage(subFolder: string): multer.StorageEngine {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const destPath = path.join(this.uploadPath, subFolder);
        
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        
        cb(null, destPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${name}-${uniqueSuffix}${ext}`);
      },
    });
  }

  // File filter for images
  static imageFileFilter(req: any, file: any, cb: any) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return cb(new BadRequestException('Only image files are allowed!'), false);
    }
    cb(null, true);
  }

  // Multer options for images
  get imageMulterOptions() {
    return {
      storage: this.createStorage('general'),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: FileUploadService.imageFileFilter,
    };
  }

  // Generate URL for uploaded file
  getFileUrl(filename: string, folder: string = 'general'): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:8080';
    return `${baseUrl}/uploads/${folder}/${filename}`;
  }

  // Upload single file helper
  async handleSingleUpload(file: Express.Multer.File, folder: string): Promise<UploadedFile> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: this.getFileUrl(file.filename, folder),
    };
  }

  // Upload multiple files helper
  async handleMultipleUpload(files: Express.Multer.File[], folder: string): Promise<UploadedFile[]> {
    if (!files || files.length === 0) {
      return [];
    }

    return files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: this.getFileUrl(file.filename, folder),
    }));
  }

  // Organization logo upload
  async uploadOrganizationLogo(file: Express.Multer.File): Promise<string> {
    const result = await this.handleSingleUpload(file, 'organizations/logos');
    return result.url;
  }

  // Plant image upload
  async uploadPlantImage(file: Express.Multer.File): Promise<string> {
    const result = await this.handleSingleUpload(file, 'plants/images');
    return result.url;
  }

  // Delete file
  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}