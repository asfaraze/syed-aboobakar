import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'sak_install_dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    if (isStandalone()) return;

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const handleInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    if (isIos()) setShowIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (dismissed || (!installEvent && !showIosHint)) return null;

  return (
    <aside
      aria-label="Install the Syed Aboobakar app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:bottom-5"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">Get the Syed Aboobakar app</p>
        {installEvent ? (
          <p className="text-xs text-slate-500">Order faster from your home screen.</p>
        ) : (
          <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            Tap <Share className="h-3.5 w-3.5" aria-label="Share" /> then {'"Add to Home Screen"'}.
          </p>
        )}
      </div>
      {installEvent && (
        <button
          type="button"
          onClick={install}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
