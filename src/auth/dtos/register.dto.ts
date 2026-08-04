import { IsEmail, IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  hashed_password: string;
}