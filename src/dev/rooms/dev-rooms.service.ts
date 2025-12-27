import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { RoomsGateway } from '@/rooms/rooms.gateway';
import { DeviceType } from '@/rooms/rooms.interface';
import { RoomsService } from '@/rooms/rooms.service';

@Injectable()
export class DevRoomsService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  addVirtualPlayers(roomId: string, count: number) {
    const addedPlayers: { id: number; nickname: string; socketId: string; deviceType: DeviceType }[] = [];
    const room = this.roomsService.getRoom(roomId);

    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    for (let i = 0; i < count; i++) {
      // Generate pseudo-random/unique ID starting from a high number to avoid conflict with real users (usually < 1000 in dev)
      // Using timestamp + index ensures uniqueness for this batch
      const virtualId = Date.now() + i;
      const randomDevice: DeviceType = Math.random() < 0.33 ? 'mobile' : Math.random() < 0.66 ? 'tablet' : 'desktop';

      const player = {
        id: virtualId,
        nickname: `Bot_${nanoid(4)}`,
        socketId: `virt_sock_${nanoid(6)}`,
        deviceType: randomDevice,
      };

      try {
        this.roomsService.addPlayerToRoom(roomId, player);
        this.roomsService.updatePlayerStatus(roomId, player.socketId, true);
        addedPlayers.push(player);
      } catch (e) {
        // Stop if room is full or other error
        console.error(`Failed to add virtual player ${i}:`, e.message);
        break;
      }
    }

    // 소켓 이벤트 전송하여 클라이언트에 룸 업데이트 알림
    if (addedPlayers.length > 0) {
      this.roomsGateway.server.to(roomId).emit('roomUpdate', this.roomsService.getRoom(roomId));
    }

    return {
      message: `${addedPlayers.length}명의 가상 유저가 추가되었습니다.`,
      addedPlayers,
      currentRoomState: this.roomsService.getRoom(roomId),
    };
  }
  changeHostRandom(roomId: string) {
    const room = this.roomsService.getRoom(roomId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    const currentHostId = room.hostId;
    const eligiblePlayers = room.players.filter((p) => p.id !== currentHostId);

    if (eligiblePlayers.length === 0) {
      throw new Error('방장을 위임할 다른 플레이어가 없습니다.');
    }

    const randomPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    const updatedRoom = this.roomsService.updateHost(roomId, randomPlayer.id);

    this.roomsGateway.server.to(roomId).emit('roomUpdate', updatedRoom);

    return {
      message: `방장이 ${randomPlayer.nickname}님으로 변경되었습니다.`,
      newHost: randomPlayer,
      room: updatedRoom,
    };
  }

  changeHostByNickname(roomId: string, nickname: string) {
    const room = this.roomsService.getRoom(roomId);
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    const targetPlayer = room.players.find((p) => p.nickname === nickname);
    if (!targetPlayer) {
      throw new Error(`닉네임 '${nickname}'을 가진 유저를 찾을 수 없습니다.`);
    }

    const updatedRoom = this.roomsService.updateHost(roomId, targetPlayer.id);

    this.roomsGateway.server.to(roomId).emit('roomUpdate', updatedRoom);

    return {
      message: `방장이 ${targetPlayer.nickname}님으로 변경되었습니다.`,
      newHost: targetPlayer,
      room: updatedRoom,
    };
  }
}
