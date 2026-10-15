import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { SessionGuard, OriginGuard } from './auth.guard.js';
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h', algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [AuthService, SessionGuard, OriginGuard],
  controllers: [AuthController],
  exports: [SessionGuard, OriginGuard, AuthService],
})
export class AuthModule {}
