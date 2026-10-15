import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, readGoogleToken } from '../googleAuth';

/** JWT de prueba (sin firma real): el storefront solo lee el payload. */
function fakeJwt(payload: unknown): string {
  const b64 = (v: unknown) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(v)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

describe('decodeJwtPayload', () => {
  it('lee el payload, incluso con tildes', () => {
    expect(decodeJwtPayload(fakeJwt({ name: 'José Pérez' }))).toEqual({ name: 'José Pérez' });
  });

  it('devuelve null con basura', () => {
    expect(decodeJwtPayload('no-es-un-jwt')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});

describe('readGoogleToken', () => {
  it('detecta que falta crear el cliente y toma el perfil de Google', () => {
    const token = fakeJwt({
      actor_id: '',
      user_metadata: { email: 'ana@gmail.com', given_name: 'Ana', family_name: 'Soto Pérez' },
    });
    expect(readGoogleToken(token)).toEqual({
      needsCustomer: true,
      profile: { email: 'ana@gmail.com', first_name: 'Ana', last_name: 'Soto Pérez' },
    });
  });

  it('si el cliente ya existe no pide crearlo', () => {
    const token = fakeJwt({ actor_id: 'cus_1', user_metadata: { email: 'ana@gmail.com' } });
    expect(readGoogleToken(token).needsCustomer).toBe(false);
  });

  it('arma el nombre desde "name" si Google no manda given/family', () => {
    const token = fakeJwt({ actor_id: '', user_metadata: { email: 'a@b.cl', name: 'Max Poblete Díaz' } });
    expect(readGoogleToken(token).profile).toEqual({ email: 'a@b.cl', first_name: 'Max', last_name: 'Poblete Díaz' });
  });

  it('sin correo no hay perfil; con token ilegible tampoco', () => {
    expect(readGoogleToken(fakeJwt({ actor_id: '', user_metadata: {} })).profile).toBeNull();
    expect(readGoogleToken('basura')).toEqual({ needsCustomer: false, profile: null });
  });
});
