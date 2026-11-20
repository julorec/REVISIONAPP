import test from 'node:test';
import assert from 'node:assert/strict';
import type { HydratedQuestion, QuizRow } from '../types/quiz';
import {
  computeQuizResult,
  evaluateAnswer,
  getShuffledOrderItems,
  isCalculAnswerCorrect,
  isChoiceQuestion,
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
  // Zero target
  assert.equal(isCalculAnswerCorrect(0, 0), true);
  assert.equal(isCalculAnswerCorrect(0.01, 0), false);
  // Negative target
  assert.equal(isCalculAnswerCorrect(-20.9, -20), true);
  assert.equal(isCalculAnswerCorrect(-21.5, -20), false);
});

test('evaluateAnswer handles qcm, vrai_faux, calcul (numeric & options), and ordre', () => {
  const qcm: HydratedQuestion = {
    id: '1',
    type: 'qcm',
    ask: 'QCM',
    opts: ['A', 'B'],
    ans: 1,
    why: 'w',
    matiere: 'C',
    chapitre: 'Ch1',
    type_source: 'Cours',
    quizId: 'r1',
  };
  const calcNum: HydratedQuestion = {
    id: '2',
    type: 'calcul',
    ask: 'Calc',
    reponse_numerique: 1591.5,
    unite: 'Hz',
    tolerance: 0.05,
    why: 'w',
    matiere: 'TS',
    chapitre: 'Ch1',
    type_source: 'Cours',
    quizId: 'r2',
  };
  const calcOpts: HydratedQuestion = {
    id: '3',
    type: 'calcul',
    ask: 'Calc QCM',
    opts: ['10', '20'],
    ans: 0,
    why: 'w',
    matiere: 'TS',
    chapitre: 'Ch1',
    type_source: 'Cours',
    quizId: 'r2',
  };
  const ordre: HydratedQuestion = {
    id: '4',
    type: 'ordre',
    ask: 'Ordre',
    ordre_correct: ['A', 'B', 'C'],
    why: 'w',
    matiere: 'C',
    chapitre: 'Ch2',
    type_source: 'Annales',
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
  assert.equal(summary.missedQuestions.length, 1);
  assert.equal(summary.missedQuestions[0].id, '2');
});

test('getShuffledOrderItems never returns the already-solved sequence for 2+ distinct items', () => {
  const correct = ['Étape 1', 'Étape 2', 'Étape 3', 'Étape 4'];
  // Constant RNG that would normally leave order unchanged
  const shuffled = getShuffledOrderItems(correct, () => 0.9999);
  assert.equal(shuffled.length, 4);
  assert.notDeepEqual(shuffled, correct);
  assert.deepEqual([...shuffled].sort(), [...correct].sort());
});

test('selectQuizQuestions Mode Examen Mélangé draws 20 random questions across all chapters', () => {
  const rows: QuizRow[] = [
    {
      id: 'c1',
      matiere: 'Programmation C',
      chapitre: 'Pointeurs',
      type_source: 'Cours',
      questions: Array.from({ length: 12 }, (_, i) => ({
        id: `p${i}`,
        type: 'qcm',
        ask: `Q ${i}`,
        opts: ['A', 'B'],
        ans: 0,
        why: 'ok',
      })),
    },
    {
      id: 'c2',
      matiere: 'Programmation C',
      chapitre: 'Bitwise',
      type_source: 'Annales',
      questions: Array.from({ length: 12 }, (_, i) => ({
        id: `b${i}`,
        type: 'qcm',
        ask: `B ${i}`,
        opts: ['A', 'B'],
        ans: 1,
        why: 'ok',
      })),
    },
  ];

  const exam = selectQuizQuestions(rows, {
    matiere: 'Programmation C',
    chapitre: 'Pointeurs', // ignored in exam mode
    mode: 'exam',
  });
  assert.equal(exam.length, 20);
  const chapters = new Set(exam.map((q) => q.chapitre));
  assert.equal(chapters.size, 2);
});
