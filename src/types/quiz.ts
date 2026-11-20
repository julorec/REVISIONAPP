export type QuizMode = 'themes' | 'exam';

export type ExamSize = 20 | 30;

export type QuestionType = 'qcm' | 'vrai_faux' | 'calcul' | 'ordre';

export type CodeLanguage = 'c' | 'vhdl' | 'asm' | 'python' | 'text';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  /** Multiple notion/topic tags per question (e.g. ["Pointeurs", "Allocation dynamique"]) */
  themes: string[];
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
  section_ds: string;
  chapitre: string;
  quizId: string;
}

export interface QuizRow {
  id: string;
  matiere: string;
  section_ds: string;
  chapitre: string;
  questions: QuizQuestion[];
  origin?: 'supabase' | 'local' | 'seed';
  created_at?: string;
}

export interface ScoreEntry {
  id: string;
  pseudo: string;
  matiere: string;
  section_ds: string;
  points: number;
  bonnes_reponses: number;
  total_questions: number;
  created_at?: string;
  origin?: 'supabase' | 'local' | 'seed';
}

export interface LeaderboardRow {
  rank: number;
  pseudo: string;
  points: number;
  bonnesReponses: number;
  totalQuestions: number;
  sessionsCount: number;
  accuracy: number;
  isCurrentUser: boolean;
}

export interface QuestionProgress {
  tries: number;
  right: number;
  lastOk: boolean;
  updatedAt: number;
}

export type ProgressMap = Record<string, QuestionProgress>;

export interface ThemeSummary {
  theme: string;
  totalQuestions: number;
  seenCount: number;
  missedCount: number;
}

export interface SectionSummary {
  section_ds: string;
  totalQuestions: number;
  seenCount: number;
  rightCount: number;
  triesCount: number;
  missedCount: number;
  themes: ThemeSummary[];
}

export interface SubjectSummary {
  matiere: string;
  totalQuestions: number;
  sections: SectionSummary[];
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
  points: number;
  missedQuestions: HydratedQuestion[];
  byTheme: Array<{
    theme: string;
    right: number;
    total: number;
  }>;
}
