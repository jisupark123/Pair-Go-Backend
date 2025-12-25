import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { DatabaseModule } from '@/database/database.module';
import { FriendsModule } from '@/friends/friends.module';
// import { GameModule } from '@/game/game.module';
import { RoomsModule } from '@/rooms/rooms.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    FriendsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
