import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck,
  Check, Loader2, ChevronLeft,
} from 'lucide-react';
import { HttpTypes } from '@medusajs/types';
import type { Stripe, StripeCardElement } from '@stripe/stripe-js';
import { useCart } from '../context/CartContext';
import { getStripe } from '../lib/stripe';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckoutStep = 'cart' | 'address' | 'shipping' | 'payment';

export const currency = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

// Second line of defense against pp_system_default (Medusa's manual/no-op
// provider, which authorizes without charging) ever reaching a real
// customer: even if a region was seeded with it, this allowlist keeps it
// out of the checkout UI in production. See seed-chile.ts for the matching
// server-side guard (it's only ever seeded when NODE_ENV !== "production").
export const ALLOWED_PAYMENT_PROVIDER_IDS = ['webpay', 'mercadopago', 'stripe'];

export function isAllowedPaymentProvider(
  providerId: string,
  allowSystemDefault: boolean = import.meta.env.DEV
): boolean {
  const allowed = allowSystemDefault
    ? [...ALLOWED_PAYMENT_PROVIDER_IDS, 'system_default']
    : ALLOWED_PAYMENT_PROVIDER_IDS;
  return allowed.some((id) => providerId.includes(id));
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    updateItemQuantity,
    removeItem,
    updateCartDetails,
    addPromotionCode,
    listShippingOptions,
    addShippingMethod,
    listPaymentProviders,
    initiatePaymentSession,
    completeCart,
  } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const [contact, setContact] = useState({ name: '', email: '', phone: '', address: '', city: '' });
  const [shippingOptions, setShippingOptions] = useState<HttpTypes.StoreCartShippingOption[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState<string | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<HttpTypes.StorePaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const stripeCardContainerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const stripeCardRef = useRef<StripeCardElement | null>(null);
  const isStripeSelected = !!selectedProvider?.includes('stripe');

  // Modal accessibility: Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (step !== 'shipping' || !cart) return;
    listShippingOptions().then(setShippingOptions).catch(() => setShippingOptions([]));
  }, [step, cart, listShippingOptions]);

  useEffect(() => {
    if (step !== 'payment') return;
    listPaymentProviders()
      .then((providers) => setPaymentProviders(providers.filter((p) => isAllowedPaymentProvider(p.id))))
      .catch(() => setPaymentProviders([]));
  }, [step, listPaymentProviders]);

  // Stripe requires collecting the card client-side (PCI compliance) before
  // authorizePayment on the backend can confirm the PaymentIntent.
  useEffect(() => {
    if (!isStripeSelected || !stripeCardContainerRef.current) return;

    let cancelled = false;
    getStripe().then((stripe) => {
      if (cancelled || !stripe || !stripeCardContainerRef.current) return;
      stripeRef.current = stripe;
      const elements = stripe.elements();
      const card = elements.create('card', {
        style: { base: { color: '#fff', '::placeholder': { color: '#737373' } } },
      });
      card.mount(stripeCardContainerRef.current);
      stripeCardRef.current = card;
    });

    return () => {
      cancelled = true;
      stripeCardRef.current?.unmount();
      stripeCardRef.current = null;
    };
  }, [isStripeSelected]);

  const items = cart?.items ?? [];
  const itemSubtotal = cart?.item_subtotal ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const shippingTotal = cart?.shipping_total ?? 0;
  const total = cart?.total ?? 0;
  const hasShippingMethod = (cart?.shipping_methods?.length ?? 0) > 0;

  const freeShippingThreshold = 50000;
  const missingForFreeShipping = Math.max(0, freeShippingThreshold - itemSubtotal);
  const freeShippingProgress = Math.min(100, (itemSubtotal / freeShippingThreshold) * 100);

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim();
    if (!clean) return;
    const result = await addPromotionCode(clean);
    setCouponFeedback({ type: result.success ? 'success' : 'error', message: result.message });
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const [first_name, ...rest] = contact.name.trim().split(' ');
      await updateCartDetails({
        email: contact.email,
        shipping_address: {
          first_name: first_name || contact.name,
          last_name: rest.join(' ') || first_name || contact.name,
          address_1: contact.address,
          city: contact.city,
          country_code: 'cl',
          phone: contact.phone,
        },
      });
      setStep('shipping');
    } catch {
      setCheckoutError('No pudimos guardar tu dirección. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectShippingOption = async (optionId: string) => {
    setSelectedShippingOption(optionId);
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      await addShippingMethod(optionId);
    } catch {
      setCheckoutError('No pudimos calcular el envío para esa opción.');
      setSelectedShippingOption(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!selectedProvider) return;
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const { payment_collection } = await initiatePaymentSession(selectedProvider);
      const session = payment_collection.payment_sessions?.find(
        (s) => s.provider_id === selectedProvider
      );
      const sessionData = session?.data as Record<string, unknown> | undefined;

      // Webpay/MercadoPago devuelven una URL de redirección en session.data.
      // pp_system_default (el provider manual de Medusa) no requiere nada de
      // esto y se completa directo.
      const redirectUrl = sessionData?.init_point ?? sessionData?.url;
      if (typeof redirectUrl === 'string') {
        window.location.href = redirectUrl;
        return;
      }

      // Stripe: confirmar la tarjeta en el cliente antes de completar el
      // carrito, o authorizePayment en el backend no verá un pago autorizado.
      if (isStripeSelected) {
        const clientSecret = sessionData?.client_secret as string | undefined;
        if (!clientSecret || !stripeRef.current || !stripeCardRef.current) {
          setCheckoutError('No se pudo cargar el formulario de tarjeta. Intenta de nuevo.');
          return;
        }
        const { error: stripeError } = await stripeRef.current.confirmCardPayment(clientSecret, {
          payment_method: { card: stripeCardRef.current },
        });
        if (stripeError) {
          setCheckoutError(stripeError.message ?? 'La tarjeta fue rechazada.');
          return;
        }
      }

      const result = await completeCart();
      if (result.type === 'order') {
        onClose();
        navigate(`/pedido/${result.order.id}`);
      } else {
        setCheckoutError(result.error?.message ?? 'No pudimos procesar el pago. Intenta de nuevo.');
      }
    } catch (err) {
      // This is the checkout payment path — unlike the other silent catches
      // in this file, a failure here is worth knowing about even when the
      // customer never reports it.
      Sentry.captureException(err);
      setCheckoutError(err instanceof Error ? err.message : 'No pudimos procesar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setCheckoutError(null);
    if (step === 'address') setStep('cart');
    else if (step === 'shipping') setStep('address');
    else if (step === 'payment') setStep('shipping');
  };

  const stepTitle: Record<CheckoutStep, string> = {
    cart: 'Tu Carrito',
    address: 'Dirección de Envío',
    shipping: 'Método de Envío',
    payment: 'Método de Pago',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-drawer-title"
              className="w-screen max-w-md bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col justify-between text-neutral-100"
            >

              {/* Cart Header */}
              <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {step !== 'cart' && (
                    <button
                      onClick={goBack}
                      className="p-1.5 -ml-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                      aria-label="Volver"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-lime-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="cart-drawer-title" className="font-bold text-lg uppercase font-display tracking-wide text-white">
                      {stepTitle[step]}
                    </h3>
                    {step === 'cart' && (
                      <span className="text-xs text-neutral-400">
                        {items.length} {items.length === 1 ? 'producto' : 'productos'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                  aria-label="Cerrar carrito"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free Shipping Progress Bar */}
              {step === 'cart' && (
                <div className="bg-neutral-900/90 px-5 py-3 border-b border-neutral-800 text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-mono">
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <Truck className="w-3.5 h-3.5 text-lime-400" />
                      {missingForFreeShipping === 0 ? (
                        <span className="text-lime-400 font-bold">¡Tienes Envío Gratis Desbloqueado!</span>
                      ) : (
                        <span>Faltan <strong className="text-white">{currency(missingForFreeShipping)}</strong> para Envío Gratis</span>
                      )}
                    </span>
                    <span className="text-neutral-400 font-bold">{freeShippingProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-500 to-lime-300 transition-all duration-300"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {step === 'cart' && (
                  items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold font-display uppercase tracking-wide text-neutral-300">
                        Tu carrito está vacío
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                        Agrega tu Proteína Premium o accesorios de entrenamiento para comenzar.
                      </p>
                      <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-lime-400 text-xs font-bold uppercase font-display tracking-wider"
                      >
                        Explorar Productos
                      </button>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex gap-3 items-center"
                      >
                        <img
                          src={item.thumbnail ?? ''}
                          alt={item.product_title ?? ''}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover bg-neutral-950 border border-neutral-800 flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight truncate">
                            {item.product_title}
                          </h4>
                          {item.variant_title && item.variant_title !== 'Único' && (
                            <div className="text-[10px] text-lime-400 font-mono">
                              {item.variant_title}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-bold text-sm text-white font-display">
                              {currency(item.total ?? 0)}
                            </span>

                            <div className="flex items-center border border-neutral-700 rounded-lg bg-neutral-950">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                                aria-label="Restar unidad"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-mono font-bold px-2">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                                aria-label="Sumar unidad"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors flex-shrink-0"
                          aria-label={`Eliminar ${item.product_title} del carrito`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )
                )}

                {step === 'address' && (
                  <form onSubmit={handleAddressSubmit} className="space-y-3">
                    <Field label="Nombre Completo" value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} placeholder="Ej: Matías Silva" autoComplete="name" />
                    <Field label="Correo Electrónico" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} placeholder="tu@email.com" type="email" autoComplete="email" />
                    <Field label="Teléfono / WhatsApp" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} placeholder="+56 9 1234 5678" type="tel" autoComplete="tel" />
                    <Field label="Dirección de Entrega" value={contact.address} onChange={(v) => setContact({ ...contact, address: v })} placeholder="Calle, número, depto" autoComplete="street-address" />
                    <Field label="Ciudad / Comuna" value={contact.city} onChange={(v) => setContact({ ...contact, city: v })} placeholder="Ej: Las Condes, Santiago" autoComplete="address-level2" />

                    {checkoutError && <p className="text-rose-400 text-xs">{checkoutError}</p>}

                    <SubmitButton loading={isSubmitting} label="Continuar a Envío" />
                  </form>
                )}

                {step === 'shipping' && (
                  <div className="space-y-3">
                    {shippingOptions.length === 0 ? (
                      <p className="text-neutral-500 text-xs">Cargando opciones de envío...</p>
                    ) : (
                      shippingOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectShippingOption(option.id)}
                          disabled={isSubmitting}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                            selectedShippingOption === option.id
                              ? 'border-lime-400 bg-lime-400/10'
                              : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-600'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-white">{option.name}</p>
                          </div>
                          <span className="text-lime-400 font-mono text-sm font-bold">
                            {currency(option.calculated_price?.calculated_amount ?? 0)}
                          </span>
                        </button>
                      ))
                    )}

                    {checkoutError && <p className="text-rose-400 text-xs">{checkoutError}</p>}

                    <SubmitButton
                      loading={isSubmitting}
                      disabled={!hasShippingMethod}
                      label="Continuar a Pago"
                      onClick={() => setStep('payment')}
                    />
                  </div>
                )}

                {step === 'payment' && (
                  <div className="space-y-3">
                    {paymentProviders.length === 0 ? (
                      <p className="text-neutral-500 text-xs">Cargando métodos de pago...</p>
                    ) : (
                      paymentProviders.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedProvider(provider.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                            selectedProvider === provider.id
                              ? 'border-lime-400 bg-lime-400/10'
                              : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-600'
                          }`}
                        >
                          <span className="text-sm font-bold text-white">{formatProviderName(provider.id)}</span>
                          {selectedProvider === provider.id && <Check className="w-4 h-4 text-lime-400" />}
                        </button>
                      ))
                    )}

                    {isStripeSelected && (
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700">
                        <div ref={stripeCardContainerRef} />
                      </div>
                    )}

                    {checkoutError && <p className="text-rose-400 text-xs">{checkoutError}</p>}

                    <SubmitButton
                      loading={isSubmitting}
                      disabled={!selectedProvider}
                      label={`PAGAR AHORA (${currency(total)})`}
                      onClick={handlePay}
                    />
                  </div>
                )}

              </div>

              {/* Cart Footer Summary */}
              {step === 'cart' && items.length > 0 && (
                <div className="p-5 border-t border-neutral-800 bg-neutral-950 space-y-3">

                  <div>
                    <form onSubmit={applyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Código de descuento"
                        className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 font-mono uppercase focus:outline-none focus:border-lime-400"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold font-display uppercase tracking-wider transition-colors"
                      >
                        Aplicar
                      </button>
                    </form>

                    {couponFeedback.message && (
                      <div
                        className={`mt-2 text-[11px] font-mono px-2.5 py-1.5 rounded border ${
                          couponFeedback.type === 'success'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                        role="alert"
                      >
                        {couponFeedback.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs font-mono pt-1">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal</span>
                      <span>{currency(itemSubtotal)}</span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-lime-400">
                        <span>Descuento</span>
                        <span>-{currency(discountTotal)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-400">
                      <span>Despacho</span>
                      <span>Se calcula en el siguiente paso</span>
                    </div>

                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800 font-display">
                      <span className="uppercase">TOTAL</span>
                      <span className="text-lime-400 text-xl font-black">
                        {currency(cart?.total ?? itemSubtotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    id="cart-checkout-btn"
                    onClick={() => setStep('address')}
                    className="w-full py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black uppercase font-display text-base tracking-wider shadow-[0_0_25px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>FINALIZAR COMPRA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                    <span>Pago seguro · Despacho a todo Chile</span>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

function Field({
  label, value, onChange, placeholder, type = 'text', autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">{label}</label>
      <input
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
      />
    </div>
  );
}

function SubmitButton({
  loading, disabled, label, onClick,
}: {
  loading: boolean; disabled?: boolean; label: string; onClick?: () => void;
}) {
  return (
    <div className="pt-2">
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={loading || disabled}
        className={`w-full py-3.5 rounded-xl font-black uppercase font-display text-base tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
          loading || disabled
            ? 'bg-lime-400/40 text-neutral-900 cursor-not-allowed'
            : 'bg-lime-400 hover:bg-lime-300 text-neutral-950 active:scale-[0.98]'
        }`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{label}</span>}
      </button>
    </div>
  );
}

export function formatProviderName(providerId: string): string {
  if (providerId.includes('webpay')) return 'Webpay Plus';
  if (providerId.includes('mercadopago')) return 'Mercado Pago';
  if (providerId.includes('stripe')) return 'Tarjeta de Crédito/Débito (Stripe)';
  if (providerId.includes('system_default')) return 'Pago de prueba (modo desarrollo)';
  return providerId;
}
