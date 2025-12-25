import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao')
  @ApiOperation({ summary: 'Kakao Login' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token' })
  async kakaoLogin(@Query('code') code: string, @Query('state') frontendRedirectUri: string, @Res() res: Response) {
    const { accessToken } = await this.authService.kakaoLogin(code);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.redirect(frontendRedirectUri);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  }
}
