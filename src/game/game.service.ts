import { Board, Coordinate, Game, MoveProcessorFactory, SequenceHistory, type StoneColor } from '@dodagames/go';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Server } from 'socket.io';

import { GameInstance, GameResult, SerializedGameInstance } from '@/game/game.interface';
import { TurnManagerImpl } from '@/game/turnManager';
import { Room } from '@/rooms/rooms.interface';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private games: Map<string, GameInstance> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private server: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  createGame(room: Room): GameInstance {
    if (this.games.has(room.id)) {
      throw new Error('이미 진행 중인 게임이 있습니다.');
    }

    const basicTimeMs = parseInt(room.settings.basicTime, 10) * 60 * 1000;
    const byoyomiTimeMs = parseInt(room.settings.byoyomiTime, 10) * 1000;
    const byoyomiPeriods = parseInt(room.settings.byoyomiPeriods, 10);

    const timeControlConfig = {
      remainingBasicTimeMs: basicTimeMs,
      remainingByoyomiTimeMs: byoyomiTimeMs,
      remainingByoyomiPeriods: byoyomiPeriods,
    };

    const redPlayers = room.players.filter((p) => p.team === 'red');
    const bluePlayers = room.players.filter((p) => p.team === 'blue');

    const isRedBlack = Math.random() < 0.5;

    // 접바둑(handicap)이 있고 0이 아니면 백이 먼저 둠
    const handicap = parseInt(room.settings.handicap, 10);
    const isHandicapGame = !isNaN(handicap) && handicap > 0;

    const turnManager = new TurnManagerImpl({ isHandicap: isHandicapGame });

    const newGame: GameInstance = {
      id: room.id,
      players: [...room.players],
      settings: { ...room.settings },
      teams: [
        {
          teamColor: isRedBlack ? 'red' : 'blue',
          stoneColor: isRedBlack ? 'BLACK' : 'WHITE',
          players: [
            { data: isRedBlack ? redPlayers[0] : bluePlayers[0], index: 0 },
            { data: isRedBlack ? redPlayers[1] : bluePlayers[1], index: 1 },
          ],
          timeControl: { ...timeControlConfig },
        },
        {
          teamColor: isRedBlack ? 'blue' : 'red',
          stoneColor: isRedBlack ? 'WHITE' : 'BLACK',
          players: [
            { data: isRedBlack ? bluePlayers[0] : redPlayers[0], index: 0 },
            { data: isRedBlack ? bluePlayers[1] : redPlayers[1], index: 1 },
          ],
          timeControl: { ...timeControlConfig },
        },
      ],
      turnManager,
      get currentTurn() {
        return this.turnManager.currentTurn;
      },
      startedAt: new Date(),
      lastMoveTime: Date.now(),
      gameData: new Game(
        SequenceHistory.fromInitialBoard(new Board(19)),
        'BLACK',
        handicap,
        0,
        0,
        MoveProcessorFactory.standardRule(),
      ),
    };
    this.games.set(room.id, newGame);
    this.startTimer(newGame.id);
    return newGame;
  }

  processMove(gameId: string, socketId: string, y: number, x: number): GameInstance | null {
    const gameInstance = this.getGame(gameId);

    const { stoneColor, playerIndex } = gameInstance.currentTurn;
    const currentTeam = gameInstance.teams.find((t) => t.stoneColor === stoneColor);

    if (!currentTeam) {
      return null;
    }

    const currentPlayer = currentTeam.players[playerIndex];

    if (currentPlayer.data.socketId !== socketId) {
      return null;
    }

    const newGameData = gameInstance.gameData.playMove(new Coordinate(y, x));
    if (!newGameData) {
      return null;
    }

    const now = Date.now();
    const elapsed = now - gameInstance.lastMoveTime;

    // 시간 업데이트
    this.updateTime(gameInstance, elapsed);

    // 기존 타이머 제거
    this.clearTimer(gameId);

    gameInstance.gameData = newGameData;
    this.switchTurn(gameId);

    // 다음 턴 시간 기록 및 타이머 시작
    gameInstance.lastMoveTime = Date.now();
    this.startTimer(gameId);

    return gameInstance;
  }

  /**
   * 다음 턴으로 넘기는 로직
   */
  switchTurn(gameId: string): GameInstance {
    const game = this.getGame(gameId);
    game.turnManager.nextTurn();
    return game;
  }

  getGame(roomId: string): GameInstance {
    const game = this.games.get(roomId);
    if (!game) {
      throw new NotFoundException('진행 중인 게임을 찾을 수 없습니다.');
    }
    return game;
  }

  /**
   * 프론트엔드로 전송하기 위해 GameInstance를 직렬화합니다.
   * turnManager는 제외되고, gameData는 JSON으로 변환됩니다.
   */
  serializeGame(game: GameInstance): SerializedGameInstance {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { turnManager, gameData, ...rest } = game;
    return {
      ...rest,
      gameData: gameData.toJSON(),
      currentTurn: game.currentTurn,
    };
  }

  // 기권 처리
  resign(gameId: string, socketId: string) {
    const game = this.games.get(gameId);
    if (!game) return;

    // 기권 요청한 플레이어 찾기
    let resignedColor: StoneColor | null = null;

    for (const team of game.teams) {
      const player = team.players.find((p) => p.data.socketId === socketId);
      if (player) {
        resignedColor = team.stoneColor;
        break;
      }
    }

    if (!resignedColor) {
      // 게임에 참여하지 않은 플레이어의 요청은 무시 or 에러
      return;
    }

    const winner: StoneColor = resignedColor === 'BLACK' ? 'WHITE' : 'BLACK';
    const result: GameResult = {
      type: 'Resignation',
      winner: winner === 'BLACK' ? 'BLACK' : 'WHITE',
    };

    this.endGame(gameId, result);
  }

  // 게임 종료 시 호출
  endGame(roomId: string, result?: GameResult) {
    this.clearTimer(roomId);
    if (result) {
      this.logger.log(`[Game] Emitting gameEnded event for room ${roomId}: ${JSON.stringify(result)}`);
      this.server.to(roomId).emit('gameEnded', result);
    }
    this.games.delete(roomId);
  }

  updateGamePlayerSocket(roomId: string, userId: number, newSocketId: string) {
    const game = this.games.get(roomId);
    if (!game) return; // 진행 중인 게임이 없으면 무시

    // teams 안에 있는 players 정보 업데이트
    game.teams.forEach((team) => {
      team.players.forEach((player) => {
        if (player.data.id === userId) {
          player.data.socketId = newSocketId;
        }
      });
    });

    // 전체 players 리스트도 업데이트 (참조용)
    const playerInList = game.players.find((p) => p.id === userId);
    if (playerInList) {
      playerInList.socketId = newSocketId;
    }
  }

  /**
   * 턴 시작 시 타이머(데드라인)를 설정합니다.
   *
   * @param gameId - 게임 ID
   * @description
   * 현재 턴 플레이어의 남은 시간(기본 시간 또는 초읽기 시간)만큼 `setTimeout`을 설정합니다.
   * 타이머가 만료되면 `handleTimeout`이 호출되어 초읽기 차감 또는 시간패 처리를 수행합니다.
   * 이 메서드는 매초 호출되는 것이 아니라, 턴이 바뀔 때 한 번만 호출되므로 리소스 효율적입니다.
   */
  private startTimer(gameId: string) {
    this.clearTimer(gameId);
    const game = this.games.get(gameId);
    if (!game) return;

    const { stoneColor } = game.currentTurn;
    const team = game.teams.find((t) => t.stoneColor === stoneColor);

    const { timeControl } = team!;

    let duration = 0;
    let type: 'BASIC' | 'BYOYOMI' = 'BASIC';

    if (timeControl.remainingBasicTimeMs > 0) {
      duration = timeControl.remainingBasicTimeMs;
      type = 'BASIC';
    } else {
      duration = timeControl.remainingByoyomiTimeMs;
      type = 'BYOYOMI';
    }

    const timer = setTimeout(() => {
      this.handleTimeout(gameId, type);
    }, duration);

    this.timers.set(gameId, timer);
  }

  /**
   * 설정된 타이머를 취소합니다.
   *
   * @param gameId - 게임 ID
   * @description
   * 플레이어가 착수하거나 게임이 종료될 때 타이머를 정리하여 불필요한 이벤트 발생을 막습니다.
   */
  private clearTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId));
      this.timers.delete(gameId);
    }
  }

  /**
   * 타이머 만료(시간 초과) 시 호출되는 핸들러입니다.
   *
   * @param gameId - 게임 ID
   * @param type - 만료된 시간의 종류 ('BASIC': 기본 시간, 'BYOYOMI': 초읽기)
   * @description
   * 1. 기본 시간 종료 시: 초읽기 모드로 전환하고 다시 타이머를 시작합니다.
   * 2. 초읽기 종료 시: 초읽기 횟수를 차감합니다. 횟수가 0이 되면 시간패 처리합니다.
   * 3. 상태 변경 후 클라이언트에게 최신 게임 정보를 전송합니다.
   */
  private handleTimeout(gameId: string, type: 'BASIC' | 'BYOYOMI') {
    const game = this.games.get(gameId);
    if (!game) return;

    const { stoneColor } = game.currentTurn;
    const team = game.teams.find((t) => t.stoneColor === stoneColor);

    const { timeControl } = team!;

    if (type === 'BASIC') {
      timeControl.remainingBasicTimeMs = 0;

      // 초읽기로 전환됨을 알림 (사운드 재생용)
      const payload = {
        stoneColor,
        playerIndex: game.currentTurn.playerIndex,
      };
      this.logger.log(`[Game] Emitting byoyomiStart for room ${gameId}: ${JSON.stringify(payload)}`);
      this.server.to(gameId).emit('byoyomiStart', payload);
    } else {
      timeControl.remainingByoyomiPeriods -= 1;
      if (timeControl.remainingByoyomiPeriods <= 0) {
        // 시간패 처리
        const winner: StoneColor = stoneColor === 'BLACK' ? 'WHITE' : 'BLACK';
        const result: GameResult = {
          type: 'TimeWin',
          winner: winner === 'BLACK' ? 'BLACK' : 'WHITE',
        };
        this.endGame(gameId, result);
        return;
      }

      // 초읽기 횟수 차감 알림
      const payload = {
        stoneColor,
        playerIndex: game.currentTurn.playerIndex,
        remainingByoyomiPeriods: timeControl.remainingByoyomiPeriods,
      };
      this.logger.log(`[Game] Emitting byoyomiPeriodUsed for room ${gameId}: ${JSON.stringify(payload)}`);
      this.server.to(gameId).emit('byoyomiPeriodUsed', payload);
    }

    // 시간 기준점 갱신 (클라이언트 동기화용)
    game.lastMoveTime = Date.now();

    // 상태 업데이트 전송
    // 로그는 너무 빈번할 수 있으므로 디버그 레벨이나 생략 가능하지만, 중요 이벤트(시간 초과) 직후이므로 찍음
    this.logger.log(`[Game] Emitting timeUpdate (after timeout) for room ${gameId}`);
    this.server.to(gameId).emit('timeUpdate', this.serializeGame(game));

    // 다음 타이머 시작 (초읽기 등)
    this.startTimer(gameId);
  }

  /**
   * 착수 시 소요된 시간을 계산하여 남은 시간에 반영합니다.
   *
   * @param game - 게임 인스턴스
   * @param elapsed - 경과 시간 (ms)
   * @description
   * - 기본 시간(Basic Time)이 남아있다면 경과 시간만큼 차감합니다.
   * - 초읽기(Byoyomi) 상태에서는 시간 차감을 하지 않습니다. (초읽기는 기간 내 착수 여부만 중요함)
   * @note
   * 클라이언트가 보낸 시간이 아니라, 서버의 마지막 착수 시점(`lastMoveTime`)과 현재 시간(`Date.now()`)의 차이를 사용하여 계산합니다.
   */
  private updateTime(game: GameInstance, elapsed: number) {
    const { stoneColor } = game.currentTurn;
    const team = game.teams.find((t) => t.stoneColor === stoneColor);
    if (!team) return;

    const tc = team.timeControl;

    if (tc.remainingBasicTimeMs > 0) {
      tc.remainingBasicTimeMs -= elapsed;
      if (tc.remainingBasicTimeMs < 0) {
        tc.remainingBasicTimeMs = 0;
      }
    }
    // 초읽기 상태에서는 시간 차감이 아니라 기간 내 착수 여부만 중요하므로 별도 차감 없음
  }
}
