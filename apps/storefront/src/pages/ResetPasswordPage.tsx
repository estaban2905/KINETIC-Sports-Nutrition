import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ENABLE_ACCOUNTS } from '../lib/features';
import { describeAuthError, validateResetForm } from '../lib/accountValidation';

const INPUT_CLASS =
  'w-full bg-neutral-800 border rounded-xl px-4 py-3 text-sm text-neutral-100 focus:outline-none focus:border-lime-400 transition-colors';

/** Destino del enlace del correo: /restablecer?token=...&email=... */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { completePasswordReset, openAuthModal } = useAuth();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!ENABLE_ACCOUNTS) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateResetForm({ password, confirmPassword });
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    setFormError(null);
    try {
      await completePasswordReset(token, email, password);
      setDone(true);
    } catch {
      // El backend responde 401 cuando el token venció (15 min) o ya se usó.
      setFormError('El enlace venció o ya fue usado. Pide uno nuevo desde "Olvidé mi contraseña".');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-4 py-20">
      <div className="max-w-md w-full space-y-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 mx-auto mb-4">
            <Zap className="w-7 h-7 fill-lime-400/20" />
          </div>
          <h1 className="text-2xl font-black font-display uppercase tracking-tight text-white">Nueva contraseña</h1>
        </div>

        {!token || !email ? (
          <p className="text-sm text-neutral-300 text-center">
            Este enlace no es válido. Pide uno nuevo desde &quot;Olvidé mi contraseña&quot;.
          </p>
        ) : done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-lime-400 mx-auto" />
            <p className="text-sm text-neutral-300">Listo, cambiamos tu contraseña. Ya puedes ingresar.</p>
            <button
              type="button"
              onClick={openAuthModal}
              className="px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm"
            >
              Ingresar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && (
              <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {formError}
              </div>
            )}
            <p className="text-xs text-neutral-400">
              Cuenta: <strong className="text-neutral-200">{email}</strong>
            </p>
            <div>
              <label htmlFor="reset-password" className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                Nueva contraseña
              </label>
              <input id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                className={`${INPUT_CLASS} ${errors.password ? 'border-red-500/70' : 'border-neutral-700'}`}
              />
              {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="reset-password-confirm" className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                Repite la contraseña
              </label>
              <input id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!errors.confirmPassword}
                className={`${INPUT_CLASS} ${errors.confirmPassword ? 'border-red-500/70' : 'border-neutral-700'}`}
              />
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1.5">{errors.confirmPassword}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}

        <Link to="/" className="block text-center text-xs text-neutral-400 hover:text-white transition-colors">
          ← Volver a la tienda
        </Link>
      </div>
    </div>
  );
};
