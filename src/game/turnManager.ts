import { CurrentTurn } from '@/game/types';

/** 턴 관리자 인터페이스 */
export interface TurnManager {
  currentTurn: CurrentTurn;
  nextTurn(): CurrentTurn;
}

export class TurnManagerImpl implements TurnManager {
  /**
   * 턴 순환 사이클
   */
  private readonly cycle: CurrentTurn[];

  /** 현재 사이클 인덱스 */
  private index: number = 0;

  /** 현재 턴 정보 (public 접근 가능) */
  public currentTurn: CurrentTurn;

  constructor(options: { isHandicap: boolean }) {
    if (options.isHandicap) {
      // 접바둑: 백1 -> 흑1 -> 백2 -> 흑2
      this.cycle = [
        { stoneColor: 'white', playerIndex: 0 },
        { stoneColor: 'black', playerIndex: 0 },
        { stoneColor: 'white', playerIndex: 1 },
        { stoneColor: 'black', playerIndex: 1 },
      ];
    } else {
      // 호선: 흑1 -> 백1 -> 흑2 -> 백2
      this.cycle = [
        { stoneColor: 'black', playerIndex: 0 },
        { stoneColor: 'white', playerIndex: 0 },
        { stoneColor: 'black', playerIndex: 1 },
        { stoneColor: 'white', playerIndex: 1 },
      ];
    }

    this.updateCurrentTurn();
  }

  /**
   * 다음 턴으로 전환하고 턴 정보를 반환합니다.
   */
  nextTurn(): CurrentTurn {
    this.index = (this.index + 1) % this.cycle.length;
    this.updateCurrentTurn();
    return this.currentTurn;
  }

  private updateCurrentTurn() {
    // 객체 참조를 복사하여 할당 (안전성 확보)
    this.currentTurn = { ...this.cycle[this.index] };
  }
}
