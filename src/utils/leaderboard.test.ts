import test from 'node:test';
import assert from 'node:assert/strict';
import type { ScoreEntry } from '../types/quiz';
import {
  aggregateLeaderboard,
  computeQuizPoints,
  getAvailableSectionsFromScores,
} from './leaderboard';

test('computeQuizPoints awards 10 pts per right answer plus accuracy/perfect bonuses', () => {
  assert.equal(computeQuizPoints(0, 5), 0);
  assert.equal(computeQuizPoints(2, 5), 20);
  // 80% on 5 questions -> 40 + 15 = 55
  assert.equal(computeQuizPoints(4, 5), 55);
  // 100% on 4 questions -> 40 + 25 = 65
  assert.equal(computeQuizPoints(4, 4), 65);
});

test('aggregateLeaderboard filters strictly by matiere and optional section_ds, summing points per student', () => {
  const scores: ScoreEntry[] = [
    {
      id: '1',
      pseudo: 'Jules',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      points: 80,
      bonnes_reponses: 8,
      total_questions: 10,
    },
    {
      id: '2',
      pseudo: 'jules ',
      matiere: 'Programmation C',
      section_ds: 'DS 2',
      points: 65,
      bonnes_reponses: 4,
      total_questions: 4,
    },
    {
      id: '3',
      pseudo: 'Camille',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      points: 120,
      bonnes_reponses: 10,
      total_questions: 10,
    },
    {
      id: '4',
      pseudo: 'Nathan',
      matiere: 'Traitement du Signal',
      section_ds: 'DS 1',
      points: 500,
      bonnes_reponses: 50,
      total_questions: 50,
    },
  ];

  // All sections of Programmation C: Jules = 80+65 = 145 (#1), Camille = 120 (#2), Nathan excluded
  const allC = aggregateLeaderboard(scores, {
    matiere: 'Programmation C',
    sectionDs: 'all',
    currentPseudo: 'Jules',
  });
  assert.equal(allC.length, 2);
  assert.equal(allC[0].pseudo, 'Jules');
  assert.equal(allC[0].points, 145);
  assert.equal(allC[0].sessionsCount, 2);
  assert.equal(allC[0].isCurrentUser, true);
  assert.equal(allC[1].pseudo, 'Camille');
  assert.equal(allC[1].rank, 2);

  // Filtered on DS 1 only: Camille = 120 (#1), Jules = 80 (#2)
  const ds1C = aggregateLeaderboard(scores, {
    matiere: 'Programmation C',
    sectionDs: 'DS 1',
    currentPseudo: 'Jules',
  });
  assert.equal(ds1C.length, 2);
  assert.equal(ds1C[0].pseudo, 'Camille');
  assert.equal(ds1C[1].pseudo, 'Jules');
  assert.equal(ds1C[1].points, 80);

  const sections = getAvailableSectionsFromScores(scores, 'Programmation C', ['DS 3']);
  assert.deepEqual(sections, ['DS 1', 'DS 2', 'DS 3']);
});
