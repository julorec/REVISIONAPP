import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isIOS) {
            setShowIOSGuide(true);
          } else {
            void promptInstall();
          }
        }}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
        aria-label="Installer l'application sur cet appareil"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>Installer</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="ios-install-title" className="text-base font-semibold text-[var(--text)]">
                Installer sur iPhone / iPad
              </h2>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                aria-label="Fermer le guide d'installation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-3 space-y-2.5 text-sm text-[var(--dim)] list-decimal pl-5">
              <li>
                Touchez le bouton <strong className="text-[var(--text)]">Partager</strong>{' '}
                <Share className="inline h-3.5 w-3.5 align-text-bottom text-[var(--accent)]" /> dans Safari.
              </li>
              <li>
                Sélectionnez <strong className="text-[var(--text)]">Sur l&apos;écran d&apos;accueil</strong>.
              </li>
              <li>
                Touchez <strong className="text-[var(--text)]">Ajouter</strong> pour accéder aux partiels hors-ligne.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
