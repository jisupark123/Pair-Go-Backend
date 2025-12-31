import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateRoomDto } from '@/rooms/dto/create-room.dto';
import { DeviceType, Room } from '@/rooms/rooms.interface';
import { RoomsService } from '@/rooms/rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('서비스가 정의되어 있어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom (방 생성)', () => {
    it('올바른 방장과 설정으로 새 방을 생성해야 함', () => {
      const hostId = 1;
      const dto: CreateRoomDto = {
        handicap: 'none',
        komi: '6.5',
        stoneColorMethod: 'auto',
        basicTime: '30m',
        countdownTime: '30s',
        countdownCount: '3',
      };

      const room = service.createRoom(hostId, dto);

      expect(room).toBeDefined();
      expect(room.hostId).toBe(hostId);
      expect(room.players).toEqual([]);
      expect(room.createdAt).toBeInstanceOf(Date);
    });

    it('6자리 길이의 nanoid ID를 생성해야 함', () => {
      const room = service.createRoom(1, {} as CreateRoomDto);
      expect(room.id).toHaveLength(6);
      expect(typeof room.id).toBe('string');
    });

    it('생성된 방을 Map에 저장해야 함', () => {
      const room = service.createRoom(1, {} as CreateRoomDto);
      const retrieved = service.getRoom(room.id);
      expect(retrieved).toBe(room);
    });
  });

  describe('getRoom (방 조회)', () => {
    it('방이 존재하면 해당 방 정보를 반환해야 함', () => {
      const room = service.createRoom(1, {} as CreateRoomDto);
      expect(service.getRoom(room.id)).toBe(room);
    });

    it('방이 존재하지 않으면 NotFoundException을 던져야 함', () => {
      expect(() => service.getRoom('invalid')).toThrow(NotFoundException);
    });
  });

  describe('addPlayerToRoom (플레이어 입장)', () => {
    let roomId: string;
    const hostId = 1;

    beforeEach(() => {
      const room = service.createRoom(hostId, {} as CreateRoomDto);
      roomId = room.id;
    });

    it('방이 가득 차지 않았으면 플레이어를 추가해야 함', () => {
      const player = { id: 1, nickname: 'Host', socketId: 's1', deviceType: 'desktop' as DeviceType };
      const room = service.addPlayerToRoom(roomId, player);

      expect(room.players).toHaveLength(1);
      expect(room.players[0].id).toBe(player.id);
    });

    it('방장이면 준비 상태(isReady)가 true로 설정되어야 함', () => {
      const player = { id: hostId, nickname: 'Host', socketId: 's1', deviceType: 'desktop' as DeviceType };
      const room = service.addPlayerToRoom(roomId, player);
      expect(room.players[0].isReady).toBe(true);
    });

    it('방장이 아니면 준비 상태(isReady)가 false로 설정되어야 함', () => {
      // 먼저 방장 추가
      service.addPlayerToRoom(roomId, {
        id: hostId,
        nickname: 'Host',
        socketId: 's1',
        deviceType: 'desktop' as DeviceType,
      });

      // 일반 플레이어 추가
      const guest = { id: 2, nickname: 'Guest', socketId: 's2', deviceType: 'mobile' as DeviceType };
      const room = service.addPlayerToRoom(roomId, guest);

      const addedGuest = room.players.find((p) => p.id === 2);
      expect(addedGuest?.isReady).toBe(false);
    });

    it('이미 4명이 있으면 에러를 던져야 함', () => {
      for (let i = 1; i <= 4; i++) {
        service.addPlayerToRoom(roomId, {
          id: i,
          nickname: `User${i}`,
          socketId: `s${i}`,
          deviceType: 'desktop' as DeviceType,
        });
      }

      expect(() => {
        service.addPlayerToRoom(roomId, {
          id: 5,
          nickname: 'User5',
          socketId: 's5',
          deviceType: 'desktop' as DeviceType,
        });
      }).toThrow('방이 가득 찼습니다.');
    });

    it('이미 입장한 유저 ID인 경우 에러를 던져야 함', () => {
      service.addPlayerToRoom(roomId, {
        id: 1,
        nickname: 'User1',
        socketId: 's1',
        deviceType: 'desktop' as DeviceType,
      });
      expect(() => {
        service.addPlayerToRoom(roomId, {
          id: 1,
          nickname: 'User1',
          socketId: 's2',
          deviceType: 'desktop' as DeviceType,
        });
      }).toThrow('이미 방에 참가 중입니다.');
    });

    it('팀 인원을 자동으로 균형 있게 배정해야 함', () => {
      service.addPlayerToRoom(roomId, {
        id: 1,
        nickname: 'P1',
        socketId: 's1',
        deviceType: 'desktop' as DeviceType,
      });
      service.addPlayerToRoom(roomId, {
        id: 2,
        nickname: 'P2',
        socketId: 's2',
        deviceType: 'desktop' as DeviceType,
      });

      // 수동으로 팀을 조작하여 2v1 상황 시뮬레이션
      const room = service.getRoom(roomId);
      room.players = [
        { id: 10, nickname: 'A', socketId: 'sa', isReady: true, team: 'red', deviceType: 'desktop' as DeviceType },
        { id: 11, nickname: 'B', socketId: 'sb', isReady: true, team: 'red', deviceType: 'desktop' as DeviceType },
      ];

      // 다음 플레이어는 반드시 블루팀이어야 함
      const r3 = service.addPlayerToRoom(roomId, {
        id: 12,
        nickname: 'C',
        socketId: 'sc',
        deviceType: 'desktop' as DeviceType,
      });
      const p3 = r3.players.find((p) => p.id === 12);
      expect(p3?.team).toBe('blue');
    });

    it('삭제 대기 중인 방에 플레이어가 입장하면 삭제가 취소되고 waiting 상태로 변경되어야 함', () => {
      jest.useFakeTimers();

      // 테스트를 위해 플레이어 추가
      service.addPlayerToRoom(roomId, { id: 1, nickname: 'Host', socketId: 's1', deviceType: 'desktop' as DeviceType });

      // 방 비우기
      service.removePlayerFromRoom(roomId, 's1'); // 여기서 deleting 상태 및 타이머 시작

      const room = service.getRoom(roomId);
      expect(room.status).toBe('deleting');

      // 4초 경과 (아직 삭제 안 됨)
      jest.advanceTimersByTime(4000);
      expect(service.getRoom(roomId)).toBeDefined();

      // 플레이어 재입장
      service.addPlayerToRoom(roomId, {
        id: 1,
        nickname: 'Host',
        socketId: 's1-new',
        deviceType: 'desktop',
      });

      const recoveredRoom = service.getRoom(roomId);
      expect(recoveredRoom.status).toBe('waiting');
      expect(recoveredRoom.players).toHaveLength(1);

      // 2초 더 경과 (총 6초 -> 취소 안 됐으면 삭제되었을 시간)
      jest.advanceTimersByTime(2000);
      expect(service.getRoom(roomId)).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('removePlayerFromRoom (플레이어 퇴장)', () => {
    let roomId: string;
    const hostId = 1;

    beforeEach(() => {
      roomId = service.createRoom(hostId, {} as CreateRoomDto).id;
      service.addPlayerToRoom(roomId, {
        id: hostId,
        nickname: 'Host',
        socketId: 's1',
        deviceType: 'desktop' as DeviceType,
      });
      service.addPlayerToRoom(roomId, {
        id: 2,
        nickname: 'Guest',
        socketId: 's2',
        deviceType: 'desktop' as DeviceType,
      });
    });

    it('플레이어 목록에서 해당 유저를 제거해야 함', () => {
      service.removePlayerFromRoom(roomId, 's2');
      const room = service.getRoom(roomId);
      expect(room.players).toHaveLength(1);
      expect(room.players.find((p) => p.id === 2)).toBeUndefined();
    });

    it('남은 인원이 있으면 업데이트된 방 정보를 반환해야 함', () => {
      const result = service.removePlayerFromRoom(roomId, 's2');
      expect(result).toBeDefined();
      expect(result?.players).toHaveLength(1);
    });

    it('마지막 인원이 퇴장하면 방을 삭제 대기 상태로 변경하고, 시간이 지나면 삭제해야 함', () => {
      jest.useFakeTimers();
      service.removePlayerFromRoom(roomId, 's2');
      const result = service.removePlayerFromRoom(roomId, 's1');

      // 즉시 삭제되지 않고 deleting 상태 반환
      expect(result).toBeDefined();
      expect(result?.status).toBe('deleting');
      expect(service.getRoom(roomId)).toBeDefined();

      // 5초 후 삭제 확인
      jest.advanceTimersByTime(5000);
      expect(() => service.getRoom(roomId)).toThrow(NotFoundException);

      jest.useRealTimers();
    });

    it('방장 위임: 방장이 퇴장하면 가장 먼저 들어온 사람에게 방장이 위임되어야 함', () => {
      // 초기 상태: [Host(id:1), Guest(id:2)]
      // 방장 퇴장
      const updatedRoom = service.removePlayerFromRoom(roomId, 's1');

      if (!updatedRoom) throw new Error('방 정보가 존재해야 합니다.');

      expect(updatedRoom.hostId).toBe(2); // 새로운 방장은 Guest(2)
      expect(updatedRoom.players[0].id).toBe(2);
      expect(updatedRoom.players[0].isReady).toBe(true); // 새로운 방장은 준비 완료 상태가 됨
    });
  });

  describe('updatePlayerStatus (준비 상태 변경)', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(1, {} as CreateRoomDto);
      roomId = room.id;
      service.addPlayerToRoom(roomId, { id: 1, nickname: 'Host', socketId: 's1', deviceType: 'desktop' as DeviceType });
      service.addPlayerToRoom(roomId, {
        id: 2,
        nickname: 'Guest',
        socketId: 's2',
        deviceType: 'desktop' as DeviceType,
      });
    });

    it('일반 플레이어의 준비 상태를 변경해야 함', () => {
      service.updatePlayerStatus(roomId, 's2', true);
      const room = service.getRoom(roomId);
      const guest = room.players.find((p) => p.id === 2);
      expect(guest?.isReady).toBe(true);
    });

    it('방장의 준비 상태는 false로 변경할 수 없어야 함 (항상 true)', () => {
      service.updatePlayerStatus(roomId, 's1', false);
      const room = service.getRoom(roomId);
      const host = room.players.find((p) => p.id === 1);
      expect(host?.isReady).toBe(true);
    });
  });

  describe('updateRoomSettings (방 설정 변경)', () => {
    let roomId: string;
    const hostId = 1;

    beforeEach(() => {
      roomId = service.createRoom(hostId, {} as CreateRoomDto).id;
    });

    it('방장이 요청한 경우 설정을 업데이트해야 함', () => {
      const newSettings: Room['settings'] = {
        handicap: 'none',
        komi: '6.5',
        stoneColorMethod: 'auto',
        basicTime: '30m',
        countdownTime: '30s',
        countdownCount: '3',
      };

      const room = service.updateRoomSettings(roomId, hostId, newSettings);
      expect(room.settings).toEqual(newSettings);
    });

    it('방장이 아닌 유저가 설정을 변경하려 하면 에러를 던져야 함', () => {
      expect(() => {
        service.updateRoomSettings(roomId, 999, {} as Room['settings']);
      }).toThrow('방장만 설정을 변경할 수 있습니다.');
    });
  });

  describe('changeTeam (팀 변경)', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = service.createRoom(1, {} as CreateRoomDto).id;
      service.addPlayerToRoom(roomId, { id: 1, nickname: 'Host', socketId: 's1', deviceType: 'desktop' as DeviceType });
      service.addPlayerToRoom(roomId, {
        id: 2,
        nickname: 'Guest',
        socketId: 's2',
        deviceType: 'desktop' as DeviceType,
      });
    });

    it('해당 플레이어의 팀을 토글해야 함', () => {
      const room = service.getRoom(roomId);
      const guest = room.players.find((p) => p.id === 2);
      const initialTeam = guest?.team;

      service.changeTeam(roomId, 2, 2); // 본인이 변경

      const updatedGuest = room.players.find((p) => p.id === 2);
      expect(updatedGuest?.team).not.toBe(initialTeam);
      expect(updatedGuest?.team).toMatch(/red|blue/);
    });

    it('자신의 팀을 직접 변경할 수 있어야 함', () => {
      expect(() => service.changeTeam(roomId, 2, 2)).not.toThrow();
    });

    it('방장은 다른 플레이어의 팀을 변경할 수 있어야 함', () => {
      expect(() => service.changeTeam(roomId, 1, 2)).not.toThrow();
    });

    it('권한이 없는 유저가 타인의 팀을 변경하려 하면 에러를 던져야 함', () => {
      service.addPlayerToRoom(roomId, {
        id: 3,
        nickname: 'Guest3',
        socketId: 's3',
        deviceType: 'desktop' as DeviceType,
      });
      expect(() => service.changeTeam(roomId, 2, 3)).toThrow('권한이 없습니다.'); // 일반 유저가 타인 변경 시도
    });

    it('대상이 방에 존재하지 않으면 NotFoundException을 던져야 함', () => {
      expect(() => service.changeTeam(roomId, 1, 999)).toThrow(NotFoundException);
    });
  });

  describe('kickPlayer (강제 퇴장)', () => {
    let roomId: string;
    const hostId = 1;

    beforeEach(() => {
      roomId = service.createRoom(hostId, {} as CreateRoomDto).id;
      service.addPlayerToRoom(roomId, {
        id: hostId,
        nickname: 'Host',
        socketId: 's1',
        deviceType: 'desktop' as DeviceType,
      });
      service.addPlayerToRoom(roomId, {
        id: 2,
        nickname: 'Guest',
        socketId: 's2',
        deviceType: 'desktop' as DeviceType,
      });
    });

    it('방장은 다른 플레이어를 강제 퇴장시킬 수 있어야 함', () => {
      const { room, kickedSocketId } = service.kickPlayer(roomId, hostId, 2);
      expect(kickedSocketId).toBe('s2');
      expect(room).toBeDefined();
      if (!room) throw new Error('Room should trigger'); // TS Guard
      expect(room.players.find((p) => p.id === 2)).toBeUndefined();
    });

    it('방장이 아닌 유저가 강제 퇴장을 시도하면 에러를 던져야 함', () => {
      expect(() => service.kickPlayer(roomId, 2, 1)).toThrow('방장만 강제 퇴장시킬 수 있습니다.');
    });

    it('자기 자신을 강제 퇴장시키려 하면 에러를 던져야 함', () => {
      expect(() => service.kickPlayer(roomId, hostId, hostId)).toThrow('자기 자신을 강제 퇴장시킬 수 없습니다.');
    });

    it('대상 유저가 방에 없으면 NotFoundException을 던져야 함', () => {
      expect(() => service.kickPlayer(roomId, hostId, 999)).toThrow(NotFoundException);
    });
  });
});
