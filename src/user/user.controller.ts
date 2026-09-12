import { Controller, Post, Body, UseGuards, Get, Req, Put, Param } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dtos/register.dto';
import { UserService } from './user.service';
import { UserDto, UserResponseDto } from './dtos/user.schema';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}
  @Post('/')
  async create(user: RegisterDto): Promise<UserResponseDto> {
    return this.userService.CreateAsync(user);
  }
  @Get('/:id')
  async findById(@Param('id') userId: string): Promise<UserResponseDto> {
    return await this.userService.GetByIdAsync(userId);
  }
  @Put('/:id')
  async update(@Param('id') userId: string, data: Partial<UserDto>): Promise<UserResponseDto> {
    return await this.userService.UpdateAsync(userId, data);
  }
}
