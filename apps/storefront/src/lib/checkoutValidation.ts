export type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment: string;
  city: string;
};

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +56 9 1234 5678, 56912345678, 9 1234 5678, with/without spaces.
const CHILE_MOBILE_REGEX = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]+$/;

/**
 * Validates the checkout contact/address form. `knownComunas` is the list
 * fetched from /store/comunas (see lib/medusa.ts) — when it's non-empty, the
 * customer must pick an exact match instead of typing free text, since that's
 * what makes the Chilexpress coverage lookup in coverage.ts reliably resolve
 * a countyCode instead of silently falling back to the flat shipping rate.
 * When the list is empty (Chilexpress not configured, or the fetch failed),
 * validation degrades to "just don't leave it blank" so checkout still works.
 */
export function validateContactForm(
  values: ContactFormValues,
  knownComunas: string[]
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Ingresa tu nombre completo.";
  } else if (name.split(/\s+/).length < 2) {
    errors.name = "Ingresa nombre y apellido.";
  } else if (!NAME_REGEX.test(name)) {
    errors.name = "El nombre solo puede tener letras.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Ingresa un correo válido.";
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = "Ingresa tu teléfono.";
  } else if (!CHILE_MOBILE_REGEX.test(phone)) {
    errors.phone = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
  }

  const street = values.street.trim();
  if (!street) {
    errors.street = "Ingresa el nombre de la calle.";
  }

  const streetNumber = values.streetNumber.trim();
  if (!streetNumber) {
    errors.streetNumber = "Ingresa el número.";
  } else if (!/^\d+[a-zA-Z]?$/.test(streetNumber)) {
    errors.streetNumber = "Ingresa un número válido.";
  }

  const city = values.city.trim();
  if (!city) {
    errors.city = "Selecciona tu comuna.";
  } else if (
    knownComunas.length > 0 &&
    !knownComunas.some((c) => c.toLowerCase() === city.toLowerCase())
  ) {
    errors.city = "Selecciona una comuna de la lista.";
  }

  return errors;
}

export function isContactFormValid(values: ContactFormValues, knownComunas: string[]): boolean {
  return Object.keys(validateContactForm(values, knownComunas)).length === 0;
}
