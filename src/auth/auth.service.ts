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
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private db: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const accessToken = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.hashedPassword,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user);
    this.db.user.update({where:{email:loginDto.email},data:{lastLogin:new Date()}})
    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersService.findById(userId);

      await this.clearRefreshToken(userId);

      this.logger.log(
        `User ${user.email} (ID: ${userId}) logged out successfully`,
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

private sanitizeUser(user: any) {
  const { hashedPassword, refreshToken, ...sanitized } = user;
  return sanitized;
}
}
