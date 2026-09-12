import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dtos/register.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserDto, UserResponseDto } from './dtos/user.schema';
@Injectable()
export class UserService {
  db = new PrismaService();
  async CreateAsync(user: RegisterDto): Promise<UserResponseDto> {
    const existingUser = await this.db.user.findFirst({
      where: { email: user.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const { password, ...rest } = user; // strip plaintext password out entirely
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await this.db.user.create({
      data: {
        ...rest,
        hashedPassword,
      },
    });
    return { user: this.sanitizeUser(createdUser) };
  }
  async GetByEmailAsync(email: string) {
    return await this.db.user.findFirst({
      where: { email },
    });
  }
  async GetByGithubIdAsync(githubId: string) {
    return await this.db.user.findFirst({
      where: { githubId },
    });
  }
  async UpsertGithubUserAsync(data: {
    githubId: string;
    email?: string;
    fullName?: string;
    username?: string;
    avatarImg?: string;
    accessToken?: string;
  }) {
    let user: any = null;
    if (data.githubId) {
      user = await this.db.user.findFirst({
        where: { githubId: data.githubId },
      });
    }

    if (!user && data.email) {
      user = await this.db.user.findFirst({
        where: { email: data.email },
      });
    }

    if (user) {
      const updatedUser = await this.db.user.update({
        where: { id: user.id },
        data: {
          githubId: data.githubId || user.githubId,
          fullName: data.fullName || user.fullName,
          username: data.username || user.username,
          avatarImg: data.avatarImg || user.avatarImg,
          accessToken: data.accessToken || user.accessToken,
          lastLogin: new Date(),
        },
      });
      return { user: this.sanitizeUser(updatedUser) };
    }

    const createdUser = await this.db.user.create({
      data: {
        githubId: data.githubId,
        email: data.email || null,
        fullName: data.fullName || null,
        username: data.username || null,
        avatarImg: data.avatarImg || null,
        accessToken: data.accessToken || null,
        lastLogin: new Date(),
      },
    });
    return { user: this.sanitizeUser(createdUser) };
  }
  async GetByIdAsync(userId: string): Promise<UserResponseDto> {
    const user = await this.db.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        plan: true,
      }
    });
    console.log('user', user);
    return { user: this.sanitizeUser(user) };
  }
  async UpdateAsync(userId: string, data: Partial<UserDto>): Promise<UserResponseDto> {
    const updateData: any = { ...data };
    
    // Handle null values properly for Prisma
    if (updateData.planId === null) {
      updateData.planId = null;
    }
    
    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: updateData,
    });
    return { user: this.sanitizeUser(updatedUser) };
  }

  private sanitizeUser(user: any): Omit<UserDto, 'hashedPassword' | 'refreshToken' | 'accessToken'> {
    const { hashedPassword, refreshToken, accessToken, ...sanitized } = user;
    return sanitized;
  }
}
