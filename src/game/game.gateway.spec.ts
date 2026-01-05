import { Move } from '@dodagames/go';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

import { GameAiService } from '@/game/ai/game-ai.service';
import { GameGateway } from '@/game/game.gateway';
import { GameInstance } from '@/game/game.interface';
import { GameService } from '@/game/game.service';
import { Player } from '@/rooms/rooms.interface';

// Mock Data
const mockHumanPlayer: Player = {
  id: 1,
  nickname: 'Human',
  socketId: 'socket-human',
  deviceType: 'desktop',
  isReady: true,
  team: 'red',
  isAi: false,
};

const mockAiPlayer: Player = {
  id: 2,
  nickname: 'AI',
  socketId: 'socket-ai',
  deviceType: 'desktop',
  isReady: true,
  team: 'blue',
  isAi: true,
};

const mockGameId = 'game-123';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let gameAiService: GameAiService;
  let server: Server;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: GameService,
          useValue: {
            processMove: jest.fn(),
            serializeGame: jest.fn(() => ({})),
          },
        },
        {
          provide: GameAiService,
          useValue: {
            provideMove: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);
    gameAiService = module.get<GameAiService>(GameAiService);

    // Mock Server
    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;
    gateway.server = server;
  });

  it('게이트웨이가 정의되어 있어야 함', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleMove (착수)', () => {
    const payload = { gameId: mockGameId, x: 0, y: 0 };
    const client = { id: mockHumanPlayer.socketId } as Socket;

    it('유효한 착수 요청 시 게임 상태를 업데이트하고 브로드캐스트해야 함', async () => {
      // Given
      const mockGame = {
        id: mockGameId,
        currentTurn: { stoneColor: 'BLACK', playerIndex: 0 },
        teams: [
          {
            stoneColor: 'BLACK',
            players: [{ data: mockHumanPlayer, index: 0 }],
          },
        ],
      } as unknown as GameInstance;

      jest.spyOn(gameService, 'processMove').mockReturnValue(mockGame);

      // When
      await gateway.handleMove(client, payload);

      // Then
      expect(gameService.processMove).toHaveBeenCalledWith(mockGameId, client.id, payload.y, payload.x);
      expect(server.to).toHaveBeenCalledWith(mockGameId);
      expect(server.emit).toHaveBeenCalledWith('moveMade', expect.anything());
    });

    it('잘못된 착수 요청(null 반환) 시 아무것도 하지 않아야 함', async () => {
      // Given
      jest.spyOn(gameService, 'processMove').mockReturnValue(null);

      // When
      await gateway.handleMove(client, payload);

      // Then
      expect(gameService.processMove).toHaveBeenCalled();
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('다음 턴이 AI인 경우, AI가 자동으로 착수해야 함', async () => {
      // Given
      // 1. 사람 착수 후 상태: 다음 턴은 AI (WHITE)
      const gameAfterHumanMove = {
        id: mockGameId,
        currentTurn: { stoneColor: 'WHITE', playerIndex: 0 },
        teams: [
          {
            stoneColor: 'BLACK',
            players: [{ data: mockHumanPlayer, index: 0 }],
          },
          {
            stoneColor: 'WHITE',
            players: [{ data: mockAiPlayer, index: 0 }],
          },
        ],
        gameData: {}, // Mock
      } as unknown as GameInstance;

      // 2. AI 착수 후 상태: 다음 턴은 다시 Human (BLACK)
      const gameAfterAiMove = {
        ...gameAfterHumanMove,
        currentTurn: { stoneColor: 'BLACK', playerIndex: 0 },
      } as unknown as GameInstance;

      // Mock Setup
      // 첫 번째 human move 호출에 대한 응답
      (gameService.processMove as jest.Mock).mockReturnValueOnce(gameAfterHumanMove);
      // AI move 제공
      (gameAiService.provideMove as jest.Mock).mockResolvedValue({ x: 1, y: 1 } as Move);
      // 두 번째 AI move 호출에 대한 응답
      (gameService.processMove as jest.Mock).mockReturnValueOnce(gameAfterAiMove);

      // When
      await gateway.handleMove(client, payload);

      // Then
      // 1. Human move processed
      expect(gameService.processMove).toHaveBeenNthCalledWith(1, mockGameId, client.id, payload.y, payload.x);
      // 2. AI logic triggered
      expect(gameAiService.provideMove).toHaveBeenCalled();
      // 3. AI move processed (using AI socket ID)
      expect(gameService.processMove).toHaveBeenNthCalledWith(2, mockGameId, mockAiPlayer.socketId, 1, 1);
      // 4. Updates emitted twice (Human move + AI move)
      expect(server.emit).toHaveBeenCalledTimes(2);
    });

    it('연속된 AI 턴이 있는 경우(예: AI vs AI) 반복해서 착수해야 함', async () => {
      // Given
      const aiPlayer1 = { ...mockAiPlayer, id: 2, socketId: 'ai-1', team: 'blue' };
      const aiPlayer2 = { ...mockAiPlayer, id: 3, socketId: 'ai-2', team: 'red' }; // 가정: 어떤 이유로 연속 AI

      // 상황: Human 착수 -> Next: AI1 -> Next: AI2 -> Next: Human

      // 1. Human Move Result -> Turn: AI1
      const gameState1 = {
        id: mockGameId,
        currentTurn: { stoneColor: 'WHITE', playerIndex: 0 },
        teams: [
          { stoneColor: 'BLACK', players: [{ data: mockHumanPlayer }] },
          { stoneColor: 'WHITE', players: [{ data: aiPlayer1 }] },
        ],
        gameData: {},
      } as unknown as GameInstance;

      // 2. AI1 Move Result -> Turn: AI2 (가정된 시나리오)
      // 실제 바둑에선 흑백 교대지만, 팀원 간 교대나 로직 테스트를 위해 강제 설정
      const gameState2 = {
        ...gameState1,
        currentTurn: { stoneColor: 'BLACK', playerIndex: 1 }, // 흑팀의 다른 AI라고 가정
        teams: [
          { stoneColor: 'BLACK', players: [{ data: mockHumanPlayer }, { data: aiPlayer2 }] },
          { stoneColor: 'WHITE', players: [{ data: aiPlayer1 }] },
        ],
      } as unknown as GameInstance;

      // 3. AI2 Move Result -> Turn: Human
      const gameState3 = {
        ...gameState2,
        currentTurn: { stoneColor: 'BLACK', playerIndex: 0 }, // 다시 Human
      } as unknown as GameInstance;

      // Mocks
      (gameService.processMove as jest.Mock)
        .mockReturnValueOnce(gameState1) // Human Result
        .mockReturnValueOnce(gameState2) // AI1 Result
        .mockReturnValueOnce(gameState3); // AI2 Result

      (gameAiService.provideMove as jest.Mock)
        .mockResolvedValueOnce({ y: 1, x: 1 }) // AI1 Move
        .mockResolvedValueOnce({ y: 2, x: 2 }); // AI2 Move

      // When
      await gateway.handleMove(client, payload);

      // Then
      expect(gameService.processMove).toHaveBeenCalledTimes(3);
      // Call 1: Human
      // Call 2: AI1
      expect(gameService.processMove).toHaveBeenNthCalledWith(2, mockGameId, aiPlayer1.socketId, 1, 1);
      // Call 3: AI2
      expect(gameService.processMove).toHaveBeenNthCalledWith(3, mockGameId, aiPlayer2.socketId, 2, 2);

      expect(server.emit).toHaveBeenCalledTimes(3);
    });

    it('다음 턴이 사람이면 AI 로직이 중단되어야 함', async () => {
      // Given
      const gameAfterHumanMove = {
        id: mockGameId,
        currentTurn: { stoneColor: 'BLACK', playerIndex: 1 }, // 다음은 같은 팀의 다른 사람이라고 가정
        teams: [
          {
            stoneColor: 'BLACK',
            players: [
              { data: mockHumanPlayer, index: 0 }, // Me (Current)
              { data: { ...mockHumanPlayer, id: 3, socketId: 'human-2' }, index: 1 }, // Next Human
            ],
          },
        ],
      } as unknown as GameInstance;

      (gameService.processMove as jest.Mock).mockReturnValue(gameAfterHumanMove);

      // When
      await gateway.handleMove(client, payload);

      // Then
      expect(gameService.processMove).toHaveBeenCalledTimes(1); // Only initial move
      expect(gameAiService.provideMove).not.toHaveBeenCalled();
      expect(server.emit).toHaveBeenCalledTimes(1);
    });
  });
});
