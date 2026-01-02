import { Controller, Get, Param } from '@nestjs/common';

import type { SerializedGameInstance } from '@/game/game.interface';
import { GameService } from '@/game/game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':gameId')
  getGame(@Param('gameId') gameId: string): SerializedGameInstance {
    const game = this.gameService.getGame(gameId);
    return this.gameService.serializeGame(game);
  }
}
