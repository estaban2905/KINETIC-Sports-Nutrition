import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

// Error tracking for the checkout path: without this, a crash mid-payment
// (a bad response shape from Medusa/Stripe, a null cart, ...) is invisible —
// the customer just sees a blank drawer and nobody finds out. Opt-in via
// VITE_SENTRY_DSN, same pattern as every other integration in this app.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });
}

// Safely silence benign browser ResizeObserver notification warnings
window.addEventListener('error', (e) => {
  if (
    e.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
    e.message?.includes('ResizeObserver loop limit exceeded')
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-neutral-300">Algo salió mal. Intenta recargar la página.</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-lime-400 hover:bg-lime-300 text-neutral-950 px-6 py-3 rounded-lg font-semibold transition"
      >
        Recargar
      </button>
    </div>
  );
}

