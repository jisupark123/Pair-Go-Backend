import { Logger, UnauthorizedException, UseInterceptors } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Server } from 'socket.io';

import { GLOBAL_SOCKET_NAMESPACE, SOCKET_CORS_OPTIONS } from '@/common/constants/socket.constant';
import { SocketLoggingInterceptor } from '@/common/interceptors/socket-logging.interceptor';
import { AuthenticatedSocket } from '@/socket/socket.interface';
import { UsersService } from '@/users/users.service';

@WebSocketGateway({
  namespace: GLOBAL_SOCKET_NAMESPACE,
  cors: SOCKET_CORS_OPTIONS,
})
@UseInterceptors(SocketLoggingInterceptor)
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private logger = new Logger('SocketGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    // Middleware for Auth
    (server as unknown as Namespace).use(async (socket, next) => {
      try {
        // 0. User-Agent parsing
        const userAgent = socket.handshake.headers['user-agent'] || '';
        socket.data.deviceType = this.getDeviceType(userAgent);

        // 1. Get cookies
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) throw new UnauthorizedException('No cookies found');

        const accessToken = this.parseCookie(cookies, 'accessToken');
        if (!accessToken) throw new UnauthorizedException('No access token found');

        // 2. Verify Token
        const payload = this.jwtService.verify(accessToken);

        // 3. Get User
        const user = await this.usersService.findOne(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        // 4. Save to socket
        socket.data.user = user;
        next();
      } catch (error) {
        this.logger.error(`Connection auth failed: ${error.message}`);
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const { user } = client.data;
    if (user) {
      this.logger.log(`Client connected: ${client.id}, User: ${user.nickname}, Device: ${client.data.deviceType}`);
    } else {
      this.logger.warn(`Client connected without user data: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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
