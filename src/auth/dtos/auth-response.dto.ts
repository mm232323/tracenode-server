import { UserDto } from '../../user/dtos/user.schema';

export class AuthResponseDto {
  user: Omit<UserDto, 'hashedPassword' | 'refreshToken' | 'accessToken'>;
  accessToken: string;
}

export class LogoutResponseDto {
  success: boolean;
  message: string;
}
