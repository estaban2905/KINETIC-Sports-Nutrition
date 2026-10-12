import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { CART_ID_KEY, useCart } from '../context/CartContext';
import { completeWithRetries } from '../lib/confirmCheckout';

/**
 * Landing point for redirect-based payment providers (Webpay, Mercado Pago
 * Checkout Pro). The customer's browser is redirected here after paying on
 * the provider's site; this page finishes the checkout by calling
 * cart.complete(), which triggers the provider's authorizePayment() on the
 * backend (Webpay commits the transaction, Mercado Pago looks up the
 * payment by external_reference).
 *
 * It never ends in a dead spinner: if the cart can't be found, or the payment
 * can't be confirmed yet, the customer gets a clear message and a way out.
 */
type Status = 'confirming' | 'no-cart' | 'unconfirmed';

const CART_WAIT_MS = 10000;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

export function ConfirmCheckoutPage() {
  const [searchParams] = useSearchParams();
  const { cart, completeCart } = useCart();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('confirming');
  const [detail, setDetail] = useState<string | undefined>();
  const attempted = useRef(false);

  const cancelled = searchParams.get('cancelled') === '1';

  // No stored cart id at all (other browser/webview, already completed and
  // cleared, storage wiped): nothing will ever load, so don't wait for it.
  // Otherwise give the cart request a bounded time to arrive.
  useEffect(() => {
    if (cancelled || cart || status !== 'confirming') return;
    let hasStoredCart = false;
    try {
      hasStoredCart = !!localStorage.getItem(CART_ID_KEY);
    } catch {
      /* storage blocked: treated as no cart */
    }
    const timer = setTimeout(() => setStatus('no-cart'), hasStoredCart ? CART_WAIT_MS : 0);
    return () => clearTimeout(timer);
  }, [cart, cancelled, status]);

  useEffect(() => {
    if (cancelled || attempted.current || !cart) return;
    attempted.current = true;
    completeWithRetries(completeCart).then((outcome) => {
      if (outcome.kind === 'order') {
        navigate(`/pedido/${outcome.orderId}`, { replace: true });
      } else {
        setDetail(outcome.message);
        setStatus('unconfirmed');
      }
    });
  }, [cart, cancelled, completeCart, navigate]);

  if (cancelled) {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-neutral-600" />
        <p className="text-neutral-300">Cancelaste el pago. Tu carrito sigue guardado.</p>
        <Link to="/?carrito=1" className="text-lime-400 underline">Volver a mi carrito</Link>
      </Shell>
    );
  }

  if (status === 'no-cart') {
    return (
      <Shell>
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <p className="text-neutral-200 font-medium">No encontramos un pago pendiente en este navegador.</p>
        <p className="text-neutral-400 text-sm max-w-md">
          Si ya pagaste, tu pedido está registrado: revisa el correo de confirmación o consúltalo en
          seguimiento con tu número de pedido. Si no pagaste, tu carrito puede haber expirado.
        </p>
        <Link to="/seguimiento" className="text-lime-400 underline">Consultar mi pedido</Link>
        <Link to="/" className="text-neutral-400 underline text-sm">Volver a la tienda</Link>
      </Shell>
    );
  }

  if (status === 'unconfirmed') {
    return (
      <Shell>
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <p className="text-neutral-200 font-medium">Todavía no podemos confirmar tu pago.</p>
        <p className="text-neutral-400 text-sm max-w-md">
          Puede estar en proceso. Si el cobro aparece en tu cuenta, no vuelvas a pagar: te enviaremos un
          correo apenas se confirme, y también puedes revisarlo en seguimiento.
        </p>
        {detail && <p className="text-neutral-500 text-xs max-w-md">{detail}</p>}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-lime-400 hover:bg-lime-300 text-neutral-950 px-6 py-2.5 rounded-lg font-semibold transition"
        >
          Reintentar confirmación
        </button>
        <Link to="/seguimiento" className="text-lime-400 underline">Consultar mi pedido</Link>
        <Link to="/" className="text-neutral-400 underline text-sm">Volver a la tienda</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
      <p className="text-neutral-400">Confirmando tu pago...</p>
    </Shell>
  );
}
