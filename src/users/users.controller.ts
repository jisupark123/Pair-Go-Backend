import { Controller, Get, Patch, Body, UseGuards, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/user.decorator';
import { PublicUserDto } from '@/users/dto/public-user.dto';
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

  @Get()
  @ApiOperation({ summary: 'Search user by nickname (Public)' })
  @ApiQuery({ name: 'nickname', required: true, description: 'Nickname to search for' })
  @ApiResponse({ status: 200, type: PublicUserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findUserByNickname(@Query('nickname') nickname: string) {
    if (!nickname) {
      throw new BadRequestException('Nickname query parameter is required');
    }
    const user = await this.usersService.findByNickname(nickname);
    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }
    return new PublicUserDto(user);
  }
}
