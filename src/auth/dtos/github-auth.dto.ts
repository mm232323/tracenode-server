import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GithubAuthDto {
  @IsString()
  @IsNotEmpty()
  githubId: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  avatarImg?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;
}
