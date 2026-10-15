import { validateFri } from './fri.validation.js';
import type { CreateFriDto } from './fri.dto.js';
const fixture = () =>
  ({
    documentType: 'DNI',
    documentNumber: '01234567',
    name: 'Cliente de prueba',
    department: 'Arequipa',
    mobile: '999123456',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2026,
    quantity: 1,
    fuel: 'Gasolina',
    transmission: 'Automática',
    budget: 25000,
    purchaseDate: '2026-12-01',
    payment: 'Transferencia bancaria',
    alternatives: false,
    usage: 'Personal',
    declaration: true,
  }) satisfies CreateFriDto;
describe('Reglas del FRI', () => {
  it('preserva ceros iniciales y elimina datos de campos ocultos', () => {
    const data = validateFri({
      ...fixture(),
      representative: 'No aplica',
      autonomy: 100,
      issuingCountry: 'Perú',
    });
    expect(data.documentNumber).toBe('01234567');
    expect(data.representative).toBeUndefined();
    expect(data.autonomy).toBeUndefined();
    expect(data.issuingCountry).toBeUndefined();
  });
  it('rechaza DNI de longitud incorrecta', () => {
    expect(() => validateFri({ ...fixture(), documentNumber: '123' })).toThrow(
      '8 dígitos',
    );
  });
  it('mantiene representante para RUC 20 pero no para RUC 10', () => {
    expect(
      validateFri({
        ...fixture(),
        documentType: 'RUC',
        documentNumber: '20123456789',
        representative: 'Representante',
      }).representative,
    ).toBe('Representante');
    expect(
      validateFri({
        ...fixture(),
        documentType: 'RUC',
        documentNumber: '10123456789',
        representative: 'Representante',
      }).representative,
    ).toBeUndefined();
  });
  it('requiere país emisor del pasaporte', () => {
    expect(() =>
      validateFri({
        ...fixture(),
        documentType: 'Pasaporte',
        documentNumber: 'AB12345',
      }),
    ).toThrow('país emisor');
  });
  it('rechaza fechas imposibles', () => {
    expect(() =>
      validateFri({ ...fixture(), purchaseDate: '2026-02-31' }),
    ).toThrow('Fecha');
  });
});
