import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class UpdateNicknameDto {
  @ApiProperty({
    example: '바둑왕',
    description: '변경할 닉네임 (2~6자, 한글/영문/숫자만 허용)',
    minLength: 2,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 6, { message: '닉네임은 2자 이상 6자 이하이어야 합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9]+$/, {
    message: '닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.',
  })
  nickname: string;
}
