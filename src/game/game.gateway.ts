import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { GLOBAL_SOCKET_NAMESPACE, SOCKET_CORS_OPTIONS } from '@/common/constants/socket.constant';
import { GameAiService } from '@/game/ai/game-ai.service';
import { GameInstance } from '@/game/game.interface';
import { GameService } from '@/game/game.service';

@WebSocketGateway({
  namespace: GLOBAL_SOCKET_NAMESPACE,
  cors: SOCKET_CORS_OPTIONS,
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GameGateway');

  constructor(
    private readonly gameService: GameService,
    private readonly gameAiService: GameAiService,
  ) {}

  // 착수 (돌 놓기)
  @SubscribeMessage('playMove')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { gameId: string; x: number; y: number },
  ) {
    const updatedGame = this.gameService.processMove(payload.gameId, client.id, payload.y, payload.x);

    if (updatedGame) {
      this.server.to(payload.gameId).emit('gameUpdate', this.gameService.serializeGame(updatedGame));

      await this.handleAiTurns(updatedGame);
    }
  }

  public async handleAiTurns(game: GameInstance) {
    let currentGame = game;

    while (true) {
      // 1. 현재 턴 플레이어 확인
      const { currentTurn, teams } = currentGame;
      const currentTeam = teams.find((t) => t.stoneColor === currentTurn.stoneColor);

      if (!currentTeam) {
        break;
      }

      const currentPlayer = currentTeam.players[currentTurn.playerIndex];

      // 2. AI 여부 확인
      if (!currentPlayer.data.isAi) {
        break;
      }

      // 3. AI 다음 수 생성
      // AI 서비스는 MoveProvider 인터페이스를 구현하며, Game 객체를 받습니다.
      const nextMove = await this.gameAiService.provideMove(currentGame.gameData);

      if (!nextMove) {
        break;
      }

      // 4. 착수 처리 (AI의 socketId 사용)
      const nextGame = this.gameService.processMove(
        currentGame.id,
        currentPlayer.data.socketId,
        nextMove.y,
        nextMove.x,
      );

      if (!nextGame) {
        break;
      }

      currentGame = nextGame;

      // 5. Emit
      this.server.to(currentGame.id).emit('gameUpdate', this.gameService.serializeGame(currentGame));
    }
  }
}
