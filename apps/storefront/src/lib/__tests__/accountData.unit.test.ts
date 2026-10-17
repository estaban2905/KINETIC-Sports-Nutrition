import { describe, expect, it } from 'vitest';
import { addressToRemember, billingFromCustomer, billingToRemember, isSameAddress } from '../accountData';

const cartAddress = {
  first_name: 'Max',
  last_name: 'Poblete',
  address_1: 'Goycolea 100',
  address_2: '',
  city: 'La Cisterna',
  province: 'Región Metropolitana',
  country_code: 'CL',
  phone: '+56926105950',
};

describe('addressToRemember', () => {
  it('convierte la dirección de la compra y la deja predeterminada si es la primera', () => {
    expect(addressToRemember(cartAddress, [])).toMatchObject({
      first_name: 'Max',
      last_name: 'Poblete',
      address_1: 'Goycolea 100',
      address_2: undefined,
      city: 'La Cisterna',
      country_code: 'cl',
      phone: '+56926105950',
      is_default_shipping: true,
    });
  });

  it('no es predeterminada si ya hay otras guardadas', () => {
    expect(addressToRemember(cartAddress, [{ address_1: 'Otra 1', city: 'Ovalle' }])?.is_default_shipping).toBe(false);
  });

  it('no repite una dirección ya guardada (ignora tildes y mayúsculas)', () => {
    expect(addressToRemember(cartAddress, [{ address_1: 'GOYCOLEA  100', city: 'la cistérna' }])).toBeNull();
  });

  it('ignora direcciones incompletas', () => {
    expect(addressToRemember(null, [])).toBeNull();
    expect(addressToRemember({ country_code: 'cl' }, [])).toBeNull();
    expect(addressToRemember({ address_1: 'Calle 1', city: '' }, [])).toBeNull();
  });

  it('usa el nombre como apellido si el carrito no trae apellido', () => {
    expect(addressToRemember({ ...cartAddress, last_name: '' }, [])?.last_name).toBe('Max');
  });
});

describe('isSameAddress', () => {
  it('compara calle y comuna', () => {
    expect(isSameAddress({ address_1: 'A 1', city: 'X' }, { address_1: 'a 1', city: 'x' })).toBe(true);
    expect(isSameAddress({ address_1: 'A 1', city: 'X' }, { address_1: 'A 2', city: 'X' })).toBe(false);
  });
});

const factura = {
  tipo: 'factura',
  rut: '76123456-0',
  razon_social: 'Mi Empresa SpA',
  giro: 'Venta',
  direccion: 'Av. 1',
  comuna: 'Santiago',
};

describe('billingToRemember', () => {
  it('guarda la factura de la compra cuando es nueva o cambió', () => {
    expect(billingToRemember(factura, null)).toEqual({
      rut: '76123456-0',
      razon_social: 'Mi Empresa SpA',
      giro: 'Venta',
      direccion: 'Av. 1',
      comuna: 'Santiago',
    });
    expect(billingToRemember(factura, { ...factura, giro: 'Otro' })).not.toBeNull();
  });

  it('no guarda con boleta ni si no cambió nada', () => {
    expect(billingToRemember({ tipo: 'boleta' }, null)).toBeNull();
    expect(billingToRemember(undefined, null)).toBeNull();
    expect(billingToRemember(factura, factura)).toBeNull();
  });
});

describe('billingFromCustomer', () => {
  it('precarga los campos pero deja boleta como documento por defecto', () => {
    expect(billingFromCustomer(factura)).toEqual({
      tipo: 'boleta',
      rut: '76.123.456-0',
      razonSocial: 'Mi Empresa SpA',
      giro: 'Venta',
      direccion: 'Av. 1',
      comuna: 'Santiago',
    });
  });

  it('sin datos guardados devuelve el formulario vacío', () => {
    expect(billingFromCustomer(undefined).rut).toBe('');
  });
});
