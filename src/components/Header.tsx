import { Lock, Monitor, Moon, Sun, User } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  theme: ThemePreference;
  pseudo: string;
  onThemeChange: (pref: ThemePreference) => void;
  onGoHome: () => void;
  onEditPseudo: () => void;
  onOpenAdmin: () => void;
}

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'auto',
  auto: 'light',
};

const THEME_META: Record<ThemePreference, { label: string; icon: typeof Sun }> = {
  light: { label: 'Clair', icon: Sun },
  dark: { label: 'Sombre', icon: Moon },
  auto: { label: 'Auto', icon: Monitor },
};

export function Header({
  theme,
  pseudo,
  onThemeChange,
  onGoHome,
  onEditPseudo,
  onOpenAdmin,
}: HeaderProps) {
  const { label: themeLabel, icon: ThemeIcon } = THEME_META[theme];
  const nextTheme = NEXT_THEME[theme];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onGoHome}
          className="flex min-h-[44px] min-w-0 items-center gap-2 overflow-hidden text-left group"
          aria-label="Coach Partiels — Retour aux révisions"
        >
          <span className="truncate text-[16.5px] font-semibold tracking-[-0.02em] text-[var(--text)] group-hover:text-[var(--accent)] transition-colors whitespace-nowrap">
            Coach Partiels
          </span>
          <span className="hidden md:inline font-mono-code text-[11px] text-[var(--dim)] whitespace-nowrap shrink-0">
            · INSA Rennes ESET 3A
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton />

          {/* Student Pseudo Corner Trigger */}
          <button
            type="button"
            onClick={onEditPseudo}
            className="inline-flex h-10 max-w-[118px] sm:max-w-[180px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] whitespace-nowrap"
            aria-label={
              pseudo
                ? `Modifier le pseudo étudiant (${pseudo})`
                : 'Définir votre pseudo étudiant'
            }
            title="Modifier mon pseudo"
          >
            <User className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span className="truncate">{pseudo || 'Pseudo'}</span>
          </button>

          {/* Single-tap Theme Cycle (Clair -> Sombre -> Auto) */}
          <button
            type="button"
            onClick={() => onThemeChange(nextTheme)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] shrink-0"
            aria-label={`Thème actuel : ${themeLabel}. Passer au thème ${THEME_META[nextTheme].label}`}
            title={`Thème : ${themeLabel} (cliquer pour changer)`}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          {/* Discreet Admin Import Trigger */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex h-10 min-w-[40px] items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12.5px] font-mono-code text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] whitespace-nowrap shrink-0"
            aria-label="Espace Admin (Import PIN 3500)"
            title="Espace Admin (PIN requis)"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
