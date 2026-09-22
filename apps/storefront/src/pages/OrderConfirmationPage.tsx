import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { HttpTypes } from '@medusajs/types';
import { medusa } from '../lib/medusa';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<HttpTypes.StoreOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    medusa.store.order
      .retrieve(orderId, { fields: '*items,*shipping_address,*payment_collections,*fulfillments' })
      .then(({ order }) => setOrder(order))
      .catch(() => setError('No pudimos encontrar ese pedido. Revisa el enlace o contáctanos.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <p className="text-neutral-400">Cargando tu pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <PackageSearch className="w-12 h-12 text-neutral-600" />
        <p className="text-neutral-300">{error ?? 'Pedido no encontrado.'}</p>
        <Link to="/" className="text-lime-400 underline">Volver a la tienda</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <CheckCircle2 className="w-14 h-14 text-lime-400 mb-4" />
          <h1 className="text-2xl font-display uppercase tracking-wide">¡Pedido confirmado!</h1>
          <p className="text-neutral-400 mt-2">
            Pedido <span className="text-lime-400 font-mono">#{order.display_id}</span>
          </p>
          <p className="text-neutral-500 text-sm mt-1">
            Te enviamos la confirmación a {order.email}
          </p>
        </div>

        <div className="border-t border-neutral-800 pt-6 space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-neutral-300">{item.product_title} · {item.variant_title} × {item.quantity}</span>
              <span className="text-neutral-100">{currencyFormatter.format(item.total ?? 0)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-800 mt-6 pt-6 space-y-2 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal</span>
            <span>{currencyFormatter.format(order.item_subtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Envío</span>
            <span>{currencyFormatter.format(order.shipping_total ?? 0)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-neutral-100 pt-2">
            <span>Total</span>
            <span>{currencyFormatter.format(order.total ?? 0)}</span>
          </div>
        </div>

        {order.shipping_address && (
          <div className="border-t border-neutral-800 mt-6 pt-6 text-sm text-neutral-400">
            <p className="text-neutral-300 font-medium mb-1">Dirección de envío</p>
            <p>{order.shipping_address.address_1}, {order.shipping_address.city}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/seguimiento"
            className="w-full text-center bg-neutral-800 hover:bg-neutral-700 text-neutral-100 py-3 rounded-lg font-medium transition"
          >
            Seguir mi pedido más tarde
          </Link>
          <Link
            to="/"
            className="w-full text-center bg-lime-400 hover:bg-lime-300 text-neutral-950 py-3 rounded-lg font-semibold transition"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
