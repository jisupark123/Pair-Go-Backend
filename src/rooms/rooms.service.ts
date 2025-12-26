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
    const isHost = room.hostId === player.id;

    room.players.push({
      ...player,
      isReady: isHost, // 방장은 항상 준비 상태
    });

    return room;
  }

  // player 삭제 후
  // - 빈 방이면 방 삭제 후 null 반환
  // - 빈 방이 아니면 방 반환
  removePlayerFromRoom(roomId: string, socketId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.socketId !== socketId);
    if (room.players.length === 0) {
      this.rooms.delete(roomId); // 빈 방 삭제
      return null;
    }
    return room;
  }

  updatePlayerStatus(roomId: string, socketId: string, isReady: boolean) {
    const room = this.getRoom(roomId);
    const player = room.players.find((p) => p.socketId === socketId);

    if (player) {
      if (room.hostId === player.id) {
        // 방장은 항상 준비 상태
        player.isReady = true;
      } else {
        player.isReady = isReady;
      }
    }

    return room;
  }

  updateRoomSettings(roomId: string, userId: number, settings: Room['settings']) {
    const room = this.getRoom(roomId);

    if (room.hostId !== userId) {
      throw new Error('방장만 설정을 변경할 수 있습니다.');
    }

    room.settings = settings;
    return room;
  }
}
