import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface UserAddress {
  address_1: string;
  address_2?: string;
  city: string; // Comuna
  province: string; // Región
  postal_code?: string;
}

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

export interface UserOrderItem {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  thumbnail: string;
}

export interface UserOrder {
  id: string;
  displayId: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'canceled';
  paymentStatus: 'captured' | 'not_paid' | 'refunded';
  fulfillmentStatus: 'not_fulfilled' | 'fulfilled' | 'shipped' | 'delivered';
  total: number;
  currencyCode: string;
  trackingCode?: string;
  trackingUrl?: string;
  carrier?: string;
  items: UserOrderItem[];
  shippingAddress: UserAddress;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rut?: string;
  phone?: string;
  shippingAddress?: UserAddress;
  membership?: UserMembership | null;
}

interface AuthContextValue {
  user: User | null;
  orders: UserOrder[];
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginWithGoogle: (customData?: Partial<User>) => Promise<void>;
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  subscribeMembership: (flavorId: string, flavorName: string) => void;
  changeMembershipFlavor: (newFlavorId: string, newFlavorName: string) => void;
  pauseMembership: () => void;
  resumeMembership: () => void;
  cancelMembership: () => void;
  addOrder: (order: UserOrder) => void;
}

const USER_STORAGE_KEY = 'kinetic_auth_user_v1';
const ORDERS_STORAGE_KEY = 'kinetic_auth_orders_v1';

const DEMO_ORDERS: UserOrder[] = [
  {
    id: 'ord_demo_01',
    displayId: '1042',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    paymentStatus: 'captured',
    fulfillmentStatus: 'shipped',
    total: 34390,
    currencyCode: 'clp',
    trackingCode: '99482910482',
    trackingUrl: 'https://www.chilexpress.cl/',
    carrier: 'Chilexpress Prioritario',
    shippingAddress: {
      address_1: 'Av. Providencia 1240, Depto 402',
      city: 'Providencia',
      province: 'Región Metropolitana',
    },
    items: [
      {
        id: 'item_1',
        title: 'PROTEIN X - CFM Whey Isolate (2 LBS)',
        variantTitle: 'Chocolate Suizo / 2 LBS',
        quantity: 1,
        unitPrice: 34390,
        thumbnail: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'ord_demo_02',
    displayId: '1019',
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    paymentStatus: 'captured',
    fulfillmentStatus: 'delivered',
    total: 34390,
    currencyCode: 'clp',
    trackingCode: '99201948110',
    trackingUrl: 'https://www.chilexpress.cl/',
    carrier: 'Chilexpress Estándar',
    shippingAddress: {
      address_1: 'Av. Providencia 1240, Depto 402',
      city: 'Providencia',
      province: 'Región Metropolitana',
    },
    items: [
      {
        id: 'item_2',
        title: 'PROTEIN X - CFM Whey Isolate (2 LBS)',
        variantTitle: 'Vainilla Bourbon / 2 LBS',
        quantity: 1,
        unitPrice: 34390,
        thumbnail: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&auto=format&fit=crop&q=80',
      },
    ],
  },
];

const DEFAULT_MEMBERSHIP: UserMembership = {
  id: 'sub_kt_9941',
  productName: 'PROTEIN X - CFM Whey Isolate',
  flavorName: 'Chocolate Suizo',
  flavorId: 'chocolate-suizo',
  price: 34390,
  originalPrice: 42990,
  discountPercent: 15,
  frequencyDays: 30,
  status: 'active',
  nextBillingDate: '15 de Octubre 2026',
  nextDeliveryEstimate: '17 - 18 de Octubre 2026',
  shippingCarrier: 'Chilexpress Prioritario (Gratis)',
  paymentMethod: 'Tarjeta de Crédito terminada en •••• 4242',
  welcomeGiftIncluded: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState<UserOrder[]>(() => {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEMO_ORDERS;
    } catch {
      return DEMO_ORDERS;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const loginWithGoogle = useCallback(async (customData?: Partial<User>) => {
    // Simulated or real Google authentication profile
    const googleUser: User = {
      id: customData?.id || 'usr_google_' + Math.random().toString(36).substring(2, 9),
      name: customData?.name || 'Maximiliano Poblete',
      email: customData?.email || 'max.poblete2905@gmail.com',
      avatar:
        customData?.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rut: customData?.rut || '18.421.903-5',
      phone: customData?.phone || '+56 9 8412 9012',
      shippingAddress: customData?.shippingAddress || {
        address_1: 'Av. Providencia 1240, Depto 402',
        city: 'Providencia',
        province: 'Región Metropolitana',
        postal_code: '7500000',
      },
      membership: customData?.membership !== undefined ? customData.membership : DEFAULT_MEMBERSHIP,
    };

    setUser(googleUser);
    setIsAuthModalOpen(false);
  }, []);

  const loginWithEmail = useCallback(async (email: string, name?: string) => {
    const formattedName = name?.trim() || email.split('@')[0];
    const newUser: User = {
      id: 'usr_em_' + Math.random().toString(36).substring(2, 9),
      name: formattedName.charAt(0).toUpperCase() + formattedName.slice(1),
      email: email.trim().toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      rut: '',
      phone: '+56 9 ',
      shippingAddress: {
        address_1: '',
        city: 'Santiago',
        province: 'Región Metropolitana',
      },
      membership: null,
    };

    setUser(newUser);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const subscribeMembership = useCallback((flavorId: string, flavorName: string) => {
    const newMembership: UserMembership = {
      id: 'sub_kt_' + Math.random().toString(36).substring(2, 8),
      productName: 'PROTEIN X - CFM Whey Isolate (2 LBS)',
      flavorName,
      flavorId,
      price: 34390,
      originalPrice: 42990,
      discountPercent: 15,
      frequencyDays: 30,
      status: 'active',
      nextBillingDate: '28 de Octubre 2026',
      nextDeliveryEstimate: '30 - 31 de Octubre 2026',
      shippingCarrier: 'Chilexpress Prioritario (Gratis)',
      paymentMethod: 'Tarjeta guardada en Webpay / Oneclick',
      welcomeGiftIncluded: true,
    };

    setUser((prev) => (prev ? { ...prev, membership: newMembership } : null));
  }, []);

  const changeMembershipFlavor = useCallback((newFlavorId: string, newFlavorName: string) => {
    setUser((prev) => {
      if (!prev || !prev.membership) return prev;
      return {
        ...prev,
        membership: {
          ...prev.membership,
          flavorId: newFlavorId,
          flavorName: newFlavorName,
        },
      };
    });
  }, []);

  const pauseMembership = useCallback(() => {
    setUser((prev) => {
      if (!prev || !prev.membership) return prev;
      return {
        ...prev,
        membership: {
          ...prev.membership,
          status: 'paused',
        },
      };
    });
  }, []);

  const resumeMembership = useCallback(() => {
    setUser((prev) => {
      if (!prev || !prev.membership) return prev;
      return {
        ...prev,
        membership: {
          ...prev.membership,
          status: 'active',
        },
      };
    });
  }, []);

  const cancelMembership = useCallback(() => {
    setUser((prev) => {
      if (!prev || !prev.membership) return prev;
      return {
        ...prev,
        membership: {
          ...prev.membership,
          status: 'cancelled',
        },
      };
    });
  }, []);

  const addOrder = useCallback((newOrder: UserOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        orders,
        isAuthenticated: !!user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        loginWithEmail,
        logout,
        updateProfile,
        subscribeMembership,
        changeMembershipFlavor,
        pauseMembership,
        resumeMembership,
        cancelMembership,
        addOrder,
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
