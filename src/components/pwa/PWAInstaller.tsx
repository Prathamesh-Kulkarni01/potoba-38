// app/components/PWAInstaller.tsx
'use client';

import { useEffect } from 'react';

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => console.log('SW registered:', reg))
          .catch((err) => console.error('SW registration failed:', err));
      });
    }
  }, []);

  useEffect(() => {
    let deferredPrompt: any;

    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;

      const btn = document.getElementById('install-btn');
      if (btn) btn.style.display = 'block';

      btn?.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handler);
      }
    };
  }, []);

  return (
    <button
      id="install-btn"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 20,
        right: 20,
        padding: '10px 16px',
        background: '#FFB347',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        fontWeight: 'bold',
        zIndex: 9999,
        cursor: 'pointer',
      }}
    >
      Install App
    </button>
  );
}
