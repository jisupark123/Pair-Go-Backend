import { Module } from '@nestjs/common';

import { GameAiService } from '@/game/ai/game-ai.service';
import { GameController } from '@/game/game.controller';
import { GameGateway } from '@/game/game.gateway';
import { GameService } from '@/game/game.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameGateway, GameAiService],
  exports: [GameService, GameGateway],
})
export class GameModule {}
