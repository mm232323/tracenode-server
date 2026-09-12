// Placeholder DTOs for notification functionality
// Add actual DTOs when notification features are implemented

export class NotificationDto {
  id?: string;
  userId?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: Date;
}

export class NotificationListResponseDto {
  notifications: NotificationDto[];
}

export class NotificationResponseDto {
  notification: NotificationDto;
}
