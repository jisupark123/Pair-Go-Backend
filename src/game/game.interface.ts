export { type GameResult } from '@dodagames/go';
import { Game, type StoneColor } from '@dodagames/go';

import { TurnManager } from '@/game/turnManager';
import { Player, Room, Team } from '@/rooms/rooms.interface';

/** 시간 제어 */
export interface TimeControl {
  remainingBasicTimeMs: number; // 남은 기본 시간 (ms)
  remainingByoyomiTimeMs: number; // 초읽기 시간 (ms)
  remainingByoyomiPeriods: number; // 남은 초읽기 횟수
}

/** 게임 팀 */
export interface GameTeam {
  teamColor: Team; // 팀 구분 ('red' | 'blue')
  stoneColor: StoneColor; // 돌 색상
  players: {
    data: Player;
    index: number;
  }[];
  timeControl: TimeControl; // 시간 제어 상태
}

/** 현재 턴 정보 */
export interface CurrentTurn {
  stoneColor: StoneColor; // 현재 돌 색상
  playerIndex: number; // 현재 팀 내 플레이어 인덱스 (0 또는 1)
}

/** 게임 인스턴스 */
export interface GameInstance {
  id: string; // 게임 ID (방 ID)
  players: Room['players']; // 전체 플레이어 목록
  settings: Room['settings']; // 게임 설정

  teams: GameTeam[]; // 팀 정보

  /** 턴 관리자 (순서 로직 캡슐화) */
  turnManager: TurnManager;

  get currentTurn(): CurrentTurn; // 편의를 위한 게터

  startedAt: Date; // 게임 시작 시간
  lastMoveTime: number; // 마지막 착수 시간 (시간 계산용)
  gameData: Game; // 대국 데이터
}

/** 프론트엔드 전송용 게임 인스턴스 */
export interface SerializedGameInstance extends Omit<GameInstance, 'turnManager' | 'gameData'> {
  gameData: ReturnType<Game['toJSON']>;
}
