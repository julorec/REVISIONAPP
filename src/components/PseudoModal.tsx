import { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';

interface PseudoModalProps {
  open: boolean;
  initialPseudo: string;
  required: boolean;
  onSave: (pseudo: string) => void;
  onClose: () => void;
}

export function PseudoModal({
  open,
  initialPseudo,
  required,
  onSave,
  onClose,
}: PseudoModalProps) {
  const [value, setValue] = useState(initialPseudo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialPseudo);
      setError(null);
    }
  }, [open, initialPseudo]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = value.trim();
    if (cleaned.length < 2) {
      setError('Entrez au moins 2 caractères (ex : Jules, Camille R.).');
      return;
    }
    onSave(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pseudo-modal-title"
      onClick={() => {
        if (!required) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono-code text-[11px] uppercase tracking-[0.08em] text-[var(--warm)]">
                INSA Rennes · ESET 3A
              </p>
              <h2
                id="pseudo-modal-title"
                className="text-[18px] font-semibold text-[var(--text)] leading-snug"
              >
                {required ? 'Bienvenue sur Coach Partiels' : 'Modifier mon pseudo'}
              </h2>
            </div>
          </div>

          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Fermer la fenêtre pseudo"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-3 text-[14px] text-[var(--dim)] leading-relaxed">
          Indiquez votre prénom ou pseudo pour enregistrer automatiquement vos scores et apparaître dans le classement de chaque matière.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="student-pseudo-input"
              className="block font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
            >
              Prénom / Pseudo
            </label>
            <input
              id="student-pseudo-input"
              type="text"
              autoFocus
              maxLength={32}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex : Jules, Camille R., Théo..."
              className="min-h-[46px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[15.5px] text-[var(--text)] focus:border-[var(--accent)]"
            />
            {error && (
              <p className="mt-1.5 text-[13px] font-medium text-[var(--bad)]" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {!required && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-lg border border-[var(--line)] px-4 text-[14px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              className={`min-h-[44px] rounded-lg bg-[var(--accent)] px-5 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] transition-colors ${
                required ? 'w-full' : ''
              }`}
            >
              {required ? 'Commencer les révisions' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
