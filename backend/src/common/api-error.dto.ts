import { ApiProperty } from '@nestjs/swagger';

/** Forma estándar de los errores HTTP que devuelve NestJS. */
export class ApiErrorDto {
  @ApiProperty() statusCode: number;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];
  @ApiProperty() error: string;
}
