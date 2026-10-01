import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.gaurd';
import { AuthService } from './auth.service';
import { AuthResponseDto, LogoutResponseDto } from './dtos/auth-response.dto';
import { GithubAuthDto } from './dtos/github-auth.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('github')
  async githubLogin(
    @Body() githubAuthDto: GithubAuthDto,
  ): Promise<AuthResponseDto> {
    return this.authService.githubLogin(githubAuthDto);
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser('userId') userId: string,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(userId);
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() req) {
    console.log('Current user from /auth/me:', req.user);
    return req.user;
  }
}
