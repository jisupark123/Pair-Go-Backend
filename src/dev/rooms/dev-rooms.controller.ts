import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DevRoomsService } from '@/dev/rooms/dev-rooms.service';
import { AddVirtualPlayersDto } from '@/dev/rooms/dto/add-virtual-players.dto';

@ApiTags('Dev / Rooms')
@Controller('dev/rooms')
export class DevRoomsController {
  constructor(private readonly devRoomsService: DevRoomsService) {}

  @Post(':roomId/players')
  @ApiOperation({ summary: '개발용: 특정 방에 가상 유저 N명 추가' })
  addVirtualPlayers(@Param('roomId') roomId: string, @Body() dto: AddVirtualPlayersDto) {
    return this.devRoomsService.addVirtualPlayers(roomId, dto.count);
  }
}
