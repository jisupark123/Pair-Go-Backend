import { Module } from '@nestjs/common';

import { FriendsController } from '@/friends/friends.controller';
import { FriendsService } from '@/friends/friends.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
