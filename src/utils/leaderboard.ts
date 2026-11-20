import type { LeaderboardRow, ScoreEntry } from '../types/quiz';

/**
 * Deterministic scoring formula for ESET 3A leaderboard:
 * - 10 points per correct answer
 * - +15 accuracy bonus if >= 80% on at least 2 questions
 * - +25 perfect-run bonus if 100% on at least 3 questions
 */
export function computeQuizPoints(bonnesReponses: number, totalQuestions: number): number {
  if (totalQuestions <= 0 || bonnesReponses <= 0) return 0;
  const base = bonnesReponses * 10;
  const ratio = bonnesReponses / totalQuestions;
  let bonus = 0;
  if (totalQuestions >= 3 && bonnesReponses === totalQuestions) {
    bonus = 25;
  } else if (totalQuestions >= 2 && ratio >= 0.8) {
    bonus = 15;
  }
  return base + bonus;
}

export function normalizePseudoKey(pseudo: string): string {
  return pseudo.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getAvailableSectionsFromScores(
  scores: ScoreEntry[],
  matiere: string,
  extraSections: string[] = []
): string[] {
  const set = new Set<string>(extraSections.map((s) => s.trim()).filter(Boolean));
  for (const s of scores) {
    if (s.matiere === matiere && s.section_ds && s.section_ds.trim()) {
      set.add(s.section_ds.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}

export function aggregateLeaderboard(
  scores: ScoreEntry[],
  options: {
    matiere: string;
    sectionDs?: string; // 'all' or exact section_ds
    currentPseudo?: string;
  }
): LeaderboardRow[] {
  const { matiere, sectionDs = 'all', currentPseudo = '' } = options;
  const currentKey = normalizePseudoKey(currentPseudo);

  const filtered = scores.filter((entry) => {
    if (entry.matiere !== matiere) return false;
    if (sectionDs !== 'all' && entry.section_ds !== sectionDs) return false;
    return entry.pseudo.trim().length > 0;
  });

  const byStudent = new Map<
    string,
    {
      pseudo: string;
      points: number;
      bonnesReponses: number;
      totalQuestions: number;
      sessionsCount: number;
    }
  >();

  for (const entry of filtered) {
    const key = normalizePseudoKey(entry.pseudo);
    const existing = byStudent.get(key) ?? {
      pseudo: entry.pseudo.trim(),
      points: 0,
      bonnesReponses: 0,
      totalQuestions: 0,
      sessionsCount: 0,
    };

    existing.points += Math.max(0, Number(entry.points) || 0);
    existing.bonnesReponses += Math.max(0, Number(entry.bonnes_reponses) || 0);
    existing.totalQuestions += Math.max(0, Number(entry.total_questions) || 0);
    existing.sessionsCount += 1;
    // Prefer latest display casing if current user matches
    if (key === currentKey && currentPseudo.trim()) {
      existing.pseudo = currentPseudo.trim();
    }

    byStudent.set(key, existing);
  }

  const sorted = Array.from(byStudent.entries())
    .map(([key, stats]) => ({
      key,
      pseudo: stats.pseudo,
      points: stats.points,
      bonnesReponses: stats.bonnesReponses,
      totalQuestions: stats.totalQuestions,
      sessionsCount: stats.sessionsCount,
      accuracy:
        stats.totalQuestions > 0
          ? Math.round((stats.bonnesReponses / stats.totalQuestions) * 100)
          : 0,
      isCurrentUser: currentKey.length > 0 && key === currentKey,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.bonnesReponses !== a.bonnesReponses) return b.bonnesReponses - a.bonnesReponses;
      return a.pseudo.localeCompare(b.pseudo, 'fr');
    });

  return sorted.map((row, idx) => ({
    rank: idx + 1,
    pseudo: row.pseudo,
    points: row.points,
    bonnesReponses: row.bonnesReponses,
    totalQuestions: row.totalQuestions,
    sessionsCount: row.sessionsCount,
    accuracy: row.accuracy,
    isCurrentUser: row.isCurrentUser,
  }));
}
