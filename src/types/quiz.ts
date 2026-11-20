export type SourceType = 'Cours' | 'Annales';

export type QuizMode = 'all' | 'Cours' | 'Annales' | 'exam';

export type QuestionType = 'qcm' | 'vrai_faux' | 'calcul' | 'ordre';

export type CodeLanguage = 'c' | 'vhdl' | 'asm' | 'python' | 'text';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  ask: string;
  concept?: string;
  code?: string;
  lang?: CodeLanguage;
  stdin?: string;
  svg?: string;
  /** Used for qcm, vrai_faux, and calcul when options are provided */
  opts?: string[];
  /** Correct option index when opts are present */
  ans?: number;
  /** Used for calcul without options */
  reponse_numerique?: number;
  /** Unit displayed next to numeric input (e.g. "kHz", "octets", "$\Omega$") */
  unite?: string;
  /** Relative error tolerance for calcul (default 0.05 = ±5%) */
  tolerance?: number;
  /** Correct ordered sequence for type === 'ordre' */
  ordre_correct?: string[];
  /** Detailed correction explanation */
  why: string;
}

export type UserAnswer =
  | { kind: 'choice'; index: number }
  | { kind: 'numeric'; raw: string; value: number | null }
  | { kind: 'order'; sequence: string[] };

export interface HydratedQuestion extends QuizQuestion {
  matiere: string;
  chapitre: string;
  type_source: SourceType;
  quizId: string;
}

export interface QuizRow {
  id: string;
  matiere: string;
  chapitre: string;
  type_source: SourceType;
  questions: QuizQuestion[];
  origin?: 'supabase' | 'local' | 'seed';
  created_at?: string;
}

export interface QuestionProgress {
  tries: number;
  right: number;
  lastOk: boolean;
  updatedAt: number;
}

export type ProgressMap = Record<string, QuestionProgress>;

export interface ChapterSummary {
  chapitre: string;
  totalQuestions: number;
  coursCount: number;
  annalesCount: number;
  seenCount: number;
  rightCount: number;
  triesCount: number;
  missedCount: number;
}

export interface SubjectSummary {
  matiere: string;
  totalQuestions: number;
  coursCount: number;
  annalesCount: number;
  chapters: ChapterSummary[];
  seenCount: number;
  triesCount: number;
  rightCount: number;
  missedCount: number;
  successRate: number | null;
}

export interface QuizResultSummary {
  score: number;
  total: number;
  percentage: number;
  missedQuestions: HydratedQuestion[];
  byChapter: Array<{
    chapitre: string;
    right: number;
    total: number;
  }>;
}
