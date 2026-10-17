import { describe, expect, it } from 'vitest';
import { contactFromCustomer } from '../checkoutValidation';
import { mapCustomerOrder, type CustomerOrderResponse } from '../accountOrders';

const response: CustomerOrderResponse = {
  id: 'order_1',
  display_id: 1042,
  customer_status: 'in_transit',
  created_at: '2026-10-01T10:00:00Z',
  total: 39382,
  currency_code: 'clp',
  fulfillments: [{ labels: [{ tracking_number: '99482910482' }, { tracking_number: null }] }, { labels: null }],
  items: [{ id: 'item_1', title: 'PROTEIN X', variant_title: 'Chocolate / 2 LBS', quantity: 2, unit_price: 19691, thumbnail: null }],
  shipping_address: { address_1: 'Av. Siempre Viva 742', address_2: null, city: 'Ovalle', province: null },
};

describe('mapCustomerOrder', () => {
  it('convierte la respuesta del backend al modelo del storefront', () => {
    expect(mapCustomerOrder(response)).toEqual({
      id: 'order_1',
      displayId: '1042',
      createdAt: '2026-10-01T10:00:00Z',
      status: 'in_transit',
      total: 39382,
      currencyCode: 'clp',
      trackingCodes: ['99482910482'],
      items: [
        { id: 'item_1', title: 'PROTEIN X', variantTitle: 'Chocolate / 2 LBS', quantity: 2, unitPrice: 19691, thumbnail: null },
      ],
      shippingAddress: { address_1: 'Av. Siempre Viva 742', address_2: undefined, city: 'Ovalle', province: '' },
    });
  });

  it('tolera pedidos sin envíos, ítems ni dirección', () => {
    const mapped = mapCustomerOrder({ ...response, fulfillments: undefined, items: undefined, shipping_address: null });
    expect(mapped.trackingCodes).toEqual([]);
    expect(mapped.items).toEqual([]);
    expect(mapped.shippingAddress).toBeNull();
  });
});

describe('contactFromCustomer', () => {
  const customer = {
    email: 'ana@correo.cl',
    first_name: 'Ana',
    last_name: 'Soto',
    phone: '+56 9 1111 2222',
    addresses: [
      { address_1: 'Calle Uno 10', city: 'Ovalle', is_default_shipping: false },
      { address_1: 'Av. Providencia 1240', address_2: 'Depto 402', city: 'Providencia', is_default_shipping: true },
    ],
  };

  it('usa la dirección de envío predeterminada y los datos del perfil', () => {
    expect(contactFromCustomer(customer)).toMatchObject({
      name: 'Ana Soto',
      email: 'ana@correo.cl',
      phone: '+56 9 1111 2222',
      street: 'Av. Providencia',
      streetNumber: '1240',
      apartment: 'Depto 402',
      city: 'Providencia',
    });
  });

  it('sin predeterminada usa la primera dirección; sin direcciones, solo el perfil', () => {
    expect(contactFromCustomer({ ...customer, addresses: [customer.addresses[0]] }).city).toBe('Ovalle');
    expect(contactFromCustomer({ ...customer, addresses: [] })).toMatchObject({
      name: 'Ana Soto',
      phone: '+56 9 1111 2222',
      street: '',
      city: '',
    });
  });

  it('sin cliente devuelve el formulario vacío', () => {
    expect(contactFromCustomer(null)).toMatchObject({ name: '', email: '', street: '' });
  });
});
