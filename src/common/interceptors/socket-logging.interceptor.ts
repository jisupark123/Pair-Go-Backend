import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io'; // authenticated socket type might be needed if strictly typed

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: number;
      nickname: string;
      email: string;
    };
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    roomId?: string;
  };
}

@Injectable()
export class SocketLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SocketLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'ws') {
      return next.handle();
    }

    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const data = context.switchToWs().getData();
    // NestJS WebSockets stores the pattern (event name) in context.getHandler().name usually,
    // or we can get it from the reflector if needed.
    // But for @SubscribeMessage, accessing the actual message pattern dynamically can be tricky without Reflector.
    // A simpler way often used in logs is just the handler name or trying to extract from metadata.
    // However, context.getHandler().name gives the method name (e.g., 'handleJoinRoom').
    const handlerName = context.getHandler().name;
    const userNickname = client.data.user?.nickname || 'Guest';
    const clientId = client.id;

    this.logger.log(
      `[Nodes] > Event: ${handlerName} | User: ${userNickname} (${clientId}) | Payload: ${JSON.stringify(data)}`,
    );

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (result) => {
          const delay = Date.now() - now;
          this.logger.log(`[Nodes] < Success: ${handlerName} (+${delay}ms) | Result: ${JSON.stringify(result)}`);
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(`[Nodes] < Error: ${handlerName} (+${delay}ms) | Message: ${error.message}`);
        },
      }),
    );
  }
}
