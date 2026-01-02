import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { GLOBAL_SOCKET_NAMESPACE, SOCKET_CORS_OPTIONS } from '@/common/constants/socket.constant';
import { GameService } from '@/game/game.service';

@WebSocketGateway({
  namespace: GLOBAL_SOCKET_NAMESPACE,
  cors: SOCKET_CORS_OPTIONS,
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GameGateway');

  constructor(private readonly gameService: GameService) {}

  // 착수 (돌 놓기)
  @SubscribeMessage('playMove')
  handleMove(@ConnectedSocket() client: Socket, @MessageBody() payload: { gameId: string; x: number; y: number }) {
    const updatedGame = this.gameService.processMove(payload.gameId, client.id, payload.y, payload.x);

    if (updatedGame) {
      this.server.to(payload.gameId).emit('gameUpdate', this.gameService.serializeGame(updatedGame));
    }
  }
}
