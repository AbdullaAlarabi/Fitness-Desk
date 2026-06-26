import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { assetUrl } from './lib/assets';
import './styles.css';

registerSW({ immediate: true });

const BOOT_SPLASH_MS = 2000;

function BootSplash() {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-cream">
      <img
        src={assetUrl('media/brand/fitness_desk_splash_screen.png')}
        alt="Fitness Desk splash screen"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-teal/10 to-teal/30" />
      <p className="absolute bottom-[max(40px,calc(24px+env(safe-area-inset-bottom)))] left-1/2 -translate-x-1/2 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-card shadow-[0_10px_30px_rgba(6,20,20,0.42)]">
        Loading Fitness Desk
      </p>
    </div>
  );
}

function RootApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReady(true);
    }, BOOT_SPLASH_MS);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!ready) {
    return <BootSplash />;
  }

  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
