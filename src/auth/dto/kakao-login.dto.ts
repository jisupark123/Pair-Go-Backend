import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoLoginDto {
  @ApiProperty({
    description: 'Kakao Auth Code received from frontend',
    example: 'auth_code_from_kakao',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
