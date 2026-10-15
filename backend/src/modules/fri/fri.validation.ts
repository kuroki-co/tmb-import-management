import { BadRequestException } from '@nestjs/common';
import type { CreateFriDto } from './fri.dto.js';
export function validateFri(input: CreateFriDto) {
  input.documentNumber = input.documentNumber.trim();
  input.name = input.name.trim();
  if (input.name.length < 2)
    throw new BadRequestException('Indica el nombre del cliente');
  if (input.documentType === 'DNI' && !/^\d{8}$/.test(input.documentNumber))
    throw new BadRequestException('El DNI debe tener 8 dígitos');
  if (
    input.documentType === 'RUC' &&
    !/^(10|20)\d{9}$/.test(input.documentNumber)
  )
    throw new BadRequestException(
      'El RUC debe tener 11 dígitos y comenzar con 10 o 20',
    );
  if (
    input.documentType === 'CE' &&
    !/^[a-zA-Z0-9-]{1,30}$/.test(input.documentNumber)
  )
    throw new BadRequestException('Revisa el carné de extranjería');
  if (
    input.documentType === 'Pasaporte' &&
    (!/^[a-zA-Z0-9]{1,30}$/.test(input.documentNumber) ||
      !input.issuingCountry?.trim())
  )
    throw new BadRequestException('Indica pasaporte y país emisor');
  const parsedDate = new Date(`${input.purchaseDate}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== input.purchaseDate
  )
    throw new BadRequestException('Fecha de compra inválida');
  if (input.documentType !== 'RUC' || !input.documentNumber.startsWith('20'))
    delete input.representative;
  if (input.documentType !== 'Pasaporte') delete input.issuingCountry;
  if (input.fuel !== 'Eléctrico') delete input.autonomy;
  return input;
}
