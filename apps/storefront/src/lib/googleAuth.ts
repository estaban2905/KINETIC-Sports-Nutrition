/** Lee el payload de un JWT (sin verificar la firma: eso lo hace el backend). */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export interface GoogleProfile {
  email: string;
  first_name: string;
  last_name: string;
}

/**
 * Token de Medusa tras el callback de Google. Si `actor_id` viene vacío, la
 * identidad existe pero todavía no hay un cliente asociado y hay que crearlo
 * con los datos del perfil de Google (user_metadata).
 */
export function readGoogleToken(token: string): { needsCustomer: boolean; profile: GoogleProfile | null } {
  const payload = decodeJwtPayload(token);
  if (!payload) return { needsCustomer: false, profile: null };

  const needsCustomer = !payload.actor_id;
  const meta = payload.user_metadata ?? {};
  const email = typeof meta.email === 'string' ? meta.email : '';
  if (!email) return { needsCustomer, profile: null };

  const fullName = typeof meta.name === 'string' ? meta.name.trim() : '';
  const [fallbackFirst = '', ...rest] = fullName.split(/\s+/);
  const first = (typeof meta.given_name === 'string' && meta.given_name) || fallbackFirst || email.split('@')[0];
  const last = (typeof meta.family_name === 'string' && meta.family_name) || rest.join(' ');

  return { needsCustomer, profile: { email, first_name: first, last_name: last } };
}
