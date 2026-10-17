import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, CreditCard, Edit2, History, Loader2, Repeat, ShieldCheck, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRODUCTS } from '../data/products';
import { resolveVariantId } from '../lib/medusa';
import {
  Subscription,
  SubscriptionCycle,
  Tone,
  cancelSubscription,
  cardReturnState,
  cycleStatusInfo,
  describeSubscriptionError,
  formatBillingDate,
  isLive,
  listCycles,
  needsCard,
  parseVariantTitle,
  pauseSubscription,
  redirectToTransbank,
  resumeSubscription,
  startCardEnrollment,
  subscriptionStatusInfo,
  updateSubscription,
} from '../lib/subscriptions';

const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const TONE_CLASS: Record<Tone, string> = {
  good: 'bg-lime-400/15 text-lime-400 border border-lime-400/30',
  warning: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  bad: 'bg-red-400/15 text-red-400 border border-red-400/30',
  neutral: 'bg-neutral-700/40 text-neutral-300 border border-neutral-600',
};

const BTN = 'px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50';
const BTN_PRIMARY = `${BTN} bg-lime-400 hover:bg-lime-300 text-neutral-950 border-lime-400 font-bold uppercase font-display tracking-wider`;
const BTN_SECONDARY = `${BTN} bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700`;
const BTN_DANGER = `${BTN} bg-neutral-900 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border-neutral-800`;

/** Producto del catálogo estático al que corresponde la suscripción, y su tamaño actual. */
function catalogEntryFor(sub: Subscription) {
  const product = PRODUCTS.find((p) => p.id === sub.product_handle);
  const { flavor, size } = parseVariantTitle(sub.variant_title);
  return { product, flavor, size, sizeOption: product?.sizes?.find((s) => s.name === size) };
}

const CycleHistory: React.FC<{ subscriptionId: string }> = ({ subscriptionId }) => {
  const [cycles, setCycles] = useState<SubscriptionCycle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCycles(subscriptionId)
      .then((rows) => !cancelled && setCycles(rows))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  if (error) return <p className="text-xs text-red-400">No pudimos cargar el historial.</p>;
  if (!cycles) return <Loader2 className="w-4 h-4 text-lime-400 animate-spin" aria-label="Cargando" />;
  if (!cycles.length) return <p className="text-xs text-neutral-400">Aún no hay cobros.</p>;

  return (
    <ul className="divide-y divide-neutral-800 text-xs">
      {cycles.map((c) => {
        const info = cycleStatusInfo(c.status);
        return (
          <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
            <span className="text-neutral-300">{formatBillingDate(c.date)}</span>
            <span className="flex items-center gap-3">
              {c.amount != null && <span className="font-mono text-neutral-200">{currency.format(c.amount)}</span>}
              <span className={`px-2 py-0.5 rounded-full font-mono ${TONE_CLASS[info.tone]}`}>{info.label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

const SubscriptionCard: React.FC<{
  sub: Subscription;
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
}> = ({ sub, onChanged, notify }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [changingFlavor, setChangingFlavor] = useState(false);

  const status = subscriptionStatusInfo(sub.status);
  const { product, flavor, sizeOption } = catalogEntryFor(sub);
  const canChangeFlavor = !!product?.flavors?.length && (!!sizeOption || !product.sizes?.length);
  const productLabel = sub.product_title ?? 'Tu producto';

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await action();
      await onChanged();
      if (success) notify(success);
    } catch (err) {
      notify(describeSubscriptionError(err));
    } finally {
      setBusy(null);
    }
  };

  const goToCard = () =>
    run('card', async () => {
      const { url, token } = await startCardEnrollment(sub.id);
      redirectToTransbank(url, token);
    });

  const changeFlavor = async (newFlavorId: string) => {
    const newFlavor = product?.flavors?.find((f) => f.id === newFlavorId);
    if (!product || !newFlavor) return;
    setChangingFlavor(false);
    await run(
      'flavor',
      async () => {
        const variantId = await resolveVariantId(product, newFlavor, sizeOption);
        await updateSubscription(sub.id, { variant_id: variantId });
      },
      `Sabor actualizado a ${newFlavor.name} para tu próximo envío.`
    );
  };

  const live = isLive(sub);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {live && <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-neutral-800 relative z-10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl sm:text-2xl font-black font-display uppercase tracking-wide text-white">{productLabel}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${TONE_CLASS[status.tone]}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {sub.variant_title} · x{sub.quantity} · cada {sub.frequency_days} días · {sub.discount_percent}% menos que la compra única
          </p>
        </div>
        {live && sub.next_amount != null && (
          <div className="text-left sm:text-right">
            <span className="text-xs text-neutral-400 block uppercase font-mono">Cobro estimado</span>
            <span className="text-2xl font-black font-display text-lime-400">{currency.format(sub.next_amount)}</span>
          </div>
        )}
      </div>

      {sub.status === 'past_due' && (
        <div role="alert" className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300 relative z-10">
          No pudimos cobrar tu tarjeta y detuvimos la suscripción. Registra una tarjeta vigente y se retomará de inmediato.
        </div>
      )}
      {sub.status === 'pending_card' && (
        <div className="mt-6 p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-sm text-amber-200 relative z-10">
          Tu suscripción está lista, solo falta registrar tu tarjeta. El primer cobro se hace al terminar.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 border-b border-neutral-800 relative z-10">
        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase mb-2">
            <Calendar className="w-4 h-4 text-lime-400" />
            <span>Próximo cobro</span>
          </div>
          <p className="text-lg font-black font-display text-white">
            {sub.status === 'active' ? formatBillingDate(sub.next_billing_date) : '—'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {sub.status === 'paused' ? 'En pausa: no se cobra.' : 'Te avisamos por correo 3 días antes.'}
          </p>
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase mb-2">
              <CreditCard className="w-4 h-4 text-lime-400" />
              <span>Tarjeta</span>
            </div>
            <p className="text-lg font-black font-display text-white">{sub.card?.masked ?? 'Sin tarjeta'}</p>
          </div>
          {live && (
            <button type="button" onClick={goToCard} disabled={busy !== null} className={`${BTN_SECONDARY} mt-3 text-lime-400`}>
              {busy === 'card' ? 'Redirigiendo…' : needsCard(sub) ? 'Registrar tarjeta' : 'Cambiar tarjeta'}
            </button>
          )}
        </div>

        <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-neutral-400 uppercase block mb-2">Sabor</span>
            <p className="text-lg font-black font-display text-white">{flavor || '—'}</p>
          </div>
          {live && canChangeFlavor && (
            <button
              type="button"
              onClick={() => setChangingFlavor(true)}
              disabled={busy !== null}
              className={`${BTN_SECONDARY} mt-3 flex items-center justify-center gap-2 text-lime-400`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{busy === 'flavor' ? 'Guardando…' : 'Cambiar sabor'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="text-xs text-neutral-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-500" />
          <span>Envío gratis con Chilexpress · pausa o cancela cuando quieras</span>
        </div>

        {live && (
          <div className="flex items-center gap-3 flex-wrap">
            {sub.status === 'active' && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('pause', () => pauseSubscription(sub.id), 'Suscripción pausada. No se harán cobros.')}
                className={BTN_SECONDARY}
              >
                Pausar
              </button>
            )}
            {sub.status === 'paused' && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('resume', () => resumeSubscription(sub.id), 'Suscripción reanudada.')}
                className={BTN_PRIMARY}
              >
                Reanudar
              </button>
            )}
            {confirmCancel ? (
              <span className="flex items-center gap-2 text-xs text-neutral-300">
                ¿Cancelar y dar de baja tu tarjeta?
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run('cancel', () => cancelSubscription(sub.id), 'Suscripción cancelada. No habrá más cobros.')}
                  className={`${BTN} bg-red-500/20 text-red-300 border-red-500/40`}
                >
                  Sí, cancelar
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className={BTN_SECONDARY}>
                  No
                </button>
              </span>
            ) : (
              <button type="button" disabled={busy !== null} onClick={() => setConfirmCancel(true)} className={BTN_DANGER}>
                Cancelar suscripción
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-neutral-800 relative z-10">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          className="flex items-center gap-2 text-xs font-mono uppercase text-neutral-400 hover:text-white"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Ocultar historial de cobros' : 'Ver historial de cobros'}
        </button>
        {showHistory && (
          <div className="mt-3">
            <CycleHistory subscriptionId={sub.id} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {changingFlavor && product?.flavors && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChangingFlavor(false)}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Cambiar sabor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setChangingFlavor(false)}
                aria-label="Cerrar"
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black font-display uppercase text-white">Cambiar sabor</h3>
              <p className="text-xs text-neutral-400 mt-1">Aplica desde tu próximo envío.</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {product.flavors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => changeFlavor(f.id)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 ${
                      f.name === flavor ? 'border-lime-400 bg-neutral-950' : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: f.accentHex }} />
                    <span className="text-sm font-bold text-white">{f.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Pestaña "Mi Membresía": las suscripciones reales del cliente. */
export const MembershipTab: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const { subscriptions, subscriptionsStatus, refreshSubscriptions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cardResult = cardReturnState(searchParams);

  // Al volver de Transbank se recarga el estado real y se limpia la URL.
  useEffect(() => {
    if (!cardResult) return;
    void refreshSubscriptions();
    const next = new URLSearchParams(searchParams);
    next.delete('card');
    setSearchParams(next, { replace: true });
    // Solo al llegar con el resultado: el aviso se conserva en `cardResult`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [returned] = useState(cardResult);

  const live = useMemo(() => subscriptions.filter(isLive), [subscriptions]);
  const past = useMemo(() => subscriptions.filter((s) => !isLive(s)), [subscriptions]);

  return (
    <div className="space-y-8">
      {returned === 'ok' && (
        <div role="status" className="p-4 rounded-xl bg-lime-400/10 border border-lime-400/30 text-sm text-lime-300">
          Tu tarjeta quedó registrada. Si es tu primera vez, ya hicimos el primer cobro; revisa tu correo.
        </div>
      )}
      {returned === 'error' && (
        <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          No pudimos registrar tu tarjeta. No se hizo ningún cobro; puedes intentarlo de nuevo desde tu suscripción.
        </div>
      )}

      {subscriptionsStatus === 'loading' && subscriptions.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-lime-400 animate-spin" aria-label="Cargando" />
        </div>
      ) : subscriptionsStatus === 'error' && subscriptions.length === 0 ? (
        <div role="alert" className="text-center py-12 text-sm text-neutral-400">
          No pudimos cargar tus suscripciones.{' '}
          <button type="button" onClick={refreshSubscriptions} className="text-lime-400 underline">
            Reintentar
          </button>
        </div>
      ) : live.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 mx-auto">
            <Repeat className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white">
              Suscríbete y <span className="text-lime-400">ahorra 15%</span>
            </h3>
            <p className="text-neutral-400 text-sm mt-2 max-w-md mx-auto">
              Recibe tu proteína cada mes con envío gratis por Chilexpress. Sin contratos: pausa, cambia de sabor o cancela cuando quieras.
            </p>
          </div>
          <Link
            to="/#producto"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm transition-all shadow-xl"
          >
            <Zap className="w-4 h-4 fill-neutral-950" />
            <span>Elegir mi producto</span>
          </Link>
        </div>
      ) : (
        live.map((sub) => <SubscriptionCard key={sub.id} sub={sub} onChanged={refreshSubscriptions} notify={notify} />)
      )}

      {past.length > 0 && (
        <details className="text-sm text-neutral-400">
          <summary className="cursor-pointer font-mono text-xs uppercase">Suscripciones canceladas ({past.length})</summary>
          <div className="mt-4 space-y-6">
            {past.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} onChanged={refreshSubscriptions} notify={notify} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
