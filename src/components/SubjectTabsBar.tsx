import { RefreshCw } from 'lucide-react';
import type { SubjectSummary } from '../types/quiz';

interface SubjectTabsBarProps {
  subjects: SubjectSummary[];
  activeMatiere: string | null;
  loading: boolean;
  onSelectMatiere: (matiere: string) => void;
  onRefresh: () => void;
}

export function SubjectTabsBar({
  subjects,
  activeMatiere,
  loading,
  onSelectMatiere,
  onRefresh,
}: SubjectTabsBarProps) {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <div
          className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar snap-x"
          role="tablist"
          aria-label="Matières"
        >
          {subjects.map((subject) => {
            const active = activeMatiere === subject.matiere;
            return (
              <button
                key={subject.matiere}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectMatiere(subject.matiere)}
                className={`inline-flex min-h-[40px] shrink-0 snap-start items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--line)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)]'
                }`}
              >
                <span>{subject.matiere}</span>
                <span
                  className={`font-mono-code text-[11.5px] tabular-nums ${
                    active ? 'opacity-85' : 'text-[var(--dim)]'
                  }`}
                >
                  {subject.totalQuestions}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-50"
          aria-label="Actualiser les matières et scores depuis Supabase"
          title="Actualiser depuis Supabase"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
