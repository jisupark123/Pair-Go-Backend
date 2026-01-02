import { Board, Coordinate, Game, MoveProcessorFactory, SequenceHistory } from '@dodagames/go';
import { Injectable, NotFoundException } from '@nestjs/common';

import { GameInstance, SerializedGameInstance } from '@/game/game.interface';
import { TurnManagerImpl } from '@/game/turnManager';
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

    const newGame = gameInstance.gameData.playMove(new Coordinate(y, x));

    if (!newGame) {
      return null;
    }

    gameInstance.gameData = newGame;
    this.switchTurn(gameId);

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

  // 게임 종료 시 호출
  endGame(roomId: string) {
    this.games.delete(roomId);
  }
}
