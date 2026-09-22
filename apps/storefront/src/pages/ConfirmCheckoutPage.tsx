import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

/**
 * Landing point for redirect-based payment providers (Webpay, Mercado Pago
 * Checkout Pro). The customer's browser is redirected here after paying on
 * the provider's site; this page finishes the checkout by calling
 * cart.complete(), which triggers the provider's authorizePayment() on the
 * backend (Webpay commits the transaction, Mercado Pago looks up the
 * payment by external_reference).
 */
export function ConfirmCheckoutPage() {
  const [searchParams] = useSearchParams();
  const { cart, completeCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const cancelled = searchParams.get('cancelled') === '1';

  useEffect(() => {
    if (cancelled || attempted.current) return;
    // CartContext loads the cart from localStorage asynchronously on mount;
    // wait for it before trying to complete it.
    if (!cart) return;

    attempted.current = true;
    completeCart()
      .then((result) => {
        if (result.type === 'order') {
          navigate(`/pedido/${result.order.id}`, { replace: true });
        } else {
          setError(result.error?.message ?? 'El pago no pudo confirmarse. Intenta de nuevo.');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'El pago no pudo confirmarse.');
      });
  }, [cart, cancelled, completeCart, navigate]);

  if (cancelled) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <XCircle className="w-12 h-12 text-neutral-600" />
        <p className="text-neutral-300">Cancelaste el pago. Tu carrito sigue guardado.</p>
        <Link to="/" className="text-lime-400 underline">Volver a la tienda</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <XCircle className="w-12 h-12 text-rose-500" />
        <p className="text-neutral-300">{error}</p>
        <Link to="/" className="text-lime-400 underline">Volver a la tienda</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
      <p className="text-neutral-400">Confirmando tu pago...</p>
    </div>
  );
}
