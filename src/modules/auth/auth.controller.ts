import {
  Body,
  Controller,
  Get,
  Inject,
  ParseFilePipeBuilder,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setAuthCookies(res: Response, accessToken: string) {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    httpOnly: true,
  });
  // NOT httpOnly so frontend can read - BUT it's now the actual JWT token!
  // Frontend must verify this token, not just check existence
  res.cookie('is_loggedin', accessToken, {
    ...COOKIE_OPTIONS,
    httpOnly: false, // Frontend can read this
  });
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(JwtService) private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'organizationName',
        'email',
        'phone',
        'address',
        'businessTypeId',
        'categoryId',
        'subcategoryId',
        'password',
      ],
      properties: {
        organizationName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        isActive: { type: 'boolean' },
        businessTypeId: { type: 'number' },
        categoryId: { type: 'number' },
        subcategoryId: { type: 'number' },
        password: { type: 'string' },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Organization logo image file',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Register organization + owner' })
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp|gif|svg\+xml)$/,
        })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    logoFile: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, logoFile);
    setAuthCookies(res, result.accessToken);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    setAuthCookies(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('is_loggedin');
    return { message: 'Logged out successfully' };
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify current user is logged in' })
  @ApiResponse({ status: 200, description: 'User is logged in' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  verify() {
    // This endpoint is protected by JwtAuthGuard
    // If it reaches here, the user is authenticated
    return { authenticated: true, message: 'User is logged in' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check login status without error' })
  @ApiResponse({ status: 200, description: 'Returns login status' })
  async checkStatus(@Req() req: Request) {
    // Non-guarded endpoint - always returns 200 with status
    // Frontend can call this to check if user is logged in
    try {
      const token =
        (req as any).cookies?.access_token ||
        req.headers['authorization']?.split(' ')[1] ||
        req.headers['x-access-token'];

      if (!token) {
        return { authenticated: false, message: 'Not logged in' };
      }

      const secret = this.config.get<string>('JWT_SECRET') ?? 'change-me-in-production';
      const payload = this.jwt.verify(token, { secret });

      return {
        authenticated: true,
        message: 'User is logged in',
        user: { id: payload.sub, role: payload.role },
      };
    } catch {
      return { authenticated: false, message: 'Not logged in' };
    }
  }
}
