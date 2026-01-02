import { Logger, UseInterceptors } from '@nestjs/common';
import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io'; // Server is kept for afterInit type

import { GLOBAL_SOCKET_NAMESPACE, SOCKET_CORS_OPTIONS } from '@/common/constants/socket.constant';
import { SocketLoggingInterceptor } from '@/common/interceptors/socket-logging.interceptor';
import { Room } from '@/rooms/rooms.interface'; // AuthenticatedSocket moved
import { RoomsService } from '@/rooms/rooms.service';
import type { AuthenticatedSocket } from '@/socket/socket.interface';

@WebSocketGateway({
  namespace: GLOBAL_SOCKET_NAMESPACE,
  cors: SOCKET_CORS_OPTIONS,
})
@UseInterceptors(SocketLoggingInterceptor)
export class RoomsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private logger = new Logger('RoomsGateway');

  constructor(private readonly roomsService: RoomsService) {}

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 유저가 접속해 있던 방이 있다면 제거 및 브로드캐스트
    const roomId = client.data['roomId'] as string | undefined;
    if (roomId) {
      const updatedRoom = this.roomsService.removePlayerFromRoom(roomId, client.id);
      if (updatedRoom) {
        this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      } else {
        this.logger.log(`Room ${roomId} removed`);
      }
    }
  }

  // 대기실 입장
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: AuthenticatedSocket, payload: { roomId: string }) {
    const { user, deviceType } = client.data;

    // 이미 미들웨어에서 검증되었지만 타입 안정성을 위해 체크
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId } = payload;
      const updatedRoom = this.roomsService.addPlayerToRoom(roomId, {
        id: user.id,
        nickname: user.nickname,
        socketId: client.id,
        deviceType,
      });

      client.join(roomId);
      client.data['roomId'] = roomId; // 연결 끊김 처리를 위해 저장

      // 해당 방의 모든 유저에게 방 정보 업데이트 전송
      this.emitToRoom(roomId, 'roomUpdate', updatedRoom);

      return { success: true, room: updatedRoom };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: AuthenticatedSocket, payload: { roomId: string }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId } = payload;
      const updatedRoom = this.roomsService.removePlayerFromRoom(roomId, client.id);

      client.leave(roomId);
      client.data['roomId'] = null;

      if (updatedRoom) {
        this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      }

      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('updateReadyStatus')
  handleUpdateReadyStatus(client: AuthenticatedSocket, payload: { roomId: string; isReady: boolean }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, isReady } = payload;
      const updatedRoom = this.roomsService.updatePlayerStatus(roomId, client.id, isReady);

      this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('updateRoomSettings')
  handleUpdateRoomSettings(client: AuthenticatedSocket, payload: { roomId: string; settings: Room['settings'] }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, settings } = payload;
      const updatedRoom = this.roomsService.updateRoomSettings(roomId, user.id, settings);

      this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('kickPlayer')
  handleKickPlayer(client: AuthenticatedSocket, payload: { roomId: string; targetId: number }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, targetId } = payload;
      const { room: updatedRoom, kickedSocketId } = this.roomsService.kickPlayer(roomId, user.id, targetId);

      // Force kicked user to leave the socket room
      const kickedClient = this.server.sockets.get(kickedSocketId);
      if (kickedClient) {
        kickedClient.leave(roomId);
        this.logger.log(`Emitting 'imgOut' to user ${kickedSocketId} in room ${roomId}`);
        kickedClient.emit('imgOut', { roomId }); // Custom event to notify user they were kicked
        kickedClient.data['roomId'] = null; // Clear room data
      }

      // Broadcast update to remaining players
      this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('changeTeam')
  handleChangeTeam(client: AuthenticatedSocket, payload: { roomId: string; targetUserId: number }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, targetUserId } = payload;
      const updatedRoom = this.roomsService.changeTeam(roomId, user.id, targetUserId);

      this.emitToRoom(roomId, 'roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: AuthenticatedSocket, payload: { roomId: string }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId } = payload;
      const updatedRoom = this.roomsService.startGame(roomId, user.id);

      this.emitToRoom(roomId, 'gameStart', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  // Helper method to log and emit
  private emitToRoom(roomId: string, event: string, data: unknown) {
    this.logger.log(`Emitting '${event}' to room ${roomId}`);
    this.server.to(roomId).emit(event, data);
  }
}
