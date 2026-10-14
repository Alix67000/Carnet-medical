import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Enregistrement automatique du Service Worker PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nouvelle version de Suivi VVG disponible');
  },
  onOfflineReady() {
    console.log('Suivi VVG est maintenant opérationnel en mode hors-ligne');
  },
});

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
