import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FriController } from './fri.controller.js';
import { FriService } from './fri.service.js';
import { PdfService } from './pdf.service.js';
@Module({
  imports: [AuthModule],
  controllers: [FriController],
  providers: [FriService, PdfService],
})
export class FriModule {}
