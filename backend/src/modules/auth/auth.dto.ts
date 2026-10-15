import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty() @IsEmail() @MaxLength(200) email: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) password: string;
}
export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}
