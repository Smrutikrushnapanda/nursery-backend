import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setAuthCookies(res: Response, accessToken: string) {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, httpOnly: true });
  res.cookie('is_loggedin', 'true', COOKIE_OPTIONS);
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register organization + owner' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, ...result } = await this.authService.register(dto);
    setAuthCookies(res, accessToken);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, ...result } = await this.authService.login(dto);
    setAuthCookies(res, accessToken);
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
}
