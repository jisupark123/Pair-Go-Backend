import { Board, SequenceHistory } from '@dodagames/go';
import { Injectable } from '@nestjs/common';

import { TurnManagerImpl } from '@/game/turnManager';
import { GameInstance } from '@/game/types';
import { Room } from '@/rooms/rooms.interface';

@Injectable()
export class GameService {
  private games: Map<string, GameInstance> = new Map();

  createGame(room: Room): GameInstance {
    if (this.games.has(room.id)) {
      throw new Error('이미 진행 중인 게임이 있습니다.');
    }

    const basicTimeMs = parseInt(room.settings.basicTime, 10) * 60 * 1000;
    const countdownMs = parseInt(room.settings.countdownTime, 10) * 1000;
    const countdownCount = parseInt(room.settings.countdownCount, 10);

    const timeControlConfig = {
      remainingBasicTimeMs: basicTimeMs,
      remainingCountdownTimeMs: countdownMs,
      remainingCountdownCount: countdownCount,
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
          stoneColor: isRedBlack ? 'black' : 'white',
          players: [
            { data: isRedBlack ? redPlayers[0] : bluePlayers[0], index: 0 },
            { data: isRedBlack ? redPlayers[1] : bluePlayers[1], index: 1 },
          ],
          capturedStoneCount: 0,
          timeControl: { ...timeControlConfig },
        },
        {
          teamColor: isRedBlack ? 'blue' : 'red',
          stoneColor: isRedBlack ? 'white' : 'black',
          players: [
            { data: isRedBlack ? bluePlayers[0] : redPlayers[0], index: 0 },
            { data: isRedBlack ? bluePlayers[1] : redPlayers[1], index: 1 },
          ],
          capturedStoneCount: 0,
          timeControl: { ...timeControlConfig },
        },
      ],
      turnManager,
      get currentTurn() {
        return this.turnManager.currentTurn;
      },
      startedAt: new Date(),
      sequenceHistory: SequenceHistory.fromInitialBoard(new Board(19)),
    };

    this.games.set(room.id, newGame);
    return newGame;
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
      throw new Error('진행 중인 게임을 찾을 수 없습니다.');
    }
    return game;
  }

  // 게임 종료 시 호출
  endGame(roomId: string) {
    this.games.delete(roomId);
  }
}
