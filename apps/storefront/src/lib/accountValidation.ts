import { formatRut, isValidRut } from './checkoutValidation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]+$/;
const CHILE_MOBILE_REGEX = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Ingresa tu correo electrónico.';
  if (!EMAIL_REGEX.test(email)) return 'Ingresa un correo válido.';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Ingresa una contraseña.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return undefined;
}

export type LoginValues = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

export function validateLoginForm(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  // Al ingresar solo se exige que haya algo escrito: la regla de largo es para crearla.
  if (!values.password) errors.password = 'Ingresa tu contraseña.';
  return errors;
}

export type RegisterValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

export function validateRegisterForm(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Ingresa tu nombre.';
  else if (!NAME_REGEX.test(name)) errors.name = 'El nombre solo puede tener letras.';

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const password = validatePassword(values.password);
  if (password) errors.password = password;

  if (!errors.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }
  return errors;
}

export type ResetValues = { password: string; confirmPassword: string };
export type ResetErrors = Partial<Record<keyof ResetValues, string>>;

export function validateResetForm(values: ResetValues): ResetErrors {
  const errors: ResetErrors = {};
  const password = validatePassword(values.password);
  if (password) errors.password = password;
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }
  return errors;
}

export type ProfileValues = { name: string; rut: string; phone: string };
export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

/** RUT y teléfono son opcionales en el perfil, pero si se escriben deben ser válidos. */
export function validateProfileForm(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Ingresa tu nombre.';
  else if (!NAME_REGEX.test(name)) errors.name = 'El nombre solo puede tener letras.';

  if (values.rut.trim() && !isValidRut(values.rut)) errors.rut = 'Ingresa un RUT válido.';

  if (values.phone.trim() && !CHILE_MOBILE_REGEX.test(values.phone.trim())) {
    errors.phone = 'Ingresa un celular chileno válido, ej: +56 9 1234 5678.';
  }
  return errors;
}

/** "Juan Pérez Soto" -> { first_name: "Juan", last_name: "Pérez Soto" }. */
export function splitName(fullName: string): { first_name: string; last_name: string } {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(' ') };
}

export function joinName(first?: string | null, last?: string | null): string {
  return [first, last].map((p) => (p ?? '').trim()).filter(Boolean).join(' ');
}

export function normalizeRutForSave(rut: string): string {
  return rut.trim() ? formatRut(rut) : '';
}

/** Traduce los errores del backend de auth a mensajes para el cliente. */
export function describeAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (/invalid email or password|unauthorized|incorrect/i.test(message)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/already exists|already registered|identity with email/i.test(message)) {
    return 'Ya existe una cuenta con ese correo. Prueba ingresando.';
  }
  if (/rate|too many/i.test(message)) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  return message || 'Ocurrió un error. Inténtalo de nuevo.';
}
