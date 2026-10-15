import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';

@Global()
@Module({
  providers: [
    {
      provide: Sequelize,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Sequelize(config.getOrThrow<string>('DATABASE_URL'), {
          dialect: 'postgres',
          logging: false,
        }),
    },
  ],
  exports: [Sequelize],
})
export class DatabaseModule {}
