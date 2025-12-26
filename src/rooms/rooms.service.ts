import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { CreateRoomDto } from '@/rooms/dto/create-room.dto';
import { Room } from '@/rooms/rooms.interface';

@Injectable()
export class RoomsService {
  private rooms: Map<string, Room> = new Map();

  createRoom(hostId: number, createRoomDto: CreateRoomDto): Room {
    const roomId = nanoid(6); // 6자리 초대 코드 생성
    const { title, ...settings } = createRoomDto;

    const newRoom: Room = {
      id: roomId,
      hostId,
      title,
      settings,
      players: [], // 플레이어는 소켓 연결 후 추가
      createdAt: new Date(),
    };

    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  getRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }
    return room;
  }

  // Socket Gateway에서 사용할 메서드들
  addPlayerToRoom(roomId: string, player: { id: number; nickname: string; socketId: string }) {
    const room = this.getRoom(roomId);

    room.players.push(player);

    return room;
  }

  removePlayerFromRoom(roomId: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((p) => p.socketId !== socketId);
      if (room.players.length === 0) {
        this.rooms.delete(roomId); // 빈 방 삭제
      }
    }
  }
}
