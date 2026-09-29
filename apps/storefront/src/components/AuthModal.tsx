import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Mail, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithGoogle, loginWithEmail } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isEmailView, setIsEmailView] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    try {
      await loginWithEmail(emailInput, nameInput);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccount = (hasMembership: boolean) => {
    if (hasMembership) {
      loginWithGoogle();
    } else {
      loginWithGoogle({
        id: 'usr_new_athlete',
        name: 'Camila Silva',
        email: 'camila.silva@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        rut: '19.823.144-K',
        phone: '+56 9 9123 4567',
        membership: null,
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Subtle Glow Accent */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-lime-400 mb-3 shadow-inner">
              <Zap className="w-6 h-6 fill-lime-400/20 text-lime-400" />
            </div>
            <h2 className="text-2xl font-black font-display tracking-tight text-white uppercase">
              KINETIC <span className="text-lime-400">CLUB</span>
            </h2>
            <p className="text-neutral-400 text-sm mt-1 max-w-xs">
              Accede a tus pedidos, rastrea tus envíos en tiempo real y gestiona tu membresía mensual.
            </p>
          </div>

          {/* Google Sign In Main Button */}
          {!isEmailView ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3.5 py-3.5 px-5 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm rounded-xl shadow-lg transition-all transform active:scale-[0.99] border border-neutral-200"
              >
                {/* Official Google 'G' SVG Logo */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.69 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                  />
                </svg>
                <span>{loading ? 'Iniciando sesión...' : 'Continuar con Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-neutral-800 w-full" />
                <span className="bg-neutral-900 px-3 text-xs uppercase tracking-wider text-neutral-500 font-mono">
                  o con correo
                </span>
                <div className="border-t border-neutral-800 w-full" />
              </div>

              <button
                type="button"
                onClick={() => setIsEmailView(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white text-sm font-medium rounded-xl border border-neutral-700/80 transition-colors"
              >
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>Ingresar con Correo Electrónico</span>
              </button>

              {/* Demo Quick Access */}
              <div className="pt-3 border-t border-neutral-800/80 mt-4">
                <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider text-center mb-2.5">
                  Modo de prueba rápido
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoAccount(true)}
                    className="p-2.5 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 hover:border-lime-400/50 rounded-lg text-left transition-all group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-lime-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Con Membresía</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Maximiliano (Suscrito)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoAccount(false)}
                    className="p-2.5 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-500 rounded-lg text-left transition-all"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Cuenta Nueva</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Camila (Sin suscripción)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Email Form */
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej: Max Poblete"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold font-display uppercase tracking-wider text-sm rounded-xl transition-all shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading ? 'Accediendo...' : 'Ingresar a mi cuenta'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsEmailView(false)}
                className="w-full text-center text-xs text-neutral-400 hover:text-white pt-2 transition-colors"
              >
                ← Volver a inicio con Google
              </button>
            </form>
          )}

          {/* Trust badges footer */}
          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-center gap-2 text-neutral-400 text-xs text-center">
            <ShieldCheck className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span>Tus datos están protegidos. Sin contraseñas complejas.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
