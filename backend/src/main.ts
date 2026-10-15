import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { writeFileSync, mkdirSync } from 'node:fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TMB API')
      .setVersion('1.0')
      .addCookieAuth('tmb_session')
      .build(),
  );
  if (process.argv.includes('--export-openapi')) {
    mkdirSync('contracts', { recursive: true });
    writeFileSync('contracts/openapi.json', JSON.stringify(document, null, 2));
    await app.close();
    return;
  }
  if (process.env.NODE_ENV !== 'production')
    SwaggerModule.setup('docs', app, document);
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
