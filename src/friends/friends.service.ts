import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async addFriend(userId: number, nickname: string): Promise<void> {
    const friend = await this.prisma.user.findUnique({
      where: { nickname },
    });

    if (!friend) {
      throw new NotFoundException('존재하지 않는 닉네임입니다.');
    }

    if (userId === friend.id) {
      throw new BadRequestException('자기 자신을 친구로 추가할 수 없습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        friends: {
          connect: { id: friend.id },
        },
      },
    });
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
    if (userId === friendId) {
      throw new BadRequestException('자기 자신을 친구 목록에서 삭제할 수 없습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        friends: {
          disconnect: { id: friendId },
        },
      },
    });
  }
}
