import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { RoomsController } from '@/rooms/rooms.controller';
import { RoomsGateway } from '@/rooms/rooms.gateway';
import { RoomsService } from '@/rooms/rooms.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway],
  exports: [RoomsService, RoomsGateway],
})
export class RoomsModule {}
