import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.gaurd';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

   @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }
}