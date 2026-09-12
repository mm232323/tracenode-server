import { Injectable } from '@nestjs/common';
import { NotificationListResponseDto, NotificationResponseDto, NotificationDto } from './dtos/notification.dto';

@Injectable()
export class NotificationService {
  // Add methods when notification features are implemented
  async GetAllAsync(): Promise<NotificationListResponseDto> {
    return { notifications: [] };
  }
  
  async GetByIdAsync(id: string): Promise<NotificationResponseDto> {
    return { notification: {} as NotificationDto };
  }
}
