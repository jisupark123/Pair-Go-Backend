import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { SocketGateway } from '@/socket/socket.gateway';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
