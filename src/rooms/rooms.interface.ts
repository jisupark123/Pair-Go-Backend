import { User } from '@prisma/client';
import { Socket } from 'socket.io';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: User;
    deviceType: DeviceType;
  };
}

export type Team = 'red' | 'blue';

export type Player = {
  id: number;
  nickname: string;
  socketId: string;
  isReady: boolean;
  team: Team;
  deviceType: DeviceType;
};

export type Room = {
  id: string; // 초대 코드 (Room ID)
  hostId: number; // 방장 ID
  settings: {
    handicap: string;
    komi: string;
    stoneColor: 'auto' | 'black' | 'white';
    basicTime: string;
    countdownTime: string;
    countdownCount: string;
  };
  players: Player[];
  createdAt: Date;
};
