import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationListResponseDto, NotificationResponseDto } from './dtos/notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
  
  @Get('/')
  async getAllAsync(): Promise<NotificationListResponseDto> {
    return this.notificationService.GetAllAsync();
  }
  
  @Get('/:id')
  async getByIdAsync(@Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationService.GetByIdAsync(id);
  }
}
