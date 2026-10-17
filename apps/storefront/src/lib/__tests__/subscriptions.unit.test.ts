import { describe, expect, it, vi } from 'vitest';
import {
  addressFromContact,
  cardReturnState,
  cycleStatusInfo,
  describeSubscriptionError,
  formatBillingDate,
  hasActiveSubscription,
  needsCard,
  parseVariantTitle,
  redirectToTransbank,
  subscriptionPrice,
  subscriptionStatusInfo,
  transbankFormFields,
} from '../subscriptions';

describe('formatBillingDate', () => {
  it('escribe la fecha en español sin depender de la zona horaria', () => {
    expect(formatBillingDate('2026-10-28')).toBe('28 de octubre de 2026');
    expect(formatBillingDate('2027-01-05')).toBe('5 de enero de 2027');
  });

  it('sin fecha válida muestra un guion', () => {
    expect(formatBillingDate(null)).toBe('—');
    expect(formatBillingDate(undefined)).toBe('—');
    expect(formatBillingDate('mañana')).toBe('—');
  });
});

describe('subscriptionPrice', () => {
  it('aplica el 15% y redondea como el backend', () => {
    expect(subscriptionPrice(65990)).toBe(56092); // 56091.5 -> 56092
    expect(subscriptionPrice(10000)).toBe(8500);
    expect(subscriptionPrice(10000, 0)).toBe(10000);
  });
});

describe('estados', () => {
  it('cada estado de suscripción tiene texto y tono', () => {
    expect(subscriptionStatusInfo('active')).toEqual({ label: 'Activa', tone: 'good' });
    expect(subscriptionStatusInfo('paused').tone).toBe('warning');
    expect(subscriptionStatusInfo('past_due').tone).toBe('bad');
    expect(subscriptionStatusInfo('pending_card').label).toMatch(/tarjeta/);
    expect(subscriptionStatusInfo('cancelled').tone).toBe('neutral');
  });

  it('cada estado de ciclo se explica sin términos técnicos', () => {
    expect(cycleStatusInfo('paid').label).toBe('Cobrado');
    expect(cycleStatusInfo('failed').label).toMatch(/rechazada/);
    expect(cycleStatusInfo('skipped').label).toMatch(/stock/);
    expect(cycleStatusInfo('processing').tone).toBe('neutral');
  });

  it('needsCard: pendiente, vencida o sin tarjeta; nunca una cancelada', () => {
    expect(needsCard({ status: 'pending_card', has_card: false })).toBe(true);
    expect(needsCard({ status: 'past_due', has_card: true })).toBe(true);
    expect(needsCard({ status: 'active', has_card: false })).toBe(true);
    expect(needsCard({ status: 'active', has_card: true })).toBe(false);
    expect(needsCard({ status: 'paused', has_card: true })).toBe(false);
    expect(needsCard({ status: 'cancelled', has_card: false })).toBe(false);
  });

  it('hasActiveSubscription solo cuenta las activas', () => {
    expect(hasActiveSubscription([{ status: 'paused' }, { status: 'cancelled' }])).toBe(false);
    expect(hasActiveSubscription([{ status: 'paused' }, { status: 'active' }])).toBe(true);
    expect(hasActiveSubscription([])).toBe(false);
  });
});

describe('parseVariantTitle', () => {
  it('separa sabor y tamaño', () => {
    expect(parseVariantTitle('Double Rich Chocolate / 2 Libras')).toEqual({
      flavor: 'Double Rich Chocolate',
      size: '2 Libras',
    });
  });

  it('sin separador todo es el sabor; sin título, vacío', () => {
    expect(parseVariantTitle('Único')).toEqual({ flavor: 'Único', size: '' });
    expect(parseVariantTitle(null)).toEqual({ flavor: '', size: '' });
  });
});

describe('addressFromContact', () => {
  const values = {
    name: 'Ana María Pérez',
    email: 'a@b.cl',
    phone: ' +56 9 1111 2222 ',
    street: 'Av. Siempre Viva',
    streetNumber: '123',
    apartment: '4B',
    city: 'Ovalle',
  };

  it('arma la dirección de despacho', () => {
    expect(addressFromContact(values)).toEqual({
      first_name: 'Ana',
      last_name: 'María Pérez',
      phone: '+56 9 1111 2222',
      address_1: 'Av. Siempre Viva 123',
      address_2: '4B',
      city: 'Ovalle',
      country_code: 'cl',
    });
  });

  it('un nombre de una palabra repite el apellido y sin depto no manda address_2', () => {
    const out = addressFromContact({ ...values, name: 'Ana', apartment: ' ' });
    expect(out.last_name).toBe('Ana');
    expect(out).not.toHaveProperty('address_2');
  });
});

describe('cardReturnState', () => {
  it('lee el resultado de la inscripción de la URL', () => {
    expect(cardReturnState(new URLSearchParams('tab=membership&card=ok'))).toBe('ok');
    expect(cardReturnState(new URLSearchParams('card=error'))).toBe('error');
    expect(cardReturnState(new URLSearchParams('card=hack'))).toBeNull();
    expect(cardReturnState(new URLSearchParams(''))).toBeNull();
  });
});

describe('describeSubscriptionError', () => {
  it('traduce los errores comunes', () => {
    expect(describeSubscriptionError(new Error('Failed to fetch'))).toMatch(/conectar/);
    expect(describeSubscriptionError(new Error('Demasiados intentos'))).toMatch(/Demasiados/);
    expect(describeSubscriptionError(new Error('Unauthorized'))).toMatch(/sesión/);
    expect(describeSubscriptionError(new Error('Ya tienes una suscripción a este producto.'))).toBe(
      'Ya tienes una suscripción a este producto.'
    );
    expect(describeSubscriptionError(undefined)).toMatch(/Ocurrió un error/);
  });
});

describe('redirectToTransbank', () => {
  it('arma un formulario POST oculto con TBK_TOKEN y lo envía', () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => undefined);
    redirectToTransbank('https://webpay3gint.transbank.cl/webpayserver/bp_multicode_inscription.cgi', 'tok123');

    const form = document.querySelector('form') as HTMLFormElement;
    expect(form.method).toBe('post');
    expect(form.action).toBe('https://webpay3gint.transbank.cl/webpayserver/bp_multicode_inscription.cgi');
    const input = form.querySelector('input[name="TBK_TOKEN"]') as HTMLInputElement;
    expect(input.value).toBe('tok123');
    expect(input.type).toBe('hidden');
    expect(submit).toHaveBeenCalledTimes(1);

    form.remove();
    submit.mockRestore();
  });

  it('rechaza destinos que no son de Transbank por https', () => {
    for (const url of [
      'http://webpay3g.transbank.cl/x',
      'https://evil.example.com/transbank.cl/',
      'https://transbank.cl.evil.com/x',
      'javascript:alert(1)',
    ]) {
      expect(() => redirectToTransbank(url, 't')).toThrow(/no es válida/);
    }
  });

  it('el token viaja solo como TBK_TOKEN', () => {
    expect(transbankFormFields('abc')).toEqual({ TBK_TOKEN: 'abc' });
  });
});
