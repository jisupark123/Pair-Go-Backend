import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  handicap: string;

  @IsString()
  @IsNotEmpty()
  komi: string;

  @IsString()
  @IsIn(['auto', 'manual'])
  stoneColorMethod: 'auto' | 'manual';

  @IsString()
  @IsNotEmpty()
  basicTime: string;

  @IsString()
  @IsNotEmpty()
  countdownTime: string;

  @IsString()
  @IsNotEmpty()
  countdownCount: string;
}
