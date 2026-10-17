import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ENABLE_GOOGLE_LOGIN } from '../lib/features';
import {
  describeAuthError,
  validateEmail,
  validateLoginForm,
  validateRegisterForm,
} from '../lib/accountValidation';

type View = 'login' | 'register' | 'forgot' | 'forgot-sent';

const INPUT_CLASS =
  'w-full bg-neutral-800 border rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors';

const Field: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}> = ({ label, type = 'text', value, onChange, error, placeholder, autoComplete }) => (
  <div>
    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={`${INPUT_CLASS} ${error ? 'border-red-500/70' : 'border-neutral-700'}`}
    />
    {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
  </div>
);

const SubmitButton: React.FC<{ loading: boolean; label: string; loadingLabel: string }> = ({
  loading,
  label,
  loadingLabel,
}) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm rounded-xl transition-all shadow-lg active:scale-[0.99] disabled:opacity-50"
  >
    <span>{loading ? loadingLabel : label}</span>
    <ArrowRight className="w-4 h-4" />
  </button>
);

const GoogleButton: React.FC<{ loading: boolean; onClick: () => void }> = ({ loading, onClick }) => (
  <div className="space-y-4 mb-4">
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3.5 py-3.5 px-5 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-[0.99] border border-neutral-200 disabled:opacity-60"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.35 24 12 24z" />
        <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.13z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.69 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z" />
      </svg>
      <span>{loading ? 'Redirigiendo a Google...' : 'Continuar con Google'}</span>
    </button>
    <div className="relative flex items-center justify-center">
      <div className="border-t border-neutral-800 w-full" />
      <span className="bg-neutral-900 px-3 text-xs uppercase tracking-wider text-neutral-500 font-mono whitespace-nowrap">
        o con correo
      </span>
      <div className="border-t border-neutral-800 w-full" />
    </div>
  </div>
);

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, requestPasswordReset, startGoogleLogin } = useAuth();
  const [view, setView] = useState<View>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const switchView = (next: View) => {
    setView(next);
    setErrors({});
    setFormError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    switchView('login');
    closeAuthModal();
  };

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setFormError(null);
    try {
      await action();
    } catch (err) {
      setFormError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // Si todo sale bien la página cambia a Google y no se vuelve a este código.
    run(startGoogleLogin);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateLoginForm({ email, password });
    setErrors(found);
    if (Object.keys(found).length) return;
    run(async () => {
      await login(email, password);
      switchView('login');
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateRegisterForm({ name, email, password, confirmPassword });
    setErrors(found);
    if (Object.keys(found).length) return;
    run(async () => {
      await register(name, email, password);
      switchView('login');
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    if (emailError) return;
    run(async () => {
      await requestPasswordReset(email);
      setView('forgot-sent');
    });
  };

  const titles: Record<View, string> = {
    login: 'Ingresa a tu cuenta',
    register: 'Crea tu cuenta',
    forgot: 'Recupera tu contraseña',
    'forgot-sent': 'Revisa tu correo',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          role="dialog"
          aria-modal="true"
          aria-label={titles[view]}
          className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
        >
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-lime-400 mb-3 shadow-inner">
              <Zap className="w-6 h-6 fill-lime-400/20 text-lime-400" />
            </div>
            <h2 className="text-2xl font-black font-display tracking-tight text-white uppercase">
              KINETIC <span className="text-lime-400">CLUB</span>
            </h2>
            <p className="text-neutral-400 text-sm mt-1 max-w-xs">
              {view === 'forgot-sent'
                ? 'Si hay una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña.'
                : 'Accede a tus pedidos y rastrea tus envíos en tiempo real.'}
            </p>
          </div>

          {formError && (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {formError}
            </div>
          )}

          {ENABLE_GOOGLE_LOGIN && (view === 'login' || view === 'register') && (
            <GoogleButton loading={loading} onClick={handleGoogle} />
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="tu@correo.com" autoComplete="email" />
              <Field label="Contraseña" type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
              <SubmitButton loading={loading} label="Ingresar" loadingLabel="Ingresando..." />
              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button" onClick={() => switchView('forgot')} className="text-neutral-400 hover:text-lime-400 transition-colors">
                  Olvidé mi contraseña
                </button>
                <button type="button" onClick={() => switchView('register')} className="text-lime-400 hover:text-lime-300 font-semibold transition-colors">
                  Crear cuenta
                </button>
              </div>
            </form>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <Field label="Nombre y apellido" value={name} onChange={setName} error={errors.name} placeholder="Ej: Max Poblete" autoComplete="name" />
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="tu@correo.com" autoComplete="email" />
              <Field label="Contraseña" type="password" value={password} onChange={setPassword} error={errors.password} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              <Field label="Repite tu contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} autoComplete="new-password" />
              <SubmitButton loading={loading} label="Crear mi cuenta" loadingLabel="Creando cuenta..." />
              <button type="button" onClick={() => switchView('login')} className="w-full text-center text-xs text-neutral-400 hover:text-white pt-1 transition-colors">
                ← Ya tengo cuenta
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4" noValidate>
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="tu@correo.com" autoComplete="email" />
              <SubmitButton loading={loading} label="Enviar enlace" loadingLabel="Enviando..." />
              <button type="button" onClick={() => switchView('login')} className="w-full text-center text-xs text-neutral-400 hover:text-white pt-1 transition-colors">
                ← Volver a ingresar
              </button>
            </form>
          )}

          {view === 'forgot-sent' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-lime-400 mx-auto" />
              <p className="text-sm text-neutral-300">
                El enlace es válido por 15 minutos. Revisa también tu carpeta de spam.
              </p>
              <button type="button" onClick={() => switchView('login')} className="text-xs text-lime-400 hover:text-lime-300 font-semibold">
                ← Volver a ingresar
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-center gap-2 text-neutral-400 text-xs text-center">
            <ShieldCheck className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span>Tus datos están protegidos. También puedes comprar como invitado.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
