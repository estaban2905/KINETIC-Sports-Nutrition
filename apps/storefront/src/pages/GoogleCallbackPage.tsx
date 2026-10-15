import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { medusa } from '../lib/medusa';
import { ENABLE_GOOGLE_LOGIN } from '../lib/features';
import { describeAuthError } from '../lib/accountValidation';

/** Destino al que Google devuelve a la persona: /auth/google/callback?code=...&state=... */
export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeGoogleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // El código de Google se puede usar una sola vez; StrictMode ejecuta el efecto dos veces en desarrollo.
  const started = useRef(false);

  useEffect(() => {
    if (!ENABLE_GOOGLE_LOGIN || started.current) return;
    started.current = true;

    const query = Object.fromEntries(searchParams.entries());
    if (query.error || !query.code) {
      setError('Cancelaste el ingreso con Google o el enlace no es válido.');
      return;
    }

    completeGoogleLogin(query)
      .then(() => navigate('/', { replace: true }))
      .catch(async (err) => {
        // Evita dejar un token de Google sin cliente asociado.
        await medusa.client.clearToken().catch(() => undefined);
        const message = describeAuthError(err);
        setError(
          /ya existe una cuenta/i.test(message)
            ? 'Ya existe una cuenta con ese correo creada con contraseña. Ingresa con tu correo y contraseña.'
            : message
        );
      });
  }, [searchParams, completeGoogleLogin, navigate]);

  if (!ENABLE_GOOGLE_LOGIN) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center space-y-5 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 mx-auto">
          <Zap className="w-7 h-7 fill-lime-400/20" />
        </div>
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm"
            >
              Volver a la tienda
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin mx-auto" aria-label="Cargando" />
            <p className="text-sm text-neutral-300">Terminando tu ingreso con Google…</p>
          </>
        )}
      </div>
    </div>
  );
};
