import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class PublicUserDto {
  @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
  id: number;

  @ApiProperty({ example: '행복한바둑돌', description: 'The nickname of the user' })
  nickname: string;

  @ApiProperty({ description: 'The date and time when the user was created' })
  createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.nickname = user.nickname;
    this.createdAt = user.createdAt;
  }
}
