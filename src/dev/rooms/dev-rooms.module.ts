import { Module } from '@nestjs/common';

import { DevRoomsController } from '@/dev/rooms/dev-rooms.controller';
import { DevRoomsService } from '@/dev/rooms/dev-rooms.service';
import { RoomsModule } from '@/rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [DevRoomsController],
  providers: [DevRoomsService],
})
export class DevRoomsModule {}
