import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';
import { DatabaseModule } from '@/database/database.module';
import { DevModule } from '@/dev/dev.module';
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
    DevModule,
    FriendsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
