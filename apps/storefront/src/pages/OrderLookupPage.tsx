import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, CheckCircle2, Clock } from 'lucide-react';
import { lookupOrder, OrderLookupResult } from '../lib/medusa';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  canceled: 'Cancelado',
  not_fulfilled: 'Sin despachar',
  fulfilled: 'Despachado',
  partially_fulfilled: 'Parcialmente despachado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  not_paid: 'Pago pendiente',
  captured: 'Pago confirmado',
};

export function OrderLookupPage() {
  const [displayId, setDisplayId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const result = await lookupOrder(displayId.trim(), email.trim());
      setOrder(result);
    } catch {
      setError('No encontramos un pedido con ese número y correo. Revisa los datos e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const trackingLabels = order?.fulfillments.flatMap((f) => f.labels ?? []) ?? [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="text-neutral-500 text-sm hover:text-lime-400">← Volver a la tienda</Link>

        <h1 className="text-2xl font-display uppercase tracking-wide mt-4 mb-2">Seguimiento de pedido</h1>
        <p className="text-neutral-400 mb-8">
          Ingresa tu número de pedido y el correo con el que compraste.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Número de pedido</label>
            <input
              type="text"
              required
              placeholder="Ej: 1024"
              value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-100 focus:outline-none focus:border-lime-400"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Correo electrónico</label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-100 focus:outline-none focus:border-lime-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-neutral-950 py-3 rounded-lg font-semibold transition"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Buscando...' : 'Buscar pedido'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        {order && (
          <div className="mt-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm">Pedido</span>
              <span className="font-mono text-lime-400">#{order.display_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm">Estado</span>
              <span className="text-neutral-100">{STATUS_LABELS[order.status] ?? order.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm">Pago</span>
              <span className="text-neutral-100">{STATUS_LABELS[order.payment_status] ?? order.payment_status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm">Despacho</span>
              <span className="text-neutral-100">{STATUS_LABELS[order.fulfillment_status] ?? order.fulfillment_status}</span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
              <span className="text-neutral-400 text-sm">Total</span>
              <span className="text-neutral-100 font-semibold">{currencyFormatter.format(order.total)}</span>
            </div>

            {trackingLabels.length > 0 ? (
              <div className="border-t border-neutral-800 pt-4 space-y-2">
                <p className="text-sm text-neutral-300 flex items-center gap-2"><Truck className="w-4 h-4 text-lime-400" /> N° de seguimiento</p>
                {trackingLabels.map((label, i) => (
                  <a
                    key={i}
                    href={label.tracking_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-lime-400 underline font-mono text-sm"
                  >
                    {label.tracking_number}
                  </a>
                ))}
              </div>
            ) : (
              <div className="border-t border-neutral-800 pt-4 flex items-center gap-2 text-neutral-500 text-sm">
                <Clock className="w-4 h-4" /> Aún no hay número de seguimiento asignado.
              </div>
            )}

            {order.fulfillment_status === 'delivered' && (
              <div className="flex items-center gap-2 text-lime-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Entregado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
