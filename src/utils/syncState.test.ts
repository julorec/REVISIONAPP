import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeRemoteAndPendingScores,
  removeSyncedPendingScores,
  shouldTriggerBackgroundSync,
  type PendingScorePayload,
} from './syncState';
import type { ScoreEntry } from '../types/quiz';

test('shouldTriggerBackgroundSync respects throttle window', () => {
  assert.equal(shouldTriggerBackgroundSync(0, 1000, 5000), true);
  assert.equal(shouldTriggerBackgroundSync(1000, 4999, 5000), false);
  assert.equal(shouldTriggerBackgroundSync(1000, 6000, 5000), true);
});

test('pending score queue merges with remote Supabase scores and removes flushed items cleanly', () => {
  const remote: ScoreEntry[] = [
    {
      id: 'sb-1',
      pseudo: 'Camille',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      points: 120,
      bonnes_reponses: 10,
      total_questions: 10,
      origin: 'supabase',
    },
  ];
  const pending: PendingScorePayload[] = [
    {
      clientId: 'pending-1',
      pseudo: 'Jules',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      points: 90,
      bonnes_reponses: 8,
      total_questions: 10,
      created_at: '2026-11-20T12:00:00.000Z',
    },
    {
      clientId: 'pending-2',
      pseudo: 'Jules',
      matiere: 'Traitement du Signal',
      section_ds: 'DS 1',
      points: 60,
      bonnes_reponses: 6,
      total_questions: 10,
      created_at: '2026-11-20T12:05:00.000Z',
    },
  ];

  const merged = mergeRemoteAndPendingScores(remote, pending);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].pseudo, 'Jules');
  assert.equal(merged[2].id, 'sb-1');

  const remaining = removeSyncedPendingScores(pending, new Set(['pending-1']));
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].clientId, 'pending-2');
});
