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
  }[];
  createdAt: Date;
}
