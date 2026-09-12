import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; 
import { UserModule } from 'src/user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    UserModule,
    PassportModule,                  
    JwtModule.register({
      secret: process.env.AUTH_SECRET ?? "9xK7pL2mN8vR4cQ6wF3jT5yB1aH9sM0dXzC4vG7nL3pK8mW2qR6tY5uF4jH9sA1dG7",
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], 
})
export class AuthModule {
}