import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/api-error.dto.js';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, UserDto } from './auth.dto.js';
import { OriginGuard, SessionGuard } from './auth.guard.js';
import type { AuthRequest } from './auth.guard.js';
import { Throttle } from '@nestjs/throttler';
@ApiTags('auth')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiTooManyRequestsResponse({ type: ApiErrorDto })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(OriginGuard)
  @ApiOkResponse({ type: UserDto })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, user } = await this.auth.login(input);
    response.cookie('tmb_session', token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return user;
  }
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserDto })
  me(@Req() request: AuthRequest): UserDto {
    const { id, name, email } = request.seller;
    return { id, name, email };
  }
  @Post('logout')
  @HttpCode(200)
  @UseGuards(OriginGuard, SessionGuard)
  @ApiOkResponse()
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.seller.sid);
    response.clearCookie('tmb_session', { path: '/' });
    return { success: true };
  }
}
