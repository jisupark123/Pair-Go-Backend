import { Module } from '@nestjs/common';

import { GameController } from '@/game/game.controller';
import { GameGateway } from '@/game/game.gateway';
import { GameService } from '@/game/game.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
