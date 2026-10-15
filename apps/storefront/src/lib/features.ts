/**
 * Flags de funcionalidades aún no listas para producción. Por defecto todo
 * queda apagado; se activa con VITE_ENABLE_*=true en el build.
 */
export const ENABLE_SUBSCRIPTIONS = import.meta.env.VITE_ENABLE_SUBSCRIPTIONS === 'true';
export const ENABLE_ACCOUNTS = import.meta.env.VITE_ENABLE_ACCOUNTS === 'true';
/** Botón "Continuar con Google": requiere GOOGLE_* configurado en el backend. */
export const ENABLE_GOOGLE_LOGIN = ENABLE_ACCOUNTS && import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true';
