import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { HttpTypes } from "@medusajs/types";
import { medusa, getChileRegion, resolveVariantId } from "../lib/medusa";
import { Product, ProductFlavor, ProductSize } from "../types";

const CART_ID_KEY = "kinetic_cart_id";

/**
 * `fetch` throws a generic "Failed to fetch" (or similar) when the backend
 * is unreachable — e.g. `apps/backend` isn't running. That message is
 * useless to a shopper, so it's replaced with an actionable one instead of
 * being shown as-is.
 */
function describeCartError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|networkerror|load failed|ECONNREFUSED/i.test(message)) {
    return "No pudimos conectar con el servidor de la tienda. Verifica que el backend (apps/backend) esté corriendo en " +
      (import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000") + ".";
  }
  return message || "No se pudo agregar el producto al carrito.";
}

interface CartContextValue {
  cart: HttpTypes.StoreCart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  addItem: (
    product: Product,
    flavor?: ProductFlavor,
    size?: ProductSize,
    quantity?: number
  ) => Promise<void>;
  updateItemQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateCartDetails: (body: HttpTypes.StoreUpdateCart) => Promise<HttpTypes.StoreCart>;
  addPromotionCode: (code: string) => Promise<{ success: boolean; message: string }>;
  listShippingOptions: () => Promise<HttpTypes.StoreCartShippingOption[]>;
  addShippingMethod: (optionId: string) => Promise<void>;
  listPaymentProviders: () => Promise<HttpTypes.StorePaymentProvider[]>;
  initiatePaymentSession: (
    providerId: string
  ) => Promise<HttpTypes.StorePaymentCollectionResponse>;
  completeCart: () => Promise<HttpTypes.StoreCompleteCartResponse>;
  resetCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cartId = localStorage.getItem(CART_ID_KEY);
    if (!cartId) return;

    medusa.store.cart
      .retrieve(cartId)
      .then(({ cart }) => setCart(cart))
      .catch(() => {
        // Cart no longer exists (completed, expired) — start fresh next time.
        localStorage.removeItem(CART_ID_KEY);
      });
  }, []);

  const ensureCart = useCallback(async (): Promise<HttpTypes.StoreCart> => {
    if (cart) return cart;

    const existingId = localStorage.getItem(CART_ID_KEY);
    if (existingId) {
      try {
        const { cart: existing } = await medusa.store.cart.retrieve(existingId);
        setCart(existing);
        return existing;
      } catch {
        localStorage.removeItem(CART_ID_KEY);
      }
    }

    const region = await getChileRegion();
    const { cart: created } = await medusa.store.cart.create({
      region_id: region.id,
    });
    localStorage.setItem(CART_ID_KEY, created.id);
    setCart(created);
    return created;
  }, [cart]);

  const addItem = useCallback(
    async (
      product: Product,
      flavor?: ProductFlavor,
      size?: ProductSize,
      quantity: number = 1
    ) => {
      setLoading(true);
      setError(null);
      try {
        const activeCart = await ensureCart();
        const variant_id = await resolveVariantId(product, flavor, size);
        const { cart: updated } = await medusa.store.cart.createLineItem(
          activeCart.id,
          { variant_id, quantity }
        );
        setCart(updated);
      } catch (err) {
        setError(describeCartError(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [ensureCart]
  );

  const updateItemQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      setLoading(true);
      setError(null);
      try {
        if (quantity <= 0) {
          const { parent } = await medusa.store.cart.deleteLineItem(cart.id, lineItemId);
          setCart(parent as HttpTypes.StoreCart);
        } else {
          const { cart: updated } = await medusa.store.cart.updateLineItem(
            cart.id,
            lineItemId,
            { quantity }
          );
          setCart(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar la cantidad.");
      } finally {
        setLoading(false);
      }
    },
    [cart]
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      setLoading(true);
      try {
        const { parent } = await medusa.store.cart.deleteLineItem(cart.id, lineItemId);
        setCart(parent as HttpTypes.StoreCart);
      } finally {
        setLoading(false);
      }
    },
    [cart]
  );

  const updateCartDetails = useCallback(
    async (body: HttpTypes.StoreUpdateCart) => {
      const activeCart = await ensureCart();
      const { cart: updated } = await medusa.store.cart.update(activeCart.id, body);
      setCart(updated);
      return updated;
    },
    [ensureCart]
  );

  const addPromotionCode = useCallback(
    async (code: string) => {
      if (!cart) return { success: false, message: "No hay un carrito activo." };
      const before = cart.promotions?.length ?? 0;
      try {
        const { cart: updated } = await medusa.store.cart.addPromotions(cart.id, {
          promo_codes: [code],
        });
        setCart(updated);
        const applied = (updated.promotions?.length ?? 0) > before;
        return applied
          ? { success: true, message: "¡Cupón aplicado con éxito!" }
          : { success: false, message: "Cupón no válido o expirado." };
      } catch {
        return { success: false, message: "Cupón no válido o expirado." };
      }
    },
    [cart]
  );

  const listShippingOptions = useCallback(async () => {
    if (!cart) return [];
    const { shipping_options } = await medusa.store.fulfillment.listCartOptions({
      cart_id: cart.id,
    });
    return shipping_options;
  }, [cart]);

  const addShippingMethod = useCallback(
    async (optionId: string) => {
      if (!cart) return;
      const { cart: updated } = await medusa.store.cart.addShippingMethod(cart.id, {
        option_id: optionId,
      });
      setCart(updated);
    },
    [cart]
  );

  const listPaymentProviders = useCallback(async () => {
    const region = await getChileRegion();
    const { payment_providers } = await medusa.store.payment.listPaymentProviders({
      region_id: region.id,
    });
    return payment_providers;
  }, []);

  const initiatePaymentSession = useCallback(
    async (providerId: string) => {
      if (!cart) throw new Error("No hay un carrito activo.");
      return medusa.store.payment.initiatePaymentSession(cart, {
        provider_id: providerId,
      });
    },
    [cart]
  );

  const completeCart = useCallback(async () => {
    if (!cart) throw new Error("No hay un carrito activo.");
    const result = await medusa.store.cart.complete(cart.id);
    if (result.type === "order") {
      localStorage.removeItem(CART_ID_KEY);
      setCart(null);
    }
    return result;
  }, [cart]);

  const resetCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY);
    setCart(null);
    setError(null);
  }, []);

  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        addItem,
        updateItemQuantity,
        removeItem,
        updateCartDetails,
        addPromotionCode,
        listShippingOptions,
        addShippingMethod,
        listPaymentProviders,
        initiatePaymentSession,
        completeCart,
        resetCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
