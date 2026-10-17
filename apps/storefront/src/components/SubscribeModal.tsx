import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Gift, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ComunaAutocomplete } from './ComunaAutocomplete';
import { listComunas, resolveVariantId } from '../lib/medusa';
import { ENABLE_SUBSCRIPTION_GIFT } from '../lib/features';
import { ContactFormValues, contactFromCustomer, validateContactForm } from '../lib/checkoutValidation';
import { splitName } from '../lib/accountValidation';
import {
  SUBSCRIPTION_DISCOUNT_PERCENT,
  addressFromContact,
  createSubscription,
  describeSubscriptionError,
  redirectToTransbank,
  startCardEnrollment,
  subscriptionPrice,
} from '../lib/subscriptions';
import type { Product, ProductFlavor, ProductSize } from '../types';

const INPUT_CLASS =
  'w-full bg-neutral-800 border rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors';

const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product;
  flavor: ProductFlavor;
  size: ProductSize;
  quantity: number;
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'tel' | 'numeric' | 'text';
}> = ({ label, value, onChange, error, placeholder, autoComplete, inputMode }) => (
  <div>
    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">{label}</label>
    <input
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={`${INPUT_CLASS} ${error ? 'border-red-500/70' : 'border-neutral-700'}`}
    />
    {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
  </div>
);

/**
 * Alta de la suscripción: pide la dirección de despacho y la aceptación de los
 * términos, crea la suscripción (todavía sin cobrar) y lleva al cliente a
 * inscribir su tarjeta en Transbank. El primer cobro ocurre cuando vuelve con la
 * tarjeta registrada.
 */
export const SubscribeModal: React.FC<Props> = ({ open, onClose, product, flavor, size, quantity }) => {
  const { user, addresses } = useAuth();
  const [values, setValues] = useState<ContactFormValues | null>(null);
  const [comunas, setComunas] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Al abrir, el formulario parte con los datos que la cuenta ya tiene.
  useEffect(() => {
    if (!open || !user) return;
    const { first_name, last_name } = splitName(user.name);
    setValues(
      contactFromCustomer({
        email: user.email,
        first_name,
        last_name,
        phone: user.phone,
        addresses: addresses as never,
      })
    );
    setErrors({});
    setFormError(null);
    setTermsError(false);
    listComunas().then(setComunas);
  }, [open, user, addresses]);

  const perCycle = useMemo(() => subscriptionPrice(size.price) * quantity, [size.price, quantity]);

  if (!open || !values) return null;

  const set = (key: keyof ContactFormValues) => (v: string) => setValues((prev) => (prev ? { ...prev, [key]: v } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContactForm(values, comunas);
    setErrors(found);
    setTermsError(!accepted);
    if (Object.keys(found).length || !accepted) return;

    setBusy(true);
    setFormError(null);
    try {
      const variantId = await resolveVariantId(product, flavor, size);
      const subscription = await createSubscription({
        variant_id: variantId,
        quantity,
        accepted_terms: true,
        shipping_address: addressFromContact(values),
      });
      const { url, token } = await startCardEnrollment(subscription.id);
      // Si todo sale bien la página cambia a Transbank y no se vuelve a este código.
      redirectToTransbank(url, token);
    } catch (err) {
      setFormError(describeSubscriptionError(err));
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={busy ? undefined : onClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Suscribirme"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-neutral-400 hover:text-white disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-black font-display uppercase tracking-tight text-white">Tu suscripción</h2>

          <div className="mt-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm">
            <div className="font-bold text-white">{product.name}</div>
            <div className="text-neutral-400 text-xs mt-0.5">
              {flavor.name} · {size.name} · x{quantity}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs font-mono uppercase text-neutral-400">Cada 30 días</span>
              <span>
                <span className="text-xs text-neutral-500 line-through mr-2">{currency.format(size.price * quantity)}</span>
                <span className="text-xl font-black font-display text-lime-400">{currency.format(perCycle)}</span>
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-neutral-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-lime-400" /> {SUBSCRIPTION_DISCOUNT_PERCENT}% menos que la compra única
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-lime-400" /> Envío gratis con Chilexpress
              </li>
              {ENABLE_SUBSCRIPTION_GIFT && (
                <li className="flex items-center gap-2 text-lime-400 font-semibold">
                  <Gift className="w-3.5 h-3.5" /> Shaker KINETIC de regalo en tu primer envío
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">¿Dónde lo despachamos?</p>
            <Field label="Nombre y apellido" value={values.name} onChange={set('name')} error={errors.name} autoComplete="name" />
            <Field
              label="Celular"
              value={values.phone}
              onChange={set('phone')}
              error={errors.phone}
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              inputMode="tel"
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Calle" value={values.street} onChange={set('street')} error={errors.street} autoComplete="address-line1" />
              </div>
              <Field label="Número" value={values.streetNumber} onChange={set('streetNumber')} error={errors.streetNumber} />
            </div>
            <Field label="Depto / casa (opcional)" value={values.apartment} onChange={set('apartment')} />
            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">Comuna</label>
              <ComunaAutocomplete
                value={values.city}
                onChange={set('city')}
                onBlur={() => undefined}
                comunas={comunas}
                error={errors.city}
              />
            </div>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs leading-relaxed cursor-pointer ${
                termsError ? 'border-red-500/70 bg-red-500/5' : 'border-neutral-800 bg-neutral-950'
              } text-neutral-300`}
            >
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  setTermsError(false);
                }}
                className="mt-0.5 accent-lime-400"
              />
              <span>
                Autorizo a KINETIC a cobrar <strong className="text-white">{currency.format(perCycle)}</strong> cada 30 días a la
                tarjeta que registre en Webpay Oneclick, hasta que cancele. Me avisarán por correo 3 días antes de cada cobro y
                puedo pausar, cambiar el producto o cancelar cuando quiera desde Mi Cuenta, sin costo.
              </span>
            </label>
            {termsError && <p className="text-xs text-red-400 -mt-2">Debes aceptar para continuar.</p>}

            {formError && (
              <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm rounded-xl transition-all shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{busy ? 'Redirigiendo a Transbank…' : 'Continuar y registrar mi tarjeta'}</span>
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5" />
              Registras tu tarjeta directamente en Transbank. KINETIC nunca ve ni guarda el número.
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
