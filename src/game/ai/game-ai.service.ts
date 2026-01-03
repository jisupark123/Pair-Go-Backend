import { Game, Move, MoveProvider } from '@dodagames/go';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameAiService implements MoveProvider {
  /** 랜덤한 다음 수를 생성합니다 */
  async provideMove(game: Game): Promise<Move> {
    // 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { currentBoard, currentTurn } = game;
    // 좌표 목록 복사 (shuffle을 위해)
    const emptyCoords = [...currentBoard.emptyCoordinates()];

    // Fisher-Yates Shuffle
    for (let i = emptyCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyCoords[i], emptyCoords[j]] = [emptyCoords[j], emptyCoords[i]];
    }

    for (const coord of emptyCoords) {
      // playMove가 반환값이 있으면(유효한 수이면) 해당 좌표 선택
      const nextGame = game.playMove(coord);
      if (nextGame) {
        return new Move(coord.y, coord.x, currentTurn);
      }
    }
    return Move.PASS; // 둘 곳이 없으면 PASS
  }
}
