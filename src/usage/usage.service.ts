import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsageResponseDto, UsageDto } from './dtos/usage.dto';

@Injectable()
export class UsageService {
    db = new PrismaService();
    async GetByUserIdAsync(userId: string): Promise<UsageResponseDto> {
        const usage = await this.db.usage.findFirst({ orderBy: { createdAt: 'desc' }, where: { userId } });
        if (!usage) {
          return { usage: null as any };
        }
        const transformedUsage = {
          ...usage,
          id: Number(usage.id),
          apiUsed: typeof usage.apiUsed === 'object' ? Number(usage.apiUsed) : usage.apiUsed,
        };
        return { usage: transformedUsage as UsageDto };
    }   
}