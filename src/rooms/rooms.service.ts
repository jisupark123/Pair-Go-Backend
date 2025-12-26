import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { CreateRoomDto } from '@/rooms/dto/create-room.dto';
import { DeviceType, Room } from '@/rooms/rooms.interface';

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
  addPlayerToRoom(roomId: string, player: { id: number; nickname: string; socketId: string; deviceType: DeviceType }) {
    const room = this.getRoom(roomId);

    if (room.players.length >= 4) {
      throw new Error('방이 가득 찼습니다.');
    }

    // 팀 할당 규칙: 인원 균형을 맞추어 팀을 자동 배정 (최대 2:2)
    // - 레드팀과 블루팀의 현재 인원수를 확인하여 균형을 맞춥니다.
    // - 두 팀의 인원수가 같으면 무작위(50%)로 팀을 결정합니다.
    // - 한 팀의 인원이 이미 2명(최대)인 경우, 나머지 팀으로 자동 배정합니다.
    const redCount = room.players.filter((p) => p.team === 'red').length;
    const blueCount = room.players.filter((p) => p.team === 'blue').length;
    let team: 'red' | 'blue';

    if (redCount < 2 && blueCount < 2) {
      team = Math.random() < 0.5 ? 'red' : 'blue';
    } else if (redCount >= 2) {
      team = 'blue';
    } else {
      team = 'red';
    }

    const isHost = room.hostId === player.id;

    room.players.push({
      ...player,
      isReady: isHost, // 방장은 항상 준비 상태
      team,
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

  changeTeam(roomId: string, initiatorId: number, targetPlayerId: number) {
    const room = this.getRoom(roomId);
    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);

    if (!targetPlayer) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }

    // 권한 체크: 본인이거나 방장이어야 함
    if (initiatorId !== targetPlayerId && room.hostId !== initiatorId) {
      throw new Error('권한이 없습니다.');
    }

    // 팀 변경 (토글)
    targetPlayer.team = targetPlayer.team === 'red' ? 'blue' : 'red';

    return room;
  }
}
