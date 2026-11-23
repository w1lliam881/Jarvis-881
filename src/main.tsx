import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './ui/App';
import { Boot } from './ui/Boot';
import { ErrorBoundary } from './ui/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Boot>
        <App />
      </Boot>
    </ErrorBoundary>
  </StrictMode>,
);

// Offline-läsning: registrera service worker i den riktiga appen (inte i förhandsvisningen).
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'preview') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
