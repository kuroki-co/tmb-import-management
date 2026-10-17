import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const departments = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali',
];
export class CreateFriDto {
  @ApiProperty({ enum: ['DNI', 'RUC', 'CE', 'Pasaporte'] })
  @IsIn(['DNI', 'RUC', 'CE', 'Pasaporte'])
  documentType: string;
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  documentNumber: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuingCountry?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  representative?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
  @ApiProperty({ enum: departments }) @IsIn(departments) department: string;
  @ApiProperty() @Matches(/^9\d{8}$/) mobile: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) brand: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) model: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  version?: string;
  @ApiProperty() @IsInt() @Min(1900) @Max(2100) year: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) quantity: number;
  @ApiProperty({ enum: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'No aplica'] })
  @IsIn(['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'No aplica'])
  fuel: string;
  @ApiProperty({
    enum: [
      'Manual o mecánica (MT)',
      'Automática convencional (AT)',
      'Manual automatizada (AMT)',
      'Automática de doble embrague (DCT)',
      'Transmisión continuamente variable (CVT)',
      'Transmisión eléctrica (EV / e-Axle)',
      'Transmisión híbrida (e-CVT / DHT)',
    ],
  })
  @IsIn([
    'Manual o mecánica (MT)',
    'Automática convencional (AT)',
    'Manual automatizada (AMT)',
    'Automática de doble embrague (DCT)',
    'Transmisión continuamente variable (CVT)',
    'Transmisión eléctrica (EV / e-Axle)',
    'Transmisión híbrida (e-CVT / DHT)',
  ])
  transmission: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  power?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  autonomy?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  equipment?: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(1000000000) budget: number;
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) purchaseDate: string;
  @ApiProperty({
    enum: ['Contado', 'Financiado'],
  })
  @IsIn(['Contado', 'Financiado'])
  payment: string;
  @ApiProperty() @IsBoolean() alternatives: boolean;
  @ApiProperty({ enum: ['Personal', 'Comercial', 'Industrial'] })
  @IsIn(['Personal', 'Comercial', 'Industrial'])
  usage: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  originCountry?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observations?: string;
  @ApiProperty({ enum: [true] }) @Equals(true) declaration: boolean;
}
export class FriDto {
  @ApiProperty() id: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({
    enum: [
      'Pendiente a revisar',
      'En revisión',
      'Cotizado',
      'Confirmado a compra',
    ],
  })
  status: string;
  @ApiProperty() code: string;
  @ApiProperty({ type: CreateFriDto }) data: CreateFriDto;
}
export class ReceiptDto {
  @ApiProperty() id: string;
  @ApiProperty() receiptToken: string;
}
