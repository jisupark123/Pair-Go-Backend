import { User } from '@prisma/client';
import { Socket } from 'socket.io';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: User;
    deviceType: DeviceType;
    // Add dynamic properties if needed, e.g., for rooms
    [key: string]: unknown;
  };
}
