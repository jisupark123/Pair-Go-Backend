import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { User, AuthProvider, Prisma } from '@prisma/client';

import { generateRandomNickname } from '@/common/utils/nickname.util';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 소셜 ID와 인증 제공자(Kakao, Google 등)를 기반으로 사용자를 찾습니다.
   * 복합 유니크 키(socialId + authProvider)를 사용합니다.
   *
   * @param socialId 소셜 로그인 제공자로부터 받은 고유 ID
   * @param authProvider 인증 제공자 타입 (enum)
   * @returns 사용자 객체 또는 null
   */
  async findBySocialId(socialId: string, authProvider: AuthProvider): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        socialId_authProvider: {
          socialId,
          authProvider,
        },
      },
    });
  }

  /**
   * 랜덤하고 고유한 닉네임을 생성하여 새로운 사용자를 생성합니다.
   * 닉네임 중복 시 최대 5회까지 재시도합니다.
   *
   * @param details 사용자 생성에 필요한 필수 정보 (socialId, authProvider, email 등)
   * @returns 생성된 사용자 객체
   * @throws BadRequestException 5회 재시도 후에도 고유 닉네임 생성 실패 시
   */
  async createWithRandomNickname(details: Partial<User>): Promise<User> {
    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const randomNickname = generateRandomNickname();

        return await this.prisma.user.create({
          data: {
            socialId: details.socialId!,
            authProvider: details.authProvider!,
            nickname: randomNickname,
            email: details.email,
          },
        });
      } catch (error) {
        // P2002: Unique constraint violation Code
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (error.meta?.target as string[])?.includes('nickname')
        ) {
          retryCount++;
          continue;
        }
        throw new InternalServerErrorException('사용자 생성 중 알 수 없는 오류가 발생했습니다.');
      }
    }

    throw new BadRequestException('닉네임 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  /**
   * 사용자 ID로 사용자 정보를 조회합니다.
   * 친구 목록(friends)을 포함하여 반환합니다.
   *
   * @param id 사용자 ID (PK)
   * @returns 친구 정보가 포함된 사용자 객체 또는 null
   */
  async findOne(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        friends: true, // 친구 관계 포함 (Depth 1: 친구의 친구 정보는 포함되지 않음)
      },
    });
  }

  /**
   * 사용자의 닉네임을 변경합니다.
   * 이미 존재하는 닉네임일 경우 예외를 발생시킵니다.
   *
   * @param id 사용자 ID
   * @param nickname 변경할 새 닉네임
   * @returns 업데이트된 사용자 객체
   * @throws BadRequestException 이미 존재하는 닉네임일 경우
   */
  async updateNickname(id: number, nickname: string): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { nickname },
    });

    if (existingUser) {
      throw new BadRequestException('이미 존재하는 닉네임입니다.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { nickname },
    });
  }
}
