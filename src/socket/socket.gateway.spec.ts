import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { Namespace, Server, Socket } from 'socket.io';

import { SocketGateway } from '@/socket/socket.gateway';
import type { AuthenticatedSocket } from '@/socket/socket.interface';
import { UsersService } from '@/users/users.service';

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

const mockAccessToken = 'valid_access_token';

describe('SocketGateway', () => {
  let gateway: SocketGateway;
  let jwtService: JwtService;
  let usersService: UsersService;
  let server: Namespace;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);

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

  describe('1. 연결 및 인증 (afterInit)', () => {
    let mockMiddleware: (socket: Socket, next: (err?: unknown) => void) => void;
    // Define a specific mock type to avoid 'any'
    type MockSocket = {
      handshake: { headers: { cookie?: string; 'user-agent'?: string } };
      data: Partial<AuthenticatedSocket['data']>;
    };
    let mockSocket: MockSocket;
    let next: jest.Mock;

    beforeEach(() => {
      // Capture middleware
      gateway.afterInit(server as unknown as Server);
      // Ensure server.use was called
      expect(server.use).toHaveBeenCalled();
      mockMiddleware = (server.use as jest.Mock).mock.calls[0][0];

      // Prepare basic mock socket
      mockSocket = {
        handshake: {
          headers: {
            cookie: '',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)',
          },
        },
        data: {},
      };
      next = jest.fn();
    });

    it('쿠키가 없으면 연결을 거부해야 함 (UnauthorizedException)', async () => {
      mockSocket.handshake.headers.cookie = undefined;
      await mockMiddleware(mockSocket as Socket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Unauthorized');
    });

    it("쿠키에 'accessToken'이 없으면 연결을 거부해야 함", async () => {
      mockSocket.handshake.headers.cookie = 'other=cookie';
      await mockMiddleware(mockSocket as Socket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('토큰이 유효하지 않으면 연결을 거부해야 함 (JwtService.verify 실패)', async () => {
      mockSocket.handshake.headers.cookie = `accessToken=${mockAccessToken}`;
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await mockMiddleware(mockSocket as Socket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('DB에서 유저를 찾을 수 없으면 연결을 거부해야 함', async () => {
      mockSocket.handshake.headers.cookie = `accessToken=${mockAccessToken}`;
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await mockMiddleware(mockSocket as Socket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('유효한 연결 요청은 수락하고 소켓 데이터에 유저 정보를 저장해야 함', async () => {
      mockSocket.handshake.headers.cookie = `accessToken=${mockAccessToken}`;
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      await mockMiddleware(mockSocket as Socket, next);

      expect(next).toHaveBeenCalledWith(); // No error
      expect(mockSocket.data.user).toBeDefined();
      expect(mockSocket.data.user?.id).toBe(mockUser.id);
    });

    it('User-Agent를 파싱하여 기기 타입(mobile/tablet/desktop)을 소켓 데이터에 저장해야 함', async () => {
      // Setup successful auth first
      mockSocket.handshake.headers.cookie = `accessToken=${mockAccessToken}`;
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mobile Test (set in beforeEach)
      await mockMiddleware(mockSocket as Socket, next);
      expect(mockSocket.data.deviceType).toBe('mobile');

      // Desktop Test
      mockSocket.handshake.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
      await mockMiddleware(mockSocket as Socket, next);
      expect(mockSocket.data.deviceType).toBe('desktop');
    });
  });
});
