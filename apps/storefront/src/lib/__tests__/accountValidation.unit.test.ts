import { describe, expect, it } from 'vitest';
import {
  describeAuthError,
  joinName,
  splitName,
  validateLoginForm,
  validateProfileForm,
  validateRegisterForm,
  validateResetForm,
} from '../accountValidation';

describe('validateLoginForm', () => {
  it('acepta correo y contraseña', () => {
    expect(validateLoginForm({ email: 'a@b.cl', password: 'x' })).toEqual({});
  });

  it('pide ambos campos y valida el formato del correo', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'Ingresa tu correo electrónico.',
      password: 'Ingresa tu contraseña.',
    });
    expect(validateLoginForm({ email: 'no-es-correo', password: 'x' }).email).toBe('Ingresa un correo válido.');
  });
});

describe('validateRegisterForm', () => {
  const valid = { name: 'María Pérez', email: 'maria@correo.cl', password: 'clave-segura', confirmPassword: 'clave-segura' };

  it('acepta datos válidos, con tildes y apóstrofes en el nombre', () => {
    expect(validateRegisterForm(valid)).toEqual({});
    expect(validateRegisterForm({ ...valid, name: "José D'Angelo" })).toEqual({});
  });

  it('exige nombre solo con letras', () => {
    expect(validateRegisterForm({ ...valid, name: '  ' }).name).toBe('Ingresa tu nombre.');
    expect(validateRegisterForm({ ...valid, name: 'Max 123' }).name).toBe('El nombre solo puede tener letras.');
  });

  it('exige contraseña de al menos 8 caracteres', () => {
    expect(validateRegisterForm({ ...valid, password: '1234567', confirmPassword: '1234567' }).password).toContain('al menos 8');
    expect(validateRegisterForm({ ...valid, password: '', confirmPassword: '' }).password).toBe('Ingresa una contraseña.');
  });

  it('exige que las contraseñas coincidan', () => {
    expect(validateRegisterForm({ ...valid, confirmPassword: 'otra-clave-x' }).confirmPassword).toBe(
      'Las contraseñas no coinciden.'
    );
  });
});

describe('validateResetForm', () => {
  it('valida largo y coincidencia', () => {
    expect(validateResetForm({ password: 'clave-segura', confirmPassword: 'clave-segura' })).toEqual({});
    expect(validateResetForm({ password: 'corta', confirmPassword: 'corta' }).password).toBeDefined();
    expect(validateResetForm({ password: 'clave-segura', confirmPassword: 'distinta' }).confirmPassword).toBeDefined();
  });
});

describe('validateProfileForm', () => {
  it('RUT y teléfono son opcionales', () => {
    expect(validateProfileForm({ name: 'Ana Soto', rut: '', phone: '' })).toEqual({});
  });

  it('rechaza un RUT con dígito verificador incorrecto y acepta uno válido', () => {
    expect(validateProfileForm({ name: 'Ana Soto', rut: '12.345.678-9', phone: '' }).rut).toBe('Ingresa un RUT válido.');
    expect(validateProfileForm({ name: 'Ana Soto', rut: '12.345.678-5', phone: '' }).rut).toBeUndefined();
  });

  it('valida celular chileno', () => {
    expect(validateProfileForm({ name: 'Ana Soto', rut: '', phone: '12345' }).phone).toBeDefined();
    expect(validateProfileForm({ name: 'Ana Soto', rut: '', phone: '+56 9 1234 5678' }).phone).toBeUndefined();
  });
});

describe('nombres', () => {
  it('separa y une nombre y apellido', () => {
    expect(splitName('Juan Pérez Soto')).toEqual({ first_name: 'Juan', last_name: 'Pérez Soto' });
    expect(splitName('  Cher ')).toEqual({ first_name: 'Cher', last_name: '' });
    expect(joinName('Juan', 'Pérez Soto')).toBe('Juan Pérez Soto');
    expect(joinName(null, undefined)).toBe('');
  });
});

describe('describeAuthError', () => {
  it('traduce los errores conocidos del backend', () => {
    expect(describeAuthError(new Error('Invalid email or password'))).toBe('Correo o contraseña incorrectos.');
    expect(describeAuthError(new Error('Identity with email already exists'))).toContain('Ya existe una cuenta');
    expect(describeAuthError(new Error('Failed to fetch'))).toContain('conectar con el servidor');
  });

  it('deja pasar mensajes desconocidos y tiene un texto por defecto', () => {
    expect(describeAuthError(new Error('El RUT ingresado no es válido.'))).toBe('El RUT ingresado no es válido.');
    expect(describeAuthError(undefined)).toBe('Ocurrió un error. Inténtalo de nuevo.');
  });
});
