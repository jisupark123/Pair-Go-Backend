import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddFriendDto {
  @ApiProperty({ example: '행복한바둑돌', description: '친구로 추가할 사용자의 닉네임' })
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
