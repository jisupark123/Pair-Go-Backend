import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeHostDto {
  @ApiProperty({ description: '방장이 될 유저의 닉네임', example: 'User1' })
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
