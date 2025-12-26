import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Room } from '@/rooms/rooms.interface';
import { RoomsService } from '@/rooms/rooms.service';
import { UsersService } from '@/users/users.service';

@WebSocketGateway({
  namespace: 'ws/rooms',
  cors: {
    origin: 'http://localhost:5173', // 프론트엔드 주소 (필요시 환경변수로 분리)
    credentials: true,
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RoomsGateway');

  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1. 쿠키에서 토큰 추출
      const cookies = client.handshake.headers.cookie;
      if (!cookies) throw new UnauthorizedException('No cookies found');

      const accessToken = this.parseCookie(cookies, 'accessToken');
      if (!accessToken) throw new UnauthorizedException('No access token found');

      // 2. 토큰 검증
      const payload = this.jwtService.verify(accessToken);

      // 3. 유저 정보 조회
      const user = await this.usersService.findOne(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      // 4. 소켓 객체에 유저 정보 저장
      client.data.user = user;
      this.logger.log(`Client connected: ${client.id}, User: ${user.nickname}`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 유저가 접속해 있던 방이 있다면 제거 및 브로드캐스트
    const { roomId } = client.data;
    if (roomId) {
      this.roomsService.removePlayerFromRoom(roomId, client.id);
      this.server.to(roomId).emit('roomUpdate', this.roomsService.getRoom(roomId));
      this.logger.log(`User removed from room ${roomId}`);
    }
  }

  // 대기실 입장
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { roomId: string }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId } = payload;
      const updatedRoom = this.roomsService.addPlayerToRoom(roomId, {
        id: user.id,
        nickname: user.nickname,
        socketId: client.id,
      });

      client.join(roomId);
      client.data.roomId = roomId; // 연결 끊김 처리를 위해 저장

      // 해당 방의 모든 유저에게 방 정보 업데이트 전송
      this.server.to(roomId).emit('roomUpdate', updatedRoom);

      return { success: true, room: updatedRoom };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('updateReadyStatus')
  handleUpdateReadyStatus(client: Socket, payload: { roomId: string; isReady: boolean }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, isReady } = payload;
      const updatedRoom = this.roomsService.updatePlayerStatus(roomId, client.id, isReady);

      this.server.to(roomId).emit('roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('updateRoomSettings')
  handleUpdateRoomSettings(client: Socket, payload: { roomId: string; settings: Room['settings'] }) {
    const { user } = client.data;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const { roomId, settings } = payload;
      const updatedRoom = this.roomsService.updateRoomSettings(roomId, user.id, settings);

      this.server.to(roomId).emit('roomUpdate', updatedRoom);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  private parseCookie(cookieString: string, key: string): string | null {
    const match = cookieString.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return match[2];
    return null;
  }
}
