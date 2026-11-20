import test from 'node:test';
import assert from 'node:assert/strict';
import type { HydratedQuestion, QuizQuestion, QuizRow } from '../types/quiz';
import {
  buildSubjectSummaries,
  computeQuizResult,
  countMatchingFilteredQuestions,
  evaluateAnswer,
  getShuffledOrderItems,
  isCalculAnswerCorrect,
  isChoiceQuestion,
  mergeQuestionsIntoBatch,
  parseNumericInput,
  selectQuizQuestions,
} from './quizEngine';

test('parseNumericInput supports French commas, spaces, and scientific notation', () => {
  assert.equal(parseNumericInput('1,59'), 1.59);
  assert.equal(parseNumericInput('  -3.2e-3 '), -0.0032);
  assert.equal(parseNumericInput('abc'), null);
  assert.equal(parseNumericInput(''), null);
});

test('isCalculAnswerCorrect enforces ±5% relative tolerance', () => {
  assert.equal(isCalculAnswerCorrect(100, 100), true);
  assert.equal(isCalculAnswerCorrect(105, 100), true);
  assert.equal(isCalculAnswerCorrect(95, 100), true);
  assert.equal(isCalculAnswerCorrect(105.1, 100), false);
  assert.equal(isCalculAnswerCorrect(94.9, 100), false);
  assert.equal(isCalculAnswerCorrect(0, 0), true);
  assert.equal(isCalculAnswerCorrect(0.01, 0), false);
  assert.equal(isCalculAnswerCorrect(-20.9, -20), true);
  assert.equal(isCalculAnswerCorrect(-21.5, -20), false);
});

test('evaluateAnswer handles qcm, vrai_faux, calcul (numeric & options), and ordre', () => {
  const qcm: HydratedQuestion = {
    id: '1',
    type: 'qcm',
    themes: ['Pointeurs'],
    difficulte: 1,
    ask: 'QCM',
    opts: ['A', 'B'],
    ans: 1,
    why: 'w',
    matiere: 'C',
    section_ds: 'DS 1',
    chapitre: 'Banque DS 1',
    quizId: 'r1',
  };
  const calcNum: HydratedQuestion = {
    id: '2',
    type: 'calcul',
    themes: ['Filtres', 'Bode'],
    difficulte: 2,
    ask: 'Calc',
    reponse_numerique: 1591.5,
    unite: 'Hz',
    tolerance: 0.05,
    why: 'w',
    matiere: 'TS',
    section_ds: 'DS 1',
    chapitre: 'Banque DS 1',
    quizId: 'r2',
  };
  const calcOpts: HydratedQuestion = {
    id: '3',
    type: 'calcul',
    themes: ['Bode'],
    difficulte: 2,
    ask: 'Calc QCM',
    opts: ['10', '20'],
    ans: 0,
    why: 'w',
    matiere: 'TS',
    section_ds: 'DS 1',
    chapitre: 'Banque DS 1',
    quizId: 'r2',
  };
  const ordre: HydratedQuestion = {
    id: '4',
    type: 'ordre',
    themes: ['Compilation'],
    difficulte: 3,
    ask: 'Ordre',
    ordre_correct: ['A', 'B', 'C'],
    why: 'w',
    matiere: 'C',
    section_ds: 'DS 2',
    chapitre: 'Banque DS 2',
    quizId: 'r3',
  };

  assert.equal(isChoiceQuestion(calcNum), false);
  assert.equal(isChoiceQuestion(calcOpts), true);

  assert.equal(evaluateAnswer(qcm, { kind: 'choice', index: 1 }), true);
  assert.equal(evaluateAnswer(qcm, { kind: 'choice', index: 0 }), false);

  assert.equal(evaluateAnswer(calcNum, { kind: 'numeric', raw: '1600', value: 1600 }), true);
  assert.equal(evaluateAnswer(calcNum, { kind: 'numeric', raw: '1200', value: 1200 }), false);

  assert.equal(evaluateAnswer(calcOpts, { kind: 'choice', index: 0 }), true);

  assert.equal(evaluateAnswer(ordre, { kind: 'order', sequence: ['A', 'B', 'C'] }), true);
  assert.equal(evaluateAnswer(ordre, { kind: 'order', sequence: ['A', 'C', 'B'] }), false);

  const summary = computeQuizResult(
    [qcm, calcNum, calcOpts, ordre],
    [
      { kind: 'choice', index: 1 },
      { kind: 'numeric', raw: '1200', value: 1200 },
      { kind: 'choice', index: 0 },
      { kind: 'order', sequence: ['A', 'B', 'C'] },
    ]
  );
  assert.equal(summary.score, 3);
  assert.equal(summary.total, 4);
  assert.equal(summary.points, 30);
  assert.equal(summary.missedQuestions.length, 1);
  assert.equal(summary.missedQuestions[0].id, '2');
  // Theme breakdown tracks Bode across both calcNum (wrong) and calcOpts (right)
  const bodeStat = summary.byTheme.find((t) => t.theme === 'Bode');
  assert.deepEqual(bodeStat, { theme: 'Bode', right: 1, total: 2 });
});

test('getShuffledOrderItems never returns the already-solved sequence for 2+ distinct items', () => {
  const correct = ['Étape 1', 'Étape 2', 'Étape 3', 'Étape 4'];
  const shuffled = getShuffledOrderItems(correct, () => 0.9999);
  assert.equal(shuffled.length, 4);
  assert.notDeepEqual(shuffled, correct);
  assert.deepEqual([...shuffled].sort(), [...correct].sort());
});

test('buildSubjectSummaries extracts unique multi-themes per DS and supports multi-theme filtering + 20/30 exam mode', () => {
  const ds1Questions: QuizQuestion[] = [
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`,
      type: 'qcm' as const,
      themes: i < 5 ? ['Pointeurs', 'Allocation dynamique'] : ['Pointeurs'],
      ask: `Q Pointeurs ${i}`,
      opts: ['A', 'B'],
      ans: 0,
      why: 'ok',
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      type: 'qcm' as const,
      themes: ['Allocation dynamique'],
      ask: `Q Alloc ${i}`,
      opts: ['A', 'B'],
      ans: 0,
      why: 'ok',
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `b${i}`,
      type: 'qcm' as const,
      themes: ['Bitwise'],
      ask: `Q Bitwise ${i}`,
      opts: ['A', 'B'],
      ans: 1,
      why: 'ok',
    })),
  ];

  const rows: QuizRow[] = [
    {
      id: 'c-ds1',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      chapitre: 'Banque DS 1',
      questions: ds1Questions,
    },
    {
      id: 'c-ds2',
      matiere: 'Programmation C',
      section_ds: 'DS 2',
      chapitre: 'Banque DS 2',
      questions: Array.from({ length: 6 }, (_, i) => ({
        id: `s${i}`,
        type: 'qcm' as const,
        themes: ['Structures'],
        ask: `S ${i}`,
        opts: ['A', 'B'],
        ans: 0,
        why: 'ok',
      })),
    },
  ];

  const summaries = buildSubjectSummaries(rows, {});
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].sections.length, 2);

  const ds1 = summaries[0].sections[0];
  assert.equal(ds1.section_ds, 'DS 1');
  assert.equal(ds1.totalQuestions, 40);
  // Unique themes in DS 1: Pointeurs (15), Allocation dynamique (15 = 5 shared + 10 pure), Bitwise (15)
  assert.equal(ds1.themes.length, 3);
  const allocTheme = ds1.themes.find((t) => t.theme === 'Allocation dynamique');
  assert.equal(allocTheme?.totalQuestions, 15);

  // Multi-select filtering: Pointeurs + Allocation dynamique -> 25 unique questions (5 shared not duplicated!)
  const multiFiltered = selectQuizQuestions(rows, {
    matiere: 'Programmation C',
    section_ds: 'DS 1',
    themes: ['Pointeurs', 'Allocation dynamique'],
    mode: 'themes',
  });
  assert.equal(multiFiltered.length, 25);
  assert.equal(new Set(multiFiltered.map((q) => q.id)).size, 25);

  // Mode Examen DS 20q and 30q
  const exam20 = selectQuizQuestions(rows, {
    matiere: 'Programmation C',
    section_ds: 'DS 1',
    mode: 'exam',
    examSize: 20,
  });
  assert.equal(exam20.length, 20);
  assert.equal(exam20.every((q) => q.section_ds === 'DS 1'), true);

  const exam30 = selectQuizQuestions(rows, {
    matiere: 'Programmation C',
    section_ds: 'DS 1',
    mode: 'exam',
    examSize: 30,
  });
  assert.equal(exam30.length, 30);
  assert.equal(exam30.every((q) => q.section_ds === 'DS 1'), true);
});

test('mergeQuestionsIntoBatch appends incoming questions without overwriting existing ones or colliding IDs', () => {
  const existing: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'qcm',
      themes: ['Pointeurs'],
      ask: 'Old Q1',
      opts: ['A', 'B'],
      ans: 0,
      why: 'old',
    },
  ];
  const incoming: QuizQuestion[] = [
    {
      id: 'q1', // colliding ID
      type: 'qcm',
      themes: ['Allocation dynamique'],
      ask: 'New Q1',
      opts: ['C', 'D'],
      ans: 1,
      why: 'new',
    },
    {
      id: 'q2',
      type: 'vrai_faux',
      themes: ['Bitwise'],
      ask: 'New Q2',
      opts: ['Vrai', 'Faux'],
      ans: 0,
      why: 'new2',
    },
  ];

  const merged = mergeQuestionsIntoBatch(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].ask, 'Old Q1');
  assert.equal(merged[1].ask, 'New Q1');
  assert.notEqual(merged[1].id, merged[0].id);
  assert.equal(merged[2].id, 'q2');
});

test('combinable theme and difficulty filters default missing difficulte to 2 and intersect accurately', () => {
  const rows: QuizRow[] = [
    {
      id: 'c-ds1',
      matiere: 'Programmation C',
      section_ds: 'DS 1',
      chapitre: 'DS 1',
      questions: [
        { id: '1', type: 'qcm', themes: ['Pointeurs'], difficulte: 1, ask: 'P1', opts: ['A', 'B'], ans: 0, why: 'ok' },
        { id: '2', type: 'qcm', themes: ['Pointeurs'], ask: 'P2 legacy (defaults to 2)', opts: ['A', 'B'], ans: 0, why: 'ok' },
        { id: '3', type: 'qcm', themes: ['Pointeurs'], difficulte: 3, ask: 'P3', opts: ['A', 'B'], ans: 0, why: 'ok' },
        { id: '4', type: 'qcm', themes: ['Bitwise'], difficulte: 1, ask: 'B1', opts: ['A', 'B'], ans: 0, why: 'ok' },
        { id: '5', type: 'qcm', themes: ['Bitwise'], difficulte: 3, ask: 'B3', opts: ['A', 'B'], ans: 0, why: 'ok' },
      ],
    },
  ];

  const summaries = buildSubjectSummaries(rows, {});
  assert.deepEqual(summaries[0].sections[0].difficultyCounts, { 1: 2, 2: 1, 3: 2 });

  // Theme = Pointeurs AND Difficulty = [2, 3] -> Q2 (legacy default 2) + Q3 (3)
  assert.equal(
    countMatchingFilteredQuestions(rows, 'Programmation C', 'DS 1', ['Pointeurs'], [2, 3]),
    2
  );
  const picked = selectQuizQuestions(rows, {
    matiere: 'Programmation C',
    section_ds: 'DS 1',
    themes: ['Pointeurs'],
    difficulties: [2, 3],
    mode: 'themes',
  });
  assert.equal(picked.length, 2);
  assert.equal(picked.every((q) => q.themes.includes('Pointeurs') && (q.difficulte === 2 || q.difficulte === 3)), true);

  // Theme = Bitwise AND Difficulty = [2] -> 0 questions
  assert.equal(
    countMatchingFilteredQuestions(rows, 'Programmation C', 'DS 1', ['Bitwise'], [2]),
    0
  );

  // Difficulty only = [1, 3] across all themes -> 4 questions
  assert.equal(
    countMatchingFilteredQuestions(rows, 'Programmation C', 'DS 1', [], [1, 3]),
    4
  );
});

