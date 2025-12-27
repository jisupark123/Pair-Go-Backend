import { Module } from '@nestjs/common';

import { DevRoomsModule } from '@/dev/rooms/dev-rooms.module';

@Module({
  imports: [DevRoomsModule],
})
export class DevModule {}
