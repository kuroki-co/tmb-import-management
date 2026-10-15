import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { UserDto } from './auth.dto.js';
export type AuthRequest = Request & { seller: UserDto & { sid: string } };
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    request.seller = await this.auth.authenticate(
      request.cookies?.tmb_session as string | undefined,
    );
    return true;
  }
}
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (
      request.headers.origin !== this.config.getOrThrow<string>('FRONTEND_URL')
    )
      throw new ForbiddenException('Origen no permitido');
    return true;
  }
}
