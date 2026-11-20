import { Lock, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  theme: ThemePreference;
  onThemeChange: (pref: ThemePreference) => void;
  onGoHome: () => void;
  onOpenAdmin: () => void;
}

export function Header({
  theme,
  onThemeChange,
  onGoHome,
  onOpenAdmin,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-sm pt-safe">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={onGoHome}
          className="flex min-h-[40px] min-w-0 flex-col items-start justify-center text-left group"
          aria-label="Coach Partiels — Retour à l'accueil"
        >
          <span className="font-mono-code text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--dim)] leading-tight whitespace-nowrap">
            INSA Rennes · ESET 3A
          </span>
          <span className="text-[16px] sm:text-[17px] font-semibold tracking-[-0.015em] text-[var(--text)] group-hover:text-[var(--accent)] transition-colors whitespace-nowrap">
            Coach Partiels
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />

          <div
            className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5"
            role="group"
            aria-label="Thème d'affichage"
          >
            {(
              [
                { value: 'light', label: 'Clair', icon: Sun },
                { value: 'auto', label: 'Auto', icon: Monitor },
                { value: 'dark', label: 'Sombre', icon: Moon },
              ] as const
            ).map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onThemeChange(value)}
                  aria-pressed={active}
                  aria-label={`Thème ${label}`}
                  title={`Thème ${label}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--dim)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12.5px] font-mono-code text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] whitespace-nowrap"
            aria-label="Espace Import Rapide (Admin)"
            title="Import Rapide (PIN requis)"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>
    </header>
  );
}
