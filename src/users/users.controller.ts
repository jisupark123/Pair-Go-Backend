import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/user.decorator';
import { UpdateNicknameDto } from '@/users/dto/update-nickname.dto';
import { User as UserEntity } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, type: UserEntity })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me/nickname')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update nickname' })
  @ApiResponse({ status: 200, type: UserEntity })
  async updateNickname(@CurrentUser() user: User, @Body() dto: UpdateNicknameDto) {
    return this.usersService.updateNickname(user.id, dto.nickname);
  }
}
