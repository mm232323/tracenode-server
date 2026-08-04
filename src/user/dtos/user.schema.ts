import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsDate,
  IsNumber,
  MinLength,
  MaxLength,
  IsUrl,
  IsIn,
  ValidateIf,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Base User Class with validation
export class UserDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email: string | null;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @ValidateIf(o => o.username !== null && o.username !== undefined)
  username: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName: string | null;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(255)
  @ValidateIf(o => o.hashedPassword !== null && o.hashedPassword !== undefined)
  hashedPassword: string | null;

  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  avatarImg: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio: string | null;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.googleId !== null && o.googleId !== undefined)
  googleId: string | null;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.githubId !== null && o.githubId !== undefined)
  githubId: string | null;

  @IsString()
  @IsOptional()
  accessToken: string | null;

  @IsString()
  @IsOptional()
  refreshToken: string | null;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastLogin: Date | null;

  @IsNumber()
  @IsOptional()
  planId: bigint | null;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  constructor(partial: Partial<UserDto> = {}) {
    Object.assign(this, partial);
  }

  // Helper methods with validation logic
  getDisplayName(): string {
    return this.fullName || this.username || this.email || 'Unknown User';
  }

  isOAuthUser(): boolean {
    return !!(this.googleId || this.githubId);
  }

  hasPassword(): boolean {
    return !!this.hashedPassword;
  }
}
