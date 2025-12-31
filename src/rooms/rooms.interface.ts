import { AuthenticatedSocket, DeviceType } from '@/socket/socket.interface';

export type { AuthenticatedSocket, DeviceType };

export type Team = 'red' | 'blue';

export type Player = {
  id: number;
  nickname: string;
  socketId: string;
  isReady: boolean;
  team: Team;
  deviceType: DeviceType;
};

export type RoomStatus = 'waiting' | 'playing' | 'deleting';

export type Room = {
  id: string; // 초대 코드 (Room ID)
  hostId: number; // 방장 ID
  status: RoomStatus;
  settings: {
    handicap: string; // (몇점)접바둑 (0이면 호선(덤 6.5집)이고 komi 설정값은 '0'으로 입력됨)
    komi: string; // 덤 (흑 기준)
    stoneColorMethod: 'auto' | 'manual'; // 자동돌가림, 방에서 선택
    basicTime: string; // 기본 시간
    countdownTime: string; // 초읽기 시간
    countdownCount: string; // 초읽기 횟수
  };
  players: Player[];
  createdAt: Date;
};
