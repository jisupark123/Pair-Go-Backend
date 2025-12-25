import { ApiProperty } from '@nestjs/swagger';
import { User as PrismaUser, AuthProvider } from '@prisma/client';

export class User implements PrismaUser {
  @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
  id: number;

  @ApiProperty({ example: 'JohnDoe', description: 'The nickname of the user', nullable: true })
  nickname: string;

  @ApiProperty({ example: 'john@example.com', description: 'The email of the user', nullable: true })
  email: string | null;

  @ApiProperty({ example: '1234567890', description: 'The social ID of the user' })
  socialId: string;

  @ApiProperty({ example: 'kakao', description: 'The provider of the social account', enum: AuthProvider })
  authProvider: AuthProvider;

  @ApiProperty({ description: 'The date and time when the user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date and time when the user was last updated' })
  updatedAt: Date;
}
