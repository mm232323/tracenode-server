import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.gaurd';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() req) {
    console.log('Current user from /auth/me:', req.user);
    return req.user;
  }
}
