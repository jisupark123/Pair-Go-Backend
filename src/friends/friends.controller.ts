import { Controller, Post, Delete, Param, UseGuards, ParseIntPipe, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/user.decorator';
import { AddFriendDto } from '@/friends/dto/add-friend.dto';
import { FriendsService } from '@/friends/friends.service';

@ApiTags('Friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Add a friend by nickname' })
  @ApiResponse({ status: 201, description: 'Friend added successfully' })
  async addFriend(@CurrentUser() user: User, @Body() addFriendDto: AddFriendDto) {
    return this.friendsService.addFriend(user.id, addFriendDto.nickname);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  async removeFriend(@CurrentUser() user: User, @Param('id', ParseIntPipe) friendId: number) {
    return this.friendsService.removeFriend(user.id, friendId);
  }
}
