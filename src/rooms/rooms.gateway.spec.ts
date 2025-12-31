import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { User } from '@prisma/client';
import { Namespace, Socket } from 'socket.io';

import { RoomsGateway } from '@/rooms/rooms.gateway';
import { Room } from '@/rooms/rooms.interface';
import { RoomsService } from '@/rooms/rooms.service';
import type { AuthenticatedSocket } from '@/socket/socket.interface';

// --- Mock Data ---
const mockUser: User = {
  id: 1,
  nickname: 'TestUser',
  email: 'test@example.com',
  socialId: '12345',
  authProvider: 'kakao',
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const mockRoomId = 'TEST_ROOM_ID';
const mockRoom = {
  id: mockRoomId,
  hostId: mockUser.id,
  players: [],
  settings: {},
};

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: RoomsService;
  let server: Namespace;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsGateway,
        {
          provide: RoomsService,
          useValue: {
            addPlayerToRoom: jest.fn(),
            removePlayerFromRoom: jest.fn(),
            getRoom: jest.fn(),
            updatePlayerStatus: jest.fn(),
            updateRoomSettings: jest.fn(),
            changeTeam: jest.fn(),
            kickPlayer: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RoomsGateway>(RoomsGateway);
    roomsService = module.get<RoomsService>(RoomsService);

    // Mock Server (Namespace)
    server = {
      use: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Namespace;
    gateway.server = server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('2. 방 입장 (handleJoinRoom)', () => {
    let client: AuthenticatedSocket;

    beforeEach(() => {
      client = {
        id: 'socket_id_1',
        data: { user: mockUser, deviceType: 'desktop' },
        join: jest.fn(),
      } as unknown as AuthenticatedSocket;
    });

    it('플레이어를 방에 성공적으로 추가해야 함', () => {
      const roomId = 'room1';
      const updatedRoom = { ...mockRoom, players: [mockUser] };
      (roomsService.addPlayerToRoom as jest.Mock).mockReturnValue(updatedRoom);

      const result = gateway.handleJoinRoom(client, { roomId });

      expect(roomsService.addPlayerToRoom).toHaveBeenCalledWith(roomId, {
        id: mockUser.id,
        nickname: mockUser.nickname,
        socketId: client.id,
        deviceType: 'desktop',
      });
      expect(client.join).toHaveBeenCalledWith(roomId);
      expect(client.data['roomId']).toBe(roomId);
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', updatedRoom);
      expect(result).toEqual({ success: true, room: updatedRoom });
    });

    it('존재하지 않는 방이면 에러를 반환해야 함', () => {
      (roomsService.addPlayerToRoom as jest.Mock).mockImplementation(() => {
        throw new Error('존재하지 않는 방입니다.');
      });

      expect(() => gateway.handleJoinRoom(client, { roomId: 'invalid' })).toThrow(WsException);
    });

    it('방이 가득 찼으면 에러를 반환해야 함', () => {
      (roomsService.addPlayerToRoom as jest.Mock).mockImplementation(() => {
        throw new Error('방이 가득 찼습니다.');
      });

      expect(() => gateway.handleJoinRoom(client, { roomId: 'full' })).toThrow(WsException);
    });
  });

  describe('3. 방 이벤트 핸들링', () => {
    let client: AuthenticatedSocket;
    const roomId = 'room1';

    beforeEach(() => {
      client = {
        id: 'socket_id_1',
        data: { user: mockUser, deviceType: 'desktop' },
      } as unknown as AuthenticatedSocket;

      // Mock return values ensuring they return a room object
      (roomsService.updatePlayerStatus as jest.Mock).mockReturnValue(mockRoom);
      (roomsService.updateRoomSettings as jest.Mock).mockReturnValue(mockRoom);
      (roomsService.changeTeam as jest.Mock).mockReturnValue(mockRoom);
    });

    it('updateReadyStatus: 서비스 호출 및 roomUpdate 이벤트 전파 확인', () => {
      gateway.handleUpdateReadyStatus(client, { roomId, isReady: true });
      expect(roomsService.updatePlayerStatus).toHaveBeenCalledWith(roomId, client.id, true);
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', expect.anything());
    });

    it('updateRoomSettings: 방장이 요청 시 설정이 업데이트되어야 함', () => {
      const newSettings: Room['settings'] = {
        handicap: 'none',
        komi: '6.5',
        stoneColorMethod: 'auto',
        basicTime: '30m',
        countdownTime: '30s',
        countdownCount: '3',
      };
      gateway.handleUpdateRoomSettings(client, { roomId, settings: newSettings });

      expect(roomsService.updateRoomSettings).toHaveBeenCalledWith(roomId, mockUser.id, newSettings);
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', expect.anything());
    });

    it('changeTeam: 서비스 메서드 호출 확인', () => {
      const targetUserId = 2;
      gateway.handleChangeTeam(client, { roomId, targetUserId });
      expect(roomsService.changeTeam).toHaveBeenCalledWith(roomId, mockUser.id, targetUserId);
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', expect.anything());
    });

    it('changeTeam: 서비스에서 에러 발생 시 WsException 반환', () => {
      (roomsService.changeTeam as jest.Mock).mockImplementation(() => {
        throw new Error('권한이 없습니다.');
      });
      expect(() => gateway.handleChangeTeam(client, { roomId, targetUserId: 2 })).toThrow(WsException);
    });

    it('kickPlayer: 성공 시 유저 강제 퇴장, imgOut 전송, roomUpdate 브로드캐스트', () => {
      const targetId = 2;
      const kickedSocketId = 'kicked_socket_id';

      // Mocking service return
      (roomsService.kickPlayer as jest.Mock).mockReturnValue({
        room: mockRoom,
        kickedSocketId,
      });

      // Mocking sockets
      const kickedClient = {
        leave: jest.fn(),
        emit: jest.fn(),
        data: { roomId },
      } as unknown as Socket;

      // server.sockets is a Map (Namespace structure)
      (server as unknown as { sockets: Map<string, unknown> }).sockets = new Map([[kickedSocketId, kickedClient]]);

      gateway.handleKickPlayer(client, { roomId, targetId });

      expect(roomsService.kickPlayer).toHaveBeenCalledWith(roomId, mockUser.id, targetId);
      expect(kickedClient.leave).toHaveBeenCalledWith(roomId);
      expect(kickedClient.emit).toHaveBeenCalledWith('imgOut', { roomId });
      expect(kickedClient.data['roomId']).toBeNull();
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', mockRoom);
    });

    it('kickPlayer: 서비스 에러 시 WsException', () => {
      (roomsService.kickPlayer as jest.Mock).mockImplementation(() => {
        throw new Error('권한이 없습니다.');
      });
      expect(() => gateway.handleKickPlayer(client, { roomId: 'r1', targetId: 2 })).toThrow(WsException);
    });
  });

  describe('4. 연결 종료 (handleDisconnect)', () => {
    let client: AuthenticatedSocket;
    const roomId = 'room1';

    beforeEach(() => {
      client = {
        id: 'socket_id_1',
        data: { user: mockUser, deviceType: 'desktop', roomId },
      } as unknown as AuthenticatedSocket;
    });

    it('연결 종료 시 방에서 유저를 제거해야 함', () => {
      (roomsService.removePlayerFromRoom as jest.Mock).mockReturnValue(mockRoom); // 방이 유지됨
      gateway.handleDisconnect(client);
      expect(roomsService.removePlayerFromRoom).toHaveBeenCalledWith(roomId, client.id);
    });

    it("방에 인원이 남아있다면 'roomUpdate' 이벤트를 전송해야 함", () => {
      (roomsService.removePlayerFromRoom as jest.Mock).mockReturnValue(mockRoom);
      gateway.handleDisconnect(client);
      expect(server.to).toHaveBeenCalledWith(roomId);
      expect(server.emit).toHaveBeenCalledWith('roomUpdate', mockRoom);
    });

    it('마지막 유저가 나가면 방이 삭제되어야 함 (이벤트 전송 안 함)', () => {
      (roomsService.removePlayerFromRoom as jest.Mock).mockReturnValue(null); // 방 삭제됨
      gateway.handleDisconnect(client);
      expect(roomsService.removePlayerFromRoom).toHaveBeenCalledWith(roomId, client.id);
      expect(server.emit).not.toHaveBeenCalled();
    });
  });
});
