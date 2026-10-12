import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, Clock, Check, Copy, ExternalLink } from 'lucide-react';
import { lookupOrder, OrderLookupResult } from '../lib/medusa';
import {
  CHILEXPRESS_TRACKING_URL,
  CUSTOMER_STATUS_COPY,
  PROGRESS_STEPS,
  formatEventDate,
  isStepComplete,
  progressStepIndex,
} from '../lib/orderStatus';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const TONE_CLASSES = {
  progress: 'border-lime-400/40 bg-lime-400/5',
  done: 'border-lime-400 bg-lime-400/10',
  warning: 'border-amber-400/50 bg-amber-400/5',
  canceled: 'border-rose-500/50 bg-rose-500/5',
} as const;

export function OrderLookupPage() {
  const [displayId, setDisplayId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyTrackingNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedNumber(value);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions): the number
      // is still on screen to select by hand.
    }
  };

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

  const statusCopy = order ? CUSTOMER_STATUS_COPY[order.customer_status] : undefined;
  const currentStep = order ? progressStepIndex(order.customer_status) : null;
  const certificateUrl =
    order?.customer_status === 'delivered'
      ? order.fulfillments.find((f) => f.tracking_certificate_url)?.tracking_certificate_url
      : null;
  const trackingLabels = order?.fulfillments.flatMap((f) => f.labels ?? []) ?? [];
  // Chilexpress's own status ("En pre-recepcion"); known before any event exists.
  const shipmentStatus = order?.fulfillments.find((f) => f.tracking_status)?.tracking_status;
  // Newest first, as sent by the backend; merged across fulfillments.
  const trackingEvents = (order?.fulfillments.flatMap((f) => f.tracking_events ?? []) ?? []).sort(
    (a, b) => (b.at ?? '').localeCompare(a.at ?? '')
  );

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
            {statusCopy && (
              <div className={`rounded-xl border p-4 ${TONE_CLASSES[statusCopy.tone]}`} role="status">
                <p className="text-lg font-semibold text-neutral-100">{statusCopy.title}</p>
                <p className="text-sm text-neutral-400 mt-1">{statusCopy.description}</p>
                {certificateUrl && (
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-lime-400 hover:underline"
                  >
                    Ver certificado de entrega <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {currentStep !== null && (
              <ol className="flex items-start justify-between gap-1 pt-1" aria-label="Progreso del pedido">
                {PROGRESS_STEPS.map((step, i) => {
                  const complete = isStepComplete(i, order.customer_status);
                  const current = !complete && i === currentStep;
                  return (
                    <li key={step} className="flex-1 flex flex-col items-center text-center gap-1.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                          complete
                            ? 'bg-lime-400 border-lime-400 text-neutral-950'
                            : current
                              ? 'border-lime-400 text-lime-400'
                              : 'border-neutral-700 text-neutral-600'
                        }`}
                        aria-current={current ? 'step' : undefined}
                      >
                        {complete ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <span className={`text-[11px] ${complete || current ? 'text-neutral-200' : 'text-neutral-600'}`}>
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
              <span className="text-neutral-400 text-sm">Total</span>
              <span className="text-neutral-100 font-semibold">{currencyFormatter.format(order.total)}</span>
            </div>

            {trackingLabels.length > 0 ? (
              <div className="border-t border-neutral-800 pt-4 space-y-2">
                <p className="text-sm text-neutral-300 flex items-center gap-2"><Truck className="w-4 h-4 text-lime-400" /> N° de seguimiento</p>
                {trackingLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-3 flex-wrap">
                    <span className="text-lime-400 font-mono text-sm select-all">{label.tracking_number}</span>
                    <button
                      type="button"
                      onClick={() => copyTrackingNumber(label.tracking_number)}
                      className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-lime-400 border border-neutral-700 rounded-md px-2 py-1"
                    >
                      {copiedNumber === label.tracking_number ? (
                        <><Check className="w-3 h-3" /> Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copiar</>
                      )}
                    </button>
                    <a
                      href={label.tracking_url || CHILEXPRESS_TRACKING_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-lime-400 hover:underline"
                    >
                      Ver en Chilexpress <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
                <p className="text-xs text-neutral-500">
                  En el sitio de Chilexpress pega este número para ver el detalle de tu envío.
                </p>
              </div>
            ) : (
              <div className="border-t border-neutral-800 pt-4 flex items-center gap-2 text-neutral-500 text-sm">
                <Clock className="w-4 h-4" /> Aún no hay número de seguimiento asignado.
              </div>
            )}

            {shipmentStatus && (
              <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <span className="text-neutral-400 text-sm">Estado del envío</span>
                <span className="text-lime-400">{shipmentStatus}</span>
              </div>
            )}

            {trackingEvents.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 space-y-3">
                <p className="text-sm text-neutral-300">Historial del envío</p>
                <ol className="space-y-3">
                  {trackingEvents.map((event, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-lime-400' : 'bg-neutral-600'}`}
                      />
                      <div>
                        <p className={i === 0 ? 'text-neutral-100' : 'text-neutral-400'}>{event.description}</p>
                        {event.at && (
                          <p className="text-neutral-500 text-xs">{formatEventDate(event.at)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
