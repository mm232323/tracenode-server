import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Override canActivate to add custom logic
   * This runs before the passport strategy
   */
  canActivate(context: ExecutionContext) {
    // Check if route is public (skip authentication)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Add custom logic before authentication
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      // You can add custom logging or validation here
      console.log('No token found in request');
    }

    // Call parent canActivate (triggers passport strategy)
    return super.canActivate(context);
  }

  /**
   * Override handleRequest to customize the response
   * This runs after the strategy validates the token
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    // If there's an error or no user, throw UnauthorizedException
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    // Add user data to request for later use
    const request = context.switchToHttp().getRequest();
    request.user = user;

    return user;
  }

  /**
   * Helper method to extract token from header
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}