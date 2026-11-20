import type { ScoreEntry } from '../types/quiz';

export interface PendingScorePayload {
  clientId: string;
  pseudo: string;
  matiere: string;
  section_ds: string;
  points: number;
  bonnes_reponses: number;
  total_questions: number;
  created_at: string;
}

/**
 * Determines whether a foreground/focus refresh should trigger based on minimum interval.
 */
export function shouldTriggerBackgroundSync(
  lastSyncAt: number,
  now: number,
  minIntervalMs = 5000
): boolean {
  if (lastSyncAt <= 0) return true;
  return now - lastSyncAt >= minIntervalMs;
}

/**
 * Merges remote Supabase scores with any still-pending offline scores (never duplicating IDs).
 */
export function mergeRemoteAndPendingScores(
  remoteScores: ScoreEntry[],
  pending: PendingScorePayload[]
): ScoreEntry[] {
  const pendingEntries: ScoreEntry[] = pending.map((p) => ({
    id: p.clientId,
    pseudo: p.pseudo,
    matiere: p.matiere,
    section_ds: p.section_ds,
    points: p.points,
    bonnes_reponses: p.bonnes_reponses,
    total_questions: p.total_questions,
    created_at: p.created_at,
    origin: 'local',
  }));
  return [...pendingEntries, ...remoteScores];
}

/**
 * Removes successfully synced pending scores by their clientId.
 */
export function removeSyncedPendingScores(
  pending: PendingScorePayload[],
  syncedClientIds: ReadonlySet<string>
): PendingScorePayload[] {
  return pending.filter((p) => !syncedClientIds.has(p.clientId));
}
