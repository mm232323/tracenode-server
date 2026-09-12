import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { GithubAuthDto } from './dtos/github-auth.dto';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthResponseDto, LogoutResponseDto } from './dtos/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private db: PrismaService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const userResponse = await this.usersService.CreateAsync(registerDto);
    const accessToken = this.generateToken(userResponse.user);
    return {
      user: userResponse.user,
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.GetByEmailAsync(loginDto.email);
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user?.hashedPassword ?? "",
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user);
    this.db.user.update({where:{email:loginDto.email},data:{lastLogin:new Date()}})
    
    const sanitizedUser = this.sanitizeUser(user);
    return {
      user: sanitizedUser,
      accessToken,
    };
  }

  async githubLogin(githubAuthDto: GithubAuthDto): Promise<AuthResponseDto> {
    const { user } = await this.usersService.UpsertGithubUserAsync(githubAuthDto);
    const accessToken = this.generateToken(user);
    return {
      user,
      accessToken,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.GetByIdAsync(userId);
  }

  async logout(userId: string): Promise<LogoutResponseDto> {
    try {
      const userResponse = await this.usersService.GetByIdAsync(userId);

      await this.clearRefreshToken(userId);

      this.logger.log(
        `User ${userResponse.user?.email} (ID: ${userId}) logged out successfully`,
      );

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}: ${(error as Error).message}`,
      );
      throw new UnauthorizedException('Logout failed');
    }
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        refreshToken: null
      },
    });
    this.logger.debug(`Refresh token cleared for user ${userId}`);
  }

generateToken(user: any) {
  return this.jwtService.sign({
    id: user.id,
    email: user.email,
    name: user.fullName,
  });
}

private sanitizeUser(user: any): Omit<any, 'hashedPassword' | 'refreshToken' | 'accessToken'> {
  const { hashedPassword, refreshToken, accessToken, ...sanitized } = user;
  return sanitized;
}
}
