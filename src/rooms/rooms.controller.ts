import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/user.decorator';
import { CreateRoomDto } from '@/rooms/dto/create-room.dto';
import { RoomsService } from '@/rooms/rooms.service';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  createRoom(@CurrentUser() user: User, @Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.createRoom(user.id, createRoomDto);
  }
}
