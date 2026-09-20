import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
    <App />
  </StrictMode>,
);

