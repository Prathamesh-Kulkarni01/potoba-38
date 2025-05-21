// app/components/PWAInstaller.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function PWAInstaller() {
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferredPrompt = useRef<any>(null);

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
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      setInstalled(true);
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  if (installed) return null;

  return (
    <>
      {show && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            borderRadius: 12,
            padding: '16px 20px',
            border: '1px solid #FFB347',
            animation: 'theme-fade 0.5s',
          }}
        >
          <span style={{ fontSize: 24, marginRight: 8 }}>📲</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                color: '#222A3E',
                marginBottom: 2,
              }}
            >
              Install Potoba?
            </div>
            <div style={{ fontSize: 14, color: '#666' }}>
              Get a faster, app-like experience on your device.
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              background: '#FFB347',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 16,
              cursor: installing ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              transition: 'background 0.2s',
            }}
            aria-label="Install Potoba"
          >
            {installing ? 'Installing…' : 'Install'}
          </button>
          <button
            onClick={() => setShow(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 22,
              marginLeft: 4,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Dismiss install prompt"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
