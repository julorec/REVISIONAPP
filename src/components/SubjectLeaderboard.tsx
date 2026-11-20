import { useMemo } from 'react';
import { Award, Crown, Medal, RefreshCw, Trophy } from 'lucide-react';
import type { ScoreEntry } from '../types/quiz';
import {
  aggregateLeaderboard,
  getAvailableSectionsFromScores,
} from '../utils/leaderboard';

interface SubjectLeaderboardProps {
  matiere: string;
  availableSections: string[];
  scores: ScoreEntry[];
  selectedSection: string; // 'all' or exact section_ds
  currentPseudo: string;
  loading: boolean;
  onChangeSection: (sectionDs: string) => void;
  onRefresh: () => void;
}

function getInitials(pseudo: string): string {
  const parts = pseudo.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function SubjectLeaderboard({
  matiere,
  availableSections,
  scores,
  selectedSection,
  currentPseudo,
  loading,
  onChangeSection,
  onRefresh,
}: SubjectLeaderboardProps) {
  const sections = useMemo(
    () => getAvailableSectionsFromScores(scores, matiere, availableSections),
    [scores, matiere, availableSections]
  );

  const rows = useMemo(
    () =>
      aggregateLeaderboard(scores, {
        matiere,
        sectionDs: selectedSection,
        currentPseudo,
      }),
    [scores, matiere, selectedSection, currentPseudo]
  );

  const podium = rows.slice(0, 3);
  const myRow = rows.find((r) => r.isCurrentUser) ?? null;

  // Visual podium order: #2 left, #1 center, #3 right
  const podiumOrder =
    podium.length === 3
      ? [podium[1], podium[0], podium[2]]
      : podium.length === 2
        ? [podium[1], podium[0]]
        : podium;

  return (
    <div className="space-y-4">
      {/* Compact Horizontal DS Filter Row */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          role="group"
          aria-label="Filtrer le classement par section DS"
        >
          <button
            type="button"
            aria-pressed={selectedSection === 'all'}
            onClick={() => onChangeSection('all')}
            className={`min-h-[40px] shrink-0 rounded-xl border px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
              selectedSection === 'all'
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
            }`}
          >
            Tous les DS
          </button>

          {sections.map((sec) => {
            const active = selectedSection === sec;
            return (
              <button
                key={sec}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSection(sec)}
                className={`min-h-[40px] shrink-0 rounded-xl border px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                }`}
              >
                {sec}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-50"
          aria-label="Actualiser le classement"
          title="Actualiser le classement"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Personal Rank Summary Strip */}
      {currentPseudo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[13.5px]">
          {myRow ? (
            <>
              <span className="text-[var(--text)]">
                Votre rang{selectedSection !== 'all' ? ` (${selectedSection})` : ''} :{' '}
                <strong className="font-mono-code text-[var(--accent)]">#{myRow.rank}</strong>
              </span>
              <span className="font-mono-code text-[13px] text-[var(--dim)] tabular-nums">
                <strong className="text-[var(--text)]">{myRow.points} pts</strong> ·{' '}
                {myRow.bonnesReponses}/{myRow.totalQuestions} ({myRow.accuracy}%)
              </span>
            </>
          ) : (
            <span className="text-[var(--dim)]">
              <strong className="text-[var(--text)]">{currentPseudo}</strong> — terminez un quiz de{' '}
              <strong className="text-[var(--text)]">{matiere}</strong> pour apparaître ici.
            </span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
          <Trophy className="mx-auto h-7 w-7 text-[var(--dim)]" />
          <h3 className="mt-3 text-[16px] font-semibold text-[var(--text)]">
            Aucun score enregistré
          </h3>
          <p className="mt-1 text-[13.5px] text-[var(--dim)]">
            Lancez une session dans <strong>{matiere}</strong> pour ouvrir le podium.
          </p>
        </div>
      ) : (
        <>
          {/* ==================== COMPACT 3-COLUMN PODIUM (MOBILE + DESKTOP) ==================== */}
          <div
            className="grid grid-cols-3 items-end gap-2 sm:gap-3"
            aria-label="Podium des trois premiers étudiants"
          >
            {podiumOrder.map((student) => {
              const isFirst = student.rank === 1;
              const isSecond = student.rank === 2;

              const medalColor = isFirst
                ? 'text-amber-500'
                : isSecond
                  ? 'text-slate-400'
                  : 'text-amber-700 dark:text-amber-600';

              const cardAccent = student.isCurrentUser
                ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50'
                : isFirst
                  ? 'border-amber-500/60 bg-[var(--surface)]'
                  : 'border-[var(--line)] bg-[var(--surface)]';

              return (
                <article
                  key={student.pseudo}
                  className={`flex min-w-0 flex-col items-center rounded-2xl border px-2.5 py-3.5 sm:p-5 text-center transition-colors ${cardAccent} ${
                    isFirst ? 'py-5 sm:py-6' : ''
                  }`}
                >
                  <div
                    className={`mb-1.5 flex items-center gap-1 font-mono-code text-[11px] sm:text-[12px] font-semibold ${medalColor}`}
                  >
                    {isFirst ? (
                      <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : isSecond ? (
                      <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                    <span>#{student.rank}</span>
                  </div>

                  <div
                    className={`flex items-center justify-center rounded-full font-mono-code font-bold ${
                      isFirst
                        ? 'h-11 w-11 sm:h-14 sm:w-14 text-[14px] sm:text-[18px] bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'h-9 w-9 sm:h-12 sm:w-12 text-[12.5px] sm:text-[15px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--line)]'
                    }`}
                  >
                    {getInitials(student.pseudo)}
                  </div>

                  <h3 className="mt-2 text-[13px] sm:text-[15.5px] font-semibold text-[var(--text)] truncate max-w-full">
                    {student.pseudo}
                  </h3>

                  <p className="mt-0.5 font-mono-code text-[16px] sm:text-[21px] font-bold tabular-nums text-[var(--text)]">
                    {student.points}
                    <span className="ml-0.5 text-[10.5px] sm:text-[12px] font-medium text-[var(--dim)]">
                      pts
                    </span>
                  </p>

                  <p className="mt-0.5 font-mono-code text-[11px] sm:text-[12px] text-[var(--dim)] tabular-nums">
                    {student.accuracy}%
                  </p>
                </article>
              );
            })}
          </div>

          {/* ==================== FULL RANKING TABLE ==================== */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <p className="text-[12.5px] font-medium text-[var(--dim)]">
                Classement · {rows.length} participant{rows.length > 1 ? 's' : ''}
              </p>
              <p className="font-mono-code text-[11px] text-[var(--dim)] hidden sm:block">
                10 pts / bonne rép. + bonus précision
              </p>
            </div>

            <ol className="m-0 p-0 list-none divide-y divide-[var(--line)]">
              {rows.map((row) => (
                <li
                  key={row.pseudo}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    row.isCurrentUser ? 'bg-[var(--accent-soft)]/55' : ''
                  }`}
                >
                  <span
                    className={`w-6 shrink-0 text-center font-mono-code text-[14.5px] font-semibold tabular-nums ${
                      row.rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--dim)]'
                    }`}
                  >
                    {row.rank}
                  </span>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] font-mono-code text-[12px] font-semibold text-[var(--text)]">
                    {getInitials(row.pseudo)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-[var(--text)] truncate">
                      {row.pseudo}
                      {row.isCurrentUser && (
                        <span className="ml-1.5 font-mono-code text-[11px] text-[var(--accent)]">
                          · vous
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-[var(--dim)] tabular-nums">
                      {row.bonnesReponses}/{row.totalQuestions} · {row.accuracy}% · {row.sessionsCount}{' '}
                      quiz
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono-code text-[16px] font-bold tabular-nums text-[var(--text)]">
                      {row.points}
                    </span>
                    <span className="ml-1 font-mono-code text-[11px] text-[var(--dim)]">pts</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
