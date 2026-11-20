import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestionList, normalizeThemes } from './quizNormalizer';

test('normalizeThemes parses arrays, comma strings, deduplicates case-insensitively, and falls back cleanly', () => {
  assert.deepEqual(normalizeThemes(['Pointeurs', 'Allocation dynamique', 'pointeurs']), [
    'Pointeurs',
    'Allocation dynamique',
  ]);
  assert.deepEqual(normalizeThemes('Bitwise, Registres ; Bitwise'), ['Bitwise', 'Registres']);
  assert.deepEqual(normalizeThemes(undefined, 'Filtre RC'), ['Filtre RC']);
  assert.deepEqual(normalizeThemes(undefined, undefined), ['Général']);
});

test('normalizeQuestionList handles multi-theme qcm, vrai_faux, calcul (numeric & options), ordre, svg, and lang', () => {
  const payload = JSON.stringify([
    {
      type: 'qcm',
      themes: ['Bitwise', 'Pièges C'],
      question: 'Que vaut `x` ?',
      code: 'int x = 1 << 3;',
      options: ['4', '8', '16'],
      answer: 'B',
      explication: 'Décalage de 3 bits à gauche.',
    },
    {
      type: 'vrai_faux',
      themes: ['Allocation dynamique', 'Pointeurs'],
      question: 'free(NULL) provoque un segfault.',
      reponse: false,
      explication: 'La norme C garantit que free(NULL) est sans effet.',
    },
    {
      type: 'calcul',
      themes: ['Filtre RC', 'Bode'],
      question: 'Calculez $f_c$ pour $R=1\\,\\text{k}\\Omega$, $C=100\\,\\text{nF}$.',
      reponse_numerique: 1591.5,
      unite: 'Hz',
      svg: '<svg viewBox="0 0 100 40"><rect width="20" height="10"/></svg>',
      explication: '$f_c = \\frac{1}{2\\pi RC}$.',
    },
    {
      type: 'calcul',
      question: 'Calcul avec options explicites',
      concept: 'Décibels',
      options: ['10 Hz', '20 Hz', '40 Hz'],
      ans: 1,
      unite: 'Hz',
      why: 'Bascule en choix multiples quand options est fourni.',
    },
    {
      type: 'ordre',
      themes: ['Compilation'],
      question: 'Ordonnez les étapes de compilation C :',
      ordre_correct: ['Préprocesseur', 'Compilateur', 'Assembleur', 'Éditeur de liens'],
      why: 'Chaîne GCC classique.',
    },
  ]);

  const res = normalizeQuestionList(payload, 'test');
  assert.equal(res.ok, true, res.errors.join('; '));
  assert.equal(res.questions.length, 5);

  assert.equal(res.questions[0].type, 'qcm');
  assert.deepEqual(res.questions[0].themes, ['Bitwise', 'Pièges C']);
  assert.equal(res.questions[0].ans, 1);
  assert.equal(res.questions[0].lang, 'c');

  assert.equal(res.questions[1].type, 'vrai_faux');
  assert.deepEqual(res.questions[1].themes, ['Allocation dynamique', 'Pointeurs']);
  assert.deepEqual(res.questions[1].opts, ['Vrai', 'Faux']);
  assert.equal(res.questions[1].ans, 1);

  assert.equal(res.questions[2].type, 'calcul');
  assert.deepEqual(res.questions[2].themes, ['Filtre RC', 'Bode']);
  assert.equal(res.questions[2].reponse_numerique, 1591.5);
  assert.equal(res.questions[2].unite, 'Hz');
  assert.equal(res.questions[2].tolerance, 0.05);
  assert.ok(res.questions[2].svg?.includes('<svg'));

  assert.equal(res.questions[3].type, 'calcul');
  assert.deepEqual(res.questions[3].themes, ['Décibels']);
  assert.deepEqual(res.questions[3].opts, ['10 Hz', '20 Hz', '40 Hz']);
  assert.equal(res.questions[3].ans, 1);

  assert.equal(res.questions[4].type, 'ordre');
  assert.deepEqual(res.questions[4].themes, ['Compilation']);
  assert.deepEqual(res.questions[4].ordre_correct, [
    'Préprocesseur',
    'Compilateur',
    'Assembleur',
    'Éditeur de liens',
  ]);
});

test('normalizeQuestionList rejects invalid calcul and ordre schemas with clear errors', () => {
  const res = normalizeQuestionList([
    { type: 'calcul', question: 'Manque reponse_numerique' },
    { type: 'ordre', question: 'Trop court', ordre_correct: ['Seul'] },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.errors.length, 2);
});

test('normalizeQuestionList accepts reponse_index, reponse, answer, and ans across qcm and vrai_faux', () => {
  const res = normalizeQuestionList([
    {
      type: 'qcm',
      question: 'QCM avec reponse_index numérique',
      options: ['A0', 'A1', 'A2', 'A3'],
      reponse_index: 2,
      explication: 'Index 2 attendu.',
    },
    {
      type: 'vrai_faux',
      question: 'Vrai/Faux avec reponse_index = 0',
      reponse_index: 0,
      explication: 'Vrai = index 0.',
    },
    {
      type: 'vrai_faux',
      question: 'Vrai/Faux avec reponse = "false"',
      reponse: 'false',
      explication: 'Faux = index 1.',
    },
    {
      type: 'qcm',
      question: 'QCM avec reponse texte exact',
      options: ['malloc', 'calloc', 'free'],
      reponse: 'free',
      explication: 'Match texte exact.',
    },
    {
      type: 'qcm',
      question: 'QCM avec answer lettre et ans numérique',
      options: ['O1', 'O2'],
      answer: 'B',
      explication: 'Lettre B = index 1.',
    },
    {
      type: 'qcm',
      question: 'QCM avec ans = 0',
      options: ['O1', 'O2'],
      ans: 0,
      explication: 'ans = 0.',
    },
  ]);

  assert.equal(res.ok, true, res.errors.join('; '));
  assert.deepEqual(
    res.questions.map((q) => q.ans),
    [2, 0, 1, 2, 1, 0]
  );
  // Backwards compatibility: omitted difficulte defaults to 2
  assert.deepEqual(
    res.questions.map((q) => q.difficulte),
    [2, 2, 2, 2, 2, 2]
  );
});

test('normalizeQuestionList validates difficulte (1, 2, 3), defaults missing to 2, and rejects out-of-range values', () => {
  const valid = normalizeQuestionList([
    { type: 'qcm', question: 'Facile', options: ['A', 'B'], reponse_index: 0, difficulte: 1 },
    { type: 'qcm', question: 'Sans champ', options: ['A', 'B'], reponse_index: 1 },
    { type: 'calcul', question: 'Partiel', reponse_numerique: 42, difficulte: 3 },
    { type: 'ordre', question: 'String 2', ordre_correct: ['1', '2'], difficulte: '2' },
  ]);
  assert.equal(valid.ok, true, valid.errors.join('; '));
  assert.deepEqual(
    valid.questions.map((q) => q.difficulte),
    [1, 2, 3, 2]
  );

  const invalid = normalizeQuestionList([
    { type: 'qcm', question: 'Trop haut', options: ['A', 'B'], reponse_index: 0, difficulte: 4 },
    { type: 'qcm', question: 'Zero', options: ['A', 'B'], reponse_index: 0, difficulte: 0 },
  ]);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.length, 2);
});


