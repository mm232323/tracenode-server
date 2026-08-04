import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class OAuthUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}