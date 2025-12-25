import { Injectable } from '@nestjs/common';
import { User, AuthProvider } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(details: Partial<User>): Promise<User> {
    return this.prisma.user.create({
      data: {
        socialId: details.socialId!,
        authProvider: details.authProvider!,
        nickname: details.nickname,
        email: details.email,
      },
    });
  }

  async findOne(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
