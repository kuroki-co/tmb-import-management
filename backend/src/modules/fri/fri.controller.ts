import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/api-error.dto.js';
import type { Response } from 'express';
import { SessionGuard, OriginGuard } from '../auth/auth.guard.js';
import { CreateFriDto, FriDto, ReceiptDto } from './fri.dto.js';
import { FriService } from './fri.service.js';
import { PdfService } from './pdf.service.js';
@ApiTags('fri')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiTooManyRequestsResponse({ type: ApiErrorDto })
@Controller('fri')
export class FriController {
  constructor(
    private readonly fri: FriService,
    private readonly pdf: PdfService,
  ) {}
  @Post()
  @UseGuards(OriginGuard)
  @ApiCreatedResponse({ type: ReceiptDto })
  create(@Body() data: CreateFriDto) {
    return this.fri.create(data);
  }
  @Get()
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOkResponse({
    type: [FriDto],
    description:
      'Últimas 500 solicitudes, ordenadas de más reciente a más antigua.',
  })
  list() {
    return this.fri.list();
  }
  @Get('receipt/:id')
  @ApiQuery({ name: 'token', type: String })
  @ApiOkResponse({ type: FriDto })
  receipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
  ) {
    this.checkToken(token);
    return this.fri.find(id, token);
  }
  @Get('receipt/:id/pdf')
  @ApiQuery({ name: 'token', type: String })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async receiptPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Res() response: Response,
  ) {
    this.checkToken(token);
    return this.sendPdf(await this.fri.find(id, token), response);
  }
  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: FriDto })
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.fri.find(id);
  }
  @Post(':id/review')
  @HttpCode(200)
  @UseGuards(SessionGuard, OriginGuard)
  @ApiCookieAuth()
  @ApiOkResponse({
    type: FriDto,
    description:
      'Al abrir el detalle, inicia revisión solo si la solicitud está pendiente. No retrocede estados posteriores.',
  })
  beginReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.fri.beginReview(id);
  }
  @Get(':id/pdf')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async sellerPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    return this.sendPdf(await this.fri.find(id), response);
  }
  private checkToken(token: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new BadRequestException('Enlace inválido');
  }
  private async sendPdf(fri: FriDto, response: Response) {
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="FRI-${fri.code}.pdf"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.send(await this.pdf.generate(fri));
  }
}
