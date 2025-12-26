import { User } from '@prisma/client';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: User;
    roomId?: string;
  };
}

export interface Room {
  id: string; // 초대 코드 (Room ID)
  hostId: number; // 방장 ID
  title: string;
  settings: {
    handicap: string;
    komi: string;
    stoneColor: 'auto' | 'black' | 'white';
    basicTime: string;
    countdownTime: string;
    countdownCount: string;
  };
  players: {
    id: number;
    nickname: string;
    socketId: string;
    isReady: boolean;
  }[];
  createdAt: Date;
}
