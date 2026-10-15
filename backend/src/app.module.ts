import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FriModule } from './modules/fri/fri.module.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env: Record<string, string>) => {
        if (!env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');
        if (!env.JWT_SECRET || env.JWT_SECRET.length < 32)
          throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
        return {
          ...env,
          FRONTEND_URL: env.FRONTEND_URL || 'http://localhost:3000',
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    FriModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
