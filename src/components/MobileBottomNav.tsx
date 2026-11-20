import { BookOpen, Trophy } from 'lucide-react';
import type { SubjectSubTab } from './SubjectWorkspace';

interface MobileBottomNavProps {
  activeSubTab: SubjectSubTab;
  onChangeSubTab: (tab: SubjectSubTab) => void;
}

export function MobileBottomNav({ activeSubTab, onChangeSubTab }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md pb-safe"
      aria-label="Navigation principale"
    >
      <div className="grid h-[56px] grid-cols-2 items-center">
        <button
          type="button"
          onClick={() => onChangeSubTab('revisions')}
          aria-current={activeSubTab === 'revisions' ? 'page' : undefined}
          className={`flex h-full flex-col items-center justify-center gap-0.5 transition-colors ${
            activeSubTab === 'revisions'
              ? 'text-[var(--accent)]'
              : 'text-[var(--dim)] hover:text-[var(--text)]'
          }`}
        >
          <BookOpen className="h-[20px] w-[20px]" strokeWidth={activeSubTab === 'revisions' ? 2.25 : 1.8} />
          <span className="text-[11px] font-semibold tracking-tight">Révisions</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab('classement')}
          aria-current={activeSubTab === 'classement' ? 'page' : undefined}
          className={`flex h-full flex-col items-center justify-center gap-0.5 transition-colors ${
            activeSubTab === 'classement'
              ? 'text-[var(--accent)]'
              : 'text-[var(--dim)] hover:text-[var(--text)]'
          }`}
        >
          <Trophy className="h-[20px] w-[20px]" strokeWidth={activeSubTab === 'classement' ? 2.25 : 1.8} />
          <span className="text-[11px] font-semibold tracking-tight">Classement</span>
        </button>
      </div>
    </nav>
  );
}
