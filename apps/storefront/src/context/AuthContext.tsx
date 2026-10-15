import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HttpTypes } from '@medusajs/types';
import { medusa } from '../lib/medusa';
import { ENABLE_ACCOUNTS } from '../lib/features';
import { initialsAvatar } from '../lib/avatar';
import { joinName, normalizeRutForSave, splitName } from '../lib/accountValidation';
import { readGoogleToken } from '../lib/googleAuth';
import { addressToRemember, billingToRemember, type AddressLike } from '../lib/accountData';
import { CustomerOrderResponse, UserOrder, mapCustomerOrder } from '../lib/accountOrders';

export type { UserOrder, UserOrderItem } from '../lib/accountOrders';

export interface UserMembership {
  id: string;
  productName: string;
  flavorName: string;
  flavorId: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  frequencyDays: number;
  status: 'active' | 'paused' | 'cancelled';
  nextBillingDate: string;
  nextDeliveryEstimate: string;
  shippingCarrier: string;
  paymentMethod: string;
  welcomeGiftIncluded: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rut: string;
  phone: string;
  /** Datos de factura de la última compra con factura (customer.metadata.billing). */
  billing: Record<string, string> | null;
  /**
   * Solo en memoria y detrás de VITE_ENABLE_SUBSCRIPTIONS: todavía no hay
   * cobro recurrente en el backend, así que nada de esto se guarda ni se cobra.
   */
  membership?: UserMembership | null;
}

export type OrdersStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ProfileUpdate {
  name: string;
  rut: string;
  phone: string;
}

interface AuthContextValue {
  user: User | null;
  /** true mientras se revisa si hay una sesión guardada al abrir la página. */
  initializing: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (token: string, email: string, password: string) => Promise<void>;
  /** Redirige a Google; la persona vuelve a /auth/google/callback. */
  startGoogleLogin: () => Promise<void>;
  /** Termina el login con los parámetros que Google puso en la URL de callback. */
  completeGoogleLogin: (query: Record<string, string>) => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  /** Guarda en la cuenta la dirección, el teléfono y la factura usados en una compra. Nunca lanza. */
  rememberCheckoutData: (data: { address?: AddressLike | null; phone?: string | null; billing?: Record<string, string> | null }) => Promise<void>;
  orders: UserOrder[];
  ordersStatus: OrdersStatus;
  refreshOrders: () => Promise<void>;
  addresses: HttpTypes.StoreCustomerAddress[];
  refreshAddresses: () => Promise<void>;
  createAddress: (body: HttpTypes.StoreCreateCustomerAddress) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  subscribeMembership: (flavorId: string, flavorName: string) => void;
  changeMembershipFlavor: (newFlavorId: string, newFlavorName: string) => void;
  pauseMembership: () => void;
  resumeMembership: () => void;
  cancelMembership: () => void;
}

/** Customer de Medusa -> usuario del storefront. */
export function userFromCustomer(customer: HttpTypes.StoreCustomer): User {
  const name = joinName(customer.first_name, customer.last_name);
  return {
    id: customer.id,
    name: name || customer.email.split('@')[0],
    email: customer.email,
    avatar: initialsAvatar(name, customer.email),
    rut: typeof customer.metadata?.rut === 'string' ? customer.metadata.rut : '',
    phone: customer.phone ?? '',
    billing: (customer.metadata?.billing as Record<string, string> | undefined) ?? null,
  };
}

// Claves de la sesión simulada que existió antes de tener cuentas reales. Se
// borran al arrancar para que los visitantes no conserven datos falsos.
const LEGACY_STORAGE_KEYS = ['kinetic_auth_user_v1', 'kinetic_auth_orders_v1'];
try {
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
} catch {
  // localStorage bloqueado: no hay nada que limpiar.
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(ENABLE_ACCOUNTS);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<OrdersStatus>('idle');
  const [addresses, setAddresses] = useState<HttpTypes.StoreCustomerAddress[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Siempre el valor más reciente, para callbacks que se crean una sola vez.
  const userRef = useRef<User | null>(null);
  const addressesRef = useRef<HttpTypes.StoreCustomerAddress[]>([]);
  userRef.current = user;
  addressesRef.current = addresses;

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const loadCustomer = useCallback(async () => {
    const { customer } = await medusa.store.customer.retrieve();
    setUser((prev) => ({ ...userFromCustomer(customer), membership: prev?.membership ?? null }));
    return customer;
  }, []);

  // Restaura la sesión si quedó un token guardado de una visita anterior.
  useEffect(() => {
    if (!ENABLE_ACCOUNTS) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await medusa.client.getToken();
        if (token) await loadCustomer();
      } catch {
        // Token vencido o inválido: se descarta y el visitante sigue como invitado.
        await medusa.client.clearToken().catch(() => undefined);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCustomer]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await medusa.auth.login('customer', 'emailpass', {
        email: email.trim().toLowerCase(),
        password,
      });
      if (typeof result !== 'string') {
        throw new Error('Tu cuenta requiere un paso de verificación adicional que aún no está disponible.');
      }
      await loadCustomer();
      setIsAuthModalOpen(false);
    },
    [loadCustomer]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      // 1) Crea la identidad (devuelve un token de registro, sin cliente todavía).
      await medusa.auth.register('customer', 'emailpass', { email: normalizedEmail, password });
      // 2) Crea el cliente con ese token.
      await medusa.store.customer.create({ email: normalizedEmail, ...splitName(name) });
      // 3) Nuevo login para obtener el token que ya incluye al cliente.
      await medusa.auth.login('customer', 'emailpass', { email: normalizedEmail, password });
      await loadCustomer();
      setIsAuthModalOpen(false);
    },
    [loadCustomer]
  );

  const startGoogleLogin = useCallback(async () => {
    const result = await medusa.auth.login('customer', 'google', {});
    if (typeof result === 'object' && 'location' in result && result.location) {
      window.location.href = result.location;
      return;
    }
    throw new Error('No pudimos iniciar el login con Google.');
  }, []);

  const completeGoogleLogin = useCallback(
    async (query: Record<string, string>) => {
      const token = await medusa.auth.callback('customer', 'google', query);
      if (typeof token !== 'string') throw new Error('No pudimos completar el login con Google.');

      const { needsCustomer, profile } = readGoogleToken(token);
      if (needsCustomer) {
        if (!profile) throw new Error('Google no entregó tu correo electrónico.');
        // Primera vez con Google. Si ya hay una cuenta con ese correo (creada con
        // contraseña) se vincula y se entra directo; si no, se crea el cliente.
        const { linked } = await medusa.client.fetch<{ linked: boolean }>('/store/google-link', {
          method: 'POST',
        });
        if (!linked) {
          await medusa.store.customer.create({
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
          });
        }
        // Token nuevo que ya incluye al cliente.
        await medusa.auth.refresh();
      }
      await loadCustomer();
    },
    [loadCustomer]
  );

  const logout = useCallback(async () => {
    try {
      await medusa.auth.logout();
    } finally {
      await medusa.client.clearToken().catch(() => undefined);
      setUser(null);
      setOrders([]);
      setOrdersStatus('idle');
      setAddresses([]);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await medusa.auth.resetPassword('customer', 'emailpass', { identifier: email.trim().toLowerCase() });
  }, []);

  const completePasswordReset = useCallback(async (token: string, email: string, password: string) => {
    await medusa.auth.updateProvider('customer', 'emailpass', { email: email.trim().toLowerCase(), password }, token);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    const { customer } = await medusa.store.customer.update({
      ...splitName(data.name),
      phone: data.phone.trim() || undefined,
      // El RUT se valida también en el backend (middleware de /store/customers/me).
      metadata: { rut: normalizeRutForSave(data.rut), ...(userRef.current?.billing ? { billing: userRef.current.billing } : {}) },
    });
    setUser((prev) => ({ ...userFromCustomer(customer), membership: prev?.membership ?? null }));
  }, []);

  const refreshOrders = useCallback(async () => {
    setOrdersStatus('loading');
    try {
      const { orders: rows } = await medusa.client.fetch<{ orders: CustomerOrderResponse[] }>(
        '/store/customers/me/orders'
      );
      setOrders(rows.map(mapCustomerOrder));
      setOrdersStatus('ready');
    } catch {
      setOrdersStatus('error');
    }
  }, []);

  const refreshAddresses = useCallback(async () => {
    const { addresses: rows } = await medusa.store.customer.listAddress();
    setAddresses(rows);
  }, []);

  const createAddress = useCallback(
    async (body: HttpTypes.StoreCreateCustomerAddress) => {
      await medusa.store.customer.createAddress(body);
      await refreshAddresses();
    },
    [refreshAddresses]
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      await medusa.store.customer.deleteAddress(addressId);
      await refreshAddresses();
    },
    [refreshAddresses]
  );

  const rememberCheckoutData = useCallback<AuthContextValue['rememberCheckoutData']>(async (data) => {
    const current = userRef.current;
    if (!current) return;
    try {
      const newAddress = addressToRemember(data.address, addressesRef.current);
      if (newAddress) {
        await medusa.store.customer.createAddress(newAddress);
        const { addresses: rows } = await medusa.store.customer.listAddress();
        setAddresses(rows);
      }

      const billing = billingToRemember(data.billing, current.billing);
      const phone = !current.phone && data.phone?.trim() ? data.phone.trim() : undefined;
      if (billing || phone) {
        const { customer } = await medusa.store.customer.update({
          ...(phone ? { phone } : {}),
          // Se manda también el RUT y la factura vigente: no se asume que Medusa
          // conserve las claves de metadata que no vengan en la actualización.
          metadata: {
            rut: normalizeRutForSave(current.rut),
            ...((billing ?? current.billing) ? { billing: (billing ?? current.billing)! } : {}),
          },
        });
        setUser((prev) => ({ ...userFromCustomer(customer), membership: prev?.membership ?? null }));
      }
    } catch {
      // Guardar los datos es una comodidad: nunca debe afectar a la compra.
    }
  }, []);

  // Con sesión iniciada se cargan pedidos y direcciones; sin sesión no queda nada.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    refreshOrders();
    refreshAddresses().catch(() => undefined);
  }, [userId, refreshOrders, refreshAddresses]);

  const updateMembership = (patch: (m: UserMembership) => UserMembership) =>
    setUser((prev) => (prev?.membership ? { ...prev, membership: patch(prev.membership) } : prev));

  const subscribeMembership = useCallback((flavorId: string, flavorName: string) => {
    const membership: UserMembership = {
      id: 'local-' + Math.random().toString(36).substring(2, 8),
      productName: 'PROTEIN X - CFM Whey Isolate (2 LBS)',
      flavorName,
      flavorId,
      price: 34390,
      originalPrice: 42990,
      discountPercent: 15,
      frequencyDays: 30,
      status: 'active',
      nextBillingDate: '',
      nextDeliveryEstimate: '',
      shippingCarrier: 'Chilexpress',
      paymentMethod: '',
      welcomeGiftIncluded: true,
    };
    setUser((prev) => (prev ? { ...prev, membership } : null));
  }, []);

  const changeMembershipFlavor = useCallback(
    (flavorId: string, flavorName: string) => updateMembership((m) => ({ ...m, flavorId, flavorName })),
    []
  );
  const pauseMembership = useCallback(() => updateMembership((m) => ({ ...m, status: 'paused' })), []);
  const resumeMembership = useCallback(() => updateMembership((m) => ({ ...m, status: 'active' })), []);
  const cancelMembership = useCallback(() => updateMembership((m) => ({ ...m, status: 'cancelled' })), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        isAuthenticated: !!user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        requestPasswordReset,
        completePasswordReset,
        startGoogleLogin,
        completeGoogleLogin,
        updateProfile,
        rememberCheckoutData,
        orders,
        ordersStatus,
        refreshOrders,
        addresses,
        refreshAddresses,
        createAddress,
        deleteAddress,
        subscribeMembership,
        changeMembershipFlavor,
        pauseMembership,
        resumeMembership,
        cancelMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
