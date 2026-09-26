import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UserService,
    private prisma: PrismaService
  ) {
    super({
      // Extract JWT from multiple sources
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. From Authorization header (Bearer token)
        ExtractJwt.fromAuthHeaderAsBearerToken(),

        // 2. From cookie (for web apps)
        (req: Request) => {
          return req?.cookies?.access_token || null;
        },

        // 3. From query parameter (for WebSockets or special cases)
        (req: Request) => {
          return (req?.query?.token as string) || null;
        },
      ]),

      // Don't ignore expired tokens
      ignoreExpiration: false,

      // Secret key for verification
      secretOrKey: process.env.AUTH_SECRET || '9xK7pL2mN8vR4cQ6wF3jT5yB1aH9sM0dXzC4vG7nL3pK8mW2qR6tY5uF4jH9sA1dG7',
    });
  }

  /**
   * Validate method is called after JWT verification
   * Returns the user object that will be attached to req.user
   */
  async validate(payload: any) {
    try {
      console.log('JWT Payload:', payload);

      // Use payload.id instead of payload.sub based on the actual JWT structure
      const userId = payload.id || payload.sub;

      if (!userId) {
        console.error('No user ID in JWT payload');
        throw new UnauthorizedException('Invalid token payload');
      }

      console.log('Looking for user with ID:', userId);

      // Check if the user exists in the database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      });

      if (!user) {
        console.error('User not found in database:', userId);
        throw new UnauthorizedException('User not found');
      }

      // Return user object with required fields
      const userObject = {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        plan: user.plan,
      };

      console.log('Returning user object:', userObject);
      return userObject;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
