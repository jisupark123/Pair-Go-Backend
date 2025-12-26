import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  handicap: string;

  @IsString()
  @IsNotEmpty()
  komi: string;

  @IsString()
  @IsIn(['auto', 'black', 'white'])
  stoneColor: 'auto' | 'black' | 'white';

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
