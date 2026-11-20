import { BookOpen, ChevronRight, Lock, RefreshCw, WifiOff } from 'lucide-react';
import type { SubjectSummary } from '../types/quiz';

interface HomeHubProps {
  bannerUrl: string | null;
  subjects: SubjectSummary[];
  loading: boolean;
  syncing: boolean;
  syncError: string | null;
  onSelectSubject: (matiere: string) => void;
  onRefresh: () => void;
  onOpenAdmin: () => void;
}

const DEFAULT_SUBJECT_THEMES: Record<
  string,
  { gradient: string; pattern: string; accent: string }
> = {
  'langage-c': {
    gradient: 'linear-gradient(135deg, #0f3d3e 0%, #1d6359 52%, #0c262d 100%)',
    pattern:
      'radial-gradient(circle at 82% 20%, rgba(95, 201, 174, 0.28) 0%, transparent 45%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 14px)',
    accent: '#5fc9ae',
  },
  'prog-systemes': {
    gradient: 'linear-gradient(135deg, #1b2845 0%, #274060 55%, #121a2e 100%)',
    pattern:
      'radial-gradient(circle at 20% 22%, rgba(115, 192, 232, 0.28) 0%, transparent 48%), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
    accent: '#73c0e8',
  },
  maths: {
    gradient: 'linear-gradient(135deg, #3b1f4b 0%, #5c2d6e 52%, #21122e 100%)',
    pattern:
      'radial-gradient(circle at 80% 25%, rgba(199, 146, 224, 0.28) 0%, transparent 46%), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 16px)',
    accent: '#c792e0',
  },
  ttsd: {
    gradient: 'linear-gradient(135deg, #4a2511 0%, #8a4319 52%, #29150b 100%)',
    pattern:
      'radial-gradient(circle at 75% 20%, rgba(234, 176, 114, 0.3) 0%, transparent 48%), repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 16px)',
    accent: '#eab072',
  },
};

const FALLBACK_PALETTE = [
  {
    gradient: 'linear-gradient(135deg, #163a42 0%, #2b6770 55%, #0f252b 100%)',
    pattern:
      'radial-gradient(circle at 80% 20%, rgba(95, 201, 174, 0.24) 0%, transparent 45%)',
    accent: '#5fc9ae',
  },
  {
    gradient: 'linear-gradient(135deg, #2b2a4c 0%, #43417a 55%, #17162e 100%)',
    pattern:
      'radial-gradient(circle at 20% 25%, rgba(160, 170, 240, 0.25) 0%, transparent 48%)',
    accent: '#a5b4fc',
  },
];

function getSubjectVisual(slug: string, index: number) {
  return DEFAULT_SUBJECT_THEMES[slug] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export function HomeHub({
  bannerUrl,
  subjects,
  loading,
  syncing,
  syncError,
  onSelectSubject,
  onRefresh,
  onOpenAdmin,
}: HomeHubProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 pb-12">
      {/* ==================== TOP FULL-WIDTH BANNER ==================== */}
      <section
        aria-label="Bannière Coach Partiels ESET 3A"
        className="relative w-full h-40 sm:h-auto sm:aspect-[21/9] sm:max-h-[300px] overflow-hidden rounded-2xl border border-[var(--line)] shadow-xs"
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Bannière Coach Partiels — INSA Rennes ESET 3A"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(125deg, #0d2b2a 0%, #1a4f47 45%, #12263a 100%)',
            }}
          >
            {/* Subtle architectural blueprint lines */}
            <svg
              className="h-full w-full opacity-20"
              viewBox="0 0 800 300"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="hub-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#5fc9ae"
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect width="800" height="300" fill="url(#hub-grid)" />
              <path
                d="M0 220 Q 160 150 320 205 T 640 165 T 800 190"
                fill="none"
                stroke="#5fc9ae"
                strokeWidth="2.5"
                strokeOpacity="0.65"
              />
              <circle cx="640" cy="95" r="78" fill="none" stroke="#5fc9ae" strokeWidth="1" strokeOpacity="0.35" />
              <circle cx="640" cy="95" r="46" fill="none" stroke="#5fc9ae" strokeWidth="1" strokeOpacity="0.45" />
            </svg>
          </div>
        )}

        {/* Dark readability gradient scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15"
        />

        {/* Banner Content */}
        <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[22px] sm:text-[30px] font-bold tracking-[-0.025em] text-white leading-tight drop-shadow-xs">
                Coach Partiels · ESET 3A
              </h1>
              <p className="mt-1 text-[13px] sm:text-[14.5px] font-medium text-white/80">
                INSA Rennes · Révisions par matière, DS et classements
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={syncing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/35 text-white/90 backdrop-blur-sm border border-white/15 hover:bg-black/55 transition-colors disabled:opacity-50"
              aria-label="Actualiser les matières et les quiz"
              title="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ==================== SUBJECTS GRID (LEVEL 1 HUB) ==================== */}
      <section className="mt-6" aria-labelledby="hub-subjects-heading">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h2
            id="hub-subjects-heading"
            className="text-[15.5px] sm:text-[17px] font-semibold tracking-[-0.015em] text-[var(--text)]"
          >
            Matières
          </h2>
          {subjects.length > 0 && (
            <span className="font-mono-code text-[12px] text-[var(--dim)] tabular-nums">
              {subjects.length} matière{subjects.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && subjects.length === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 sm:h-44 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Offline / Error State */}
        {!loading && subjects.length === 0 && syncError && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <WifiOff className="h-6 w-6" />
            </div>
            <h3 className="mt-3.5 text-[17px] font-semibold text-[var(--text)]">
              Connexion Supabase indisponible
            </h3>
            <p className="mt-1.5 text-[14px] text-[var(--dim)]">
              Impossible de charger les matières pour le moment. Vérifiez votre connexion puis réessayez.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-[14px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        {/* Empty State (if subjects table is genuinely empty) */}
        {!loading && subjects.length === 0 && !syncError && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-3.5 text-[17px] font-semibold text-[var(--text)]">
              Aucune matière configurée
            </h3>
            <p className="mt-1.5 text-[14px] text-[var(--dim)]">
              Ajoutez vos matières ou déployez le schéma Supabase pour démarrer.
            </p>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-[14px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <Lock className="h-4 w-4" />
              <span>Ouvrir l&apos;espace Admin</span>
            </button>
          </div>
        )}

        {/* Responsive 2-col Mobile / 4-col Desktop Subject Cover Grid */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {subjects.map((sub, idx) => {
              const visual = getSubjectVisual(sub.slug, idx);
              const hasQuizzes = sub.totalQuestions > 0;

              return (
                <button
                  key={sub.id ?? sub.matiere}
                  type="button"
                  onClick={() => onSelectSubject(sub.matiere)}
                  className="group relative flex min-h-[148px] sm:min-h-[176px] w-full flex-col justify-end overflow-hidden rounded-2xl border border-[var(--line)] p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md active:scale-[0.98]"
                >
                  {/* Cover image OR dedicated geometric gradient */}
                  {sub.cover_image_url ? (
                    <img
                      src={sub.cover_image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                        style={{ background: visual.gradient }}
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                          backgroundImage: visual.pattern,
                          backgroundSize: sub.slug === 'prog-systemes' ? '22px 22px' : undefined,
                        }}
                      />
                    </>
                  )}

                  {/* Dark overlay for guaranteed white text contrast */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
                  />

                  {/* Card Text */}
                  <div className="relative z-10 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[16.5px] sm:text-[17.5px] font-bold tracking-[-0.015em] text-white leading-snug">
                        {sub.matiere}
                      </span>
                      <span className="mt-1 block font-mono-code text-[11.5px] text-white/80 tabular-nums">
                        {hasQuizzes
                          ? `${sub.sections.length} DS · ${sub.totalQuestions} q.`
                          : 'Bientôt disponible'}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/75 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
