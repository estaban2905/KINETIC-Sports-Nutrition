import { describe, expect, it } from 'vitest';
import {
  ALLOWED_PAYMENT_PROVIDER_IDS,
  currency,
  formatProviderName,
  isAllowedPaymentProvider,
} from '../CartDrawer';

describe('isAllowedPaymentProvider', () => {
  it.each(['pp_webpay_webpay', 'pp_mercadopago_mercadopago', 'pp_stripe_stripe'])(
    'allows the real payment provider %s',
    (providerId) => {
      expect(isAllowedPaymentProvider(providerId, false)).toBe(true);
    }
  );

  it('rejects an unknown provider id', () => {
    expect(isAllowedPaymentProvider('pp_something_else', false)).toBe(false);
  });

  it('rejects pp_system_default when allowSystemDefault is false (production behavior)', () => {
    expect(isAllowedPaymentProvider('pp_system_default', false)).toBe(false);
  });

  it('allows pp_system_default when allowSystemDefault is true (dev behavior)', () => {
    expect(isAllowedPaymentProvider('pp_system_default', true)).toBe(true);
  });
});

describe('ALLOWED_PAYMENT_PROVIDER_IDS', () => {
  it('never includes system_default in the base allowlist', () => {
    expect(ALLOWED_PAYMENT_PROVIDER_IDS).not.toContain('system_default');
  });
});

describe('formatProviderName', () => {
  it('maps known provider ids to their Spanish display label', () => {
    expect(formatProviderName('pp_webpay_webpay')).toBe('Webpay Plus');
    expect(formatProviderName('pp_mercadopago_mercadopago')).toBe('Mercado Pago');
    expect(formatProviderName('pp_stripe_stripe')).toBe('Tarjeta de Crédito/Débito (Stripe)');
    expect(formatProviderName('pp_system_default')).toBe('Pago de prueba (modo desarrollo)');
  });

  it('falls back to the raw id for an unknown provider', () => {
    expect(formatProviderName('pp_unknown_provider')).toBe('pp_unknown_provider');
  });
});

describe('currency', () => {
  it('formats a number as Chilean pesos without decimals', () => {
    expect(currency(10000)).toBe('$10.000');
  });

  it('rounds fractional amounts', () => {
    expect(currency(999.6)).toBe('$1.000');
  });
});
