import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UserService) {
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
      // Option 1: Just return the payload (stateless)
      return {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        level: payload.level,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
