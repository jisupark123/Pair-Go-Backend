import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async kakaoLogin(code: string): Promise<{ accessToken: string }> {
    if (!code) {
      throw new BadRequestException('Kakao auth code is required');
    }

    const kakaoTokenUrl = 'https://kauth.kakao.com/oauth/token';
    const kakaoUserInfoUrl = 'https://kapi.kakao.com/v2/user/me';

    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY');
    const kakaoRedirectUri = this.configService.get<string>('KAKAO_REDIRECT_URI');
    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET'); // Optional if enabled

    if (!clientId || !kakaoRedirectUri) {
      throw new Error('Kakao configuration is missing');
    }

    // 1. Exchange Code for Token
    let tokenResponse;
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId);
      params.append('redirect_uri', kakaoRedirectUri);
      params.append('code', code);
      if (clientSecret) {
        params.append('client_secret', clientSecret);
      }

      const response = await firstValueFrom(
        this.httpService.post(kakaoTokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      tokenResponse = response.data;
    } catch (error) {
      console.error('Kakao Token Error:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to retrieve Kakao token');
    }

    const accessToken = tokenResponse.access_token;

    // 2. Get User Info
    let userInfo;
    try {
      const response = await firstValueFrom(
        this.httpService.get(kakaoUserInfoUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      userInfo = response.data;
    } catch (error) {
      console.error('Kakao User Info Error:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to retrieve Kakao user info');
    }

    // 3. Find or Create User
    const socialId = userInfo.id.toString();
    const kakaoAccount = userInfo.kakao_account;
    const nickname = kakaoAccount?.profile?.nickname;
    const email = kakaoAccount?.email;
    const authProvider = AuthProvider.kakao;

    let user = await this.usersService.findBySocialId(socialId, authProvider);

    if (!user) {
      user = await this.usersService.create({
        socialId,
        authProvider,
        nickname,
        email,
      });
    }

    // 4. Generate JWT
    const payload = { sub: user.id, username: user.nickname };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
