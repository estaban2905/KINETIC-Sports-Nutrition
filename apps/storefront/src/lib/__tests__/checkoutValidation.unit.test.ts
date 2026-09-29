import { describe, expect, it } from 'vitest';
import { validateContactForm, isContactFormValid, type ContactFormValues } from '../checkoutValidation';

const validValues: ContactFormValues = {
  name: 'Matías Silva',
  email: 'matias@example.com',
  phone: '+56 9 1234 5678',
  street: 'Av. Manuel Montt',
  streetNumber: '427',
  apartment: '',
  city: 'Providencia',
};

const comunas = ['Providencia', 'Las Condes', 'Santiago Centro'];

describe('validateContactForm', () => {
  it('returns no errors for a fully valid form', () => {
    expect(validateContactForm(validValues, comunas)).toEqual({});
  });

  it('rejects a blank name', () => {
    const errors = validateContactForm({ ...validValues, name: '' }, comunas);
    expect(errors.name).toBeDefined();
  });

  it('rejects a single-word name (no last name)', () => {
    const errors = validateContactForm({ ...validValues, name: 'Matías' }, comunas);
    expect(errors.name).toBeDefined();
  });

  it('rejects a name with digits', () => {
    const errors = validateContactForm({ ...validValues, name: 'Matias123' }, comunas);
    expect(errors.name).toBeDefined();
  });

  it.each(['not-an-email', 'asdf@asdf', '@example.com', 'foo@'])(
    'rejects invalid email %s',
    (email) => {
      expect(validateContactForm({ ...validValues, email }, comunas).email).toBeDefined();
    }
  );

  it('accepts a valid email', () => {
    expect(validateContactForm(validValues, comunas).email).toBeUndefined();
  });

  it.each(['asdf', '123', '+56 2 1234 5678', '12345'])(
    'rejects invalid Chilean phone %s',
    (phone) => {
      expect(validateContactForm({ ...validValues, phone }, comunas).phone).toBeDefined();
    }
  );

  it.each(['+56 9 1234 5678', '56912345678', '9 1234 5678', '+569 1234 5678'])(
    'accepts valid Chilean mobile phone format %s',
    (phone) => {
      expect(validateContactForm({ ...validValues, phone }, comunas).phone).toBeUndefined();
    }
  );

  it('rejects a blank street', () => {
    expect(validateContactForm({ ...validValues, street: '  ' }, comunas).street).toBeDefined();
  });

  it('rejects a non-numeric street number', () => {
    expect(
      validateContactForm({ ...validValues, streetNumber: 'abc' }, comunas).streetNumber
    ).toBeDefined();
  });

  it('accepts a street number with a letter suffix', () => {
    expect(
      validateContactForm({ ...validValues, streetNumber: '427b' }, comunas).streetNumber
    ).toBeUndefined();
  });

  it('rejects a comuna not in the known list', () => {
    expect(validateContactForm({ ...validValues, city: 'Marte' }, comunas).city).toBeDefined();
  });

  it('accepts a known comuna case-insensitively', () => {
    expect(
      validateContactForm({ ...validValues, city: 'PROVIDENCIA' }, comunas).city
    ).toBeUndefined();
  });

  it('falls back to just requiring non-empty when the comuna list is empty', () => {
    expect(validateContactForm({ ...validValues, city: 'Cualquier Comuna' }, []).city).toBeUndefined();
    expect(validateContactForm({ ...validValues, city: '' }, []).city).toBeDefined();
  });
});

describe('isContactFormValid', () => {
  it('is true for a valid form', () => {
    expect(isContactFormValid(validValues, comunas)).toBe(true);
  });

  it('is false when any field is invalid', () => {
    expect(isContactFormValid({ ...validValues, email: 'bad' }, comunas)).toBe(false);
  });
});
