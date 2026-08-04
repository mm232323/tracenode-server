import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dtos/register.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserDto } from './dtos/user.schema';
@Injectable()
export class UserService {
  db = new PrismaService();
  async create(user: RegisterDto) {
    const existingUser = await this.db.user.findFirst({
      where: { email: user.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const userData = { ...user };

    if (userData.password) {
      userData.hashed_password = await bcrypt.hash(userData.password, 10);
      await this.db.user.update({
        where: { email: userData.email },
        data: { hashedPassword: userData.hashed_password },
      });
    }

    return await this.db.user.create({
      data: {
        ...userData,
      },
    });
  }
  async findByEmail(email: string) {
    return await this.db.user.findFirstOrThrow({ where: { email: email } });
  }
  async findById(userId: string) {
    return await this.db.user.findFirstOrThrow({ where: { id: userId } });
  }
  async update(userId: string, data: Partial<UserDto>) {}
}
