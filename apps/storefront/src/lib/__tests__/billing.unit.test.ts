import { describe, expect, it } from 'vitest';
import {
  billingFromCart,
  billingToMetadata,
  EMPTY_BILLING,
  formatRut,
  isValidRut,
  validateBillingForm,
} from '../checkoutValidation';

describe('RUT', () => {
  it('validates the check digit', () => {
    expect(isValidRut('17.096.073-4')).toBe(true);
    expect(isValidRut('17096073-4')).toBe(true);
    expect(isValidRut('17096073-5')).toBe(false);
    expect(isValidRut('')).toBe(false);
  });

  it('formats as the customer types', () => {
    expect(formatRut('170960734')).toBe('17.096.073-4');
    expect(formatRut('1')).toBe('1');
    expect(formatRut('12345678k')).toBe('12.345.678-K');
  });
});

describe('billing form', () => {
  const factura = {
    tipo: 'factura' as const,
    rut: '17.096.073-4',
    razonSocial: 'Gimnasio SpA',
    giro: 'Gimnasios',
    direccion: 'Calle 12 345',
    comuna: 'Paine',
  };

  it('needs nothing for a boleta', () => {
    expect(validateBillingForm(EMPTY_BILLING)).toEqual({});
  });

  it('requires every field for a factura', () => {
    expect(validateBillingForm(factura)).toEqual({});
    const errors = validateBillingForm({ ...factura, rut: '1-9', giro: ' ', comuna: '' });
    expect(Object.keys(errors).sort()).toEqual(['comuna', 'giro', 'rut']);
  });

  it('round-trips through the cart metadata', () => {
    const metadata = billingToMetadata(factura);
    expect(metadata).toEqual({
      tipo: 'factura',
      rut: '17096073-4',
      razon_social: 'Gimnasio SpA',
      giro: 'Gimnasios',
      direccion: 'Calle 12 345',
      comuna: 'Paine',
    });
    expect(billingFromCart({ billing: metadata })).toEqual(factura);
    expect(billingToMetadata(EMPTY_BILLING)).toEqual({ tipo: 'boleta' });
    expect(billingFromCart(undefined)).toEqual(EMPTY_BILLING);
  });
});

describe('RUT examples shown to the customer', () => {
  it('uses an example RUT that is itself valid', () => {
    expect(isValidRut('76.123.456-0')).toBe(true);
    expect(isValidRut('76.123.456-7')).toBe(false);
  });
});
