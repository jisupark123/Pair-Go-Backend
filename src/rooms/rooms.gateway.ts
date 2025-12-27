import { Logger, UnauthorizedException } from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace, Server } from 'socket.io'; // Server is kept for afterInit type

import { SocketLoggingInterceptor } from '@/common/interceptors/socket-logging.interceptor';
import type { AuthenticatedSocket, Room } from '@/rooms/rooms.interface';
import { RoomsService } from '@/rooms/rooms.service';
import { UsersService } from '@/users/users.service';

@WebSocketGateway({
  namespace: 'ws/rooms',
  cors: {
    origin: 'http://localhost:5173', // 프론트엔드 주소 (필요시 환경변수로 분리)
    credentials: true,
  },
})
@UseInterceptors(SocketLoggingInterceptor)
export class RoomsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private logger = new Logger('RoomsGateway');

  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    // Note: server here is actually the main Server instance or Namespace depending on implementation detail,
    // but usually middleware is attached to the namespace.
    // However, in NestJS, the argument to afterInit for a namespaced gateway might be the Namespace itself.
    // Let's safe cast or handle generically.
    // Actually, 'server' argument in afterInit IS the object decorated with @WebSocketServer.
    // So it should be Namespace.

    // To be safe and correct with types:
    // When using namespace, @WebSocketServer() returns a Namespace.
    // So 'this.server' is Namespace.
    // But 'afterInit' interface says 'server: any'. We can type it as Namespace.

    // server.use is available on Namespace too.
    (server as unknown as Namespace).use(async (socket, next) => {
      try {
        // 0. User-Agent 파싱 및 기기 정보 저장
        const userAgent = socket.handshake.headers['user-agent'] || '';
        socket.data.deviceType = this.getDeviceType(userAgent);

        // 1. 쿠키에서 토큰 추출
        // Socket.IO 미들웨어에서는 socket.request.headers.cookie를 참조하거나 handshake를 사용할 수 있음
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) throw new UnauthorizedException('No cookies found');

        const accessToken = this.parseCookie(cookies, 'accessToken');
        if (!accessToken) throw new UnauthorizedException('No access token found');

        // 2. 토큰 검증
        const payload = this.jwtService.verify(accessToken);

        // 3. 유저 정보 조회
        const user = await this.usersService.findOne(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        // 4. 소켓 객체에 유저 정보 저장
        socket.data.user = user;
        next();
      } catch (error) {
        this.logger.error(`Connection auth failed: ${error.message}`);
        // 미들웨어에서 에러를 next로 전달하면 연결이 거부됨
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const { user } = client.data;
    if (user) {
      this.logger.log(`Client connected: ${client.id}, User: ${user.nickname}, Device: ${client.data.deviceType}`);
    } else {
      // 미들웨어를 통과했으나 유저 정보가 없는 경우 (이론상 발생하지 않음)
      this.logger.warn(`Client connected without user data: ${client.id}`);
      client.disconnect();
    }
  }

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

  // Helper method to log and emit
  private emitToRoom(roomId: string, event: string, data: unknown) {
    this.logger.log(`Emitting '${event}' to room ${roomId}`);
    this.server.to(roomId).emit(event, data);
  }

  private parseCookie(cookieString: string, key: string): string | null {
    const match = cookieString.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return match[2];
    return null;
  }

  private getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)
    ) {
      return 'mobile';
    }
    return 'desktop';
  }
}
