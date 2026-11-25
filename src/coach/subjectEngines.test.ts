import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bodeFrac,
  bodeInit,
  bodeWidget,
  clozeFrac,
  clozeInit,
  clozeWidget,
  pipelineFrac,
  pipelineInit,
  pipelineWidget,
  signalFrac,
  signalInit,
  signalWidget,
  subAct,
  subInput,
} from './subjectEngines';
import { sanitizeIngestionResponse } from '../lib/documentIngestion';

test('bode engine scores asymptotic slope, gain, and cutoff frequency accurately', () => {
  const u = {
    kind: 'bode',
    pts: 7,
    circuit: 'rc_lp',
    decades: ['10 Hz', '100 Hz', '1 kHz', '10 kHz', '100 kHz'],
    ref: { gain0: 0, slopeLeft: 0, slopeRight: -20, fcDec: 2 },
    sol: 'fc = 1 kHz',
  };
  const s = bodeInit(u);
  subAct(u, s, 'fc', '2');
  subAct(u, s, 'sl', '0');
  subAct(u, s, 'sr', '-20');
  subAct(u, s, 'g0', '0');
  assert.equal(bodeFrac(u, s), 1);
  const html = bodeWidget(u, '0.0', s);
  assert.ok(html.includes('svg'));
  assert.ok(html.includes('Filtre passe-bas RC'));
});

test('signal engine evaluates Shannon-Nyquist aliasing selection and computed values', () => {
  const u = {
    kind: 'signal',
    pts: 7,
    plot: 'aliasing',
    fmax: 4,
    feChoices: [6, 8, 10],
    expectFe: 8,
    items: [{ label: 'f_e,min =', ans: '8' }],
    sol: 'fe >= 2 fmax',
  };
  const s = signalInit(u);
  assert.equal(signalFrac(u, s), 0);
  subAct(u, s, 'fe', '8');
  subInput(u, s, '0', '8');
  assert.equal(signalFrac(u, s), 1);
  assert.ok(signalWidget(u, '0.0', s).includes('Pas de repliement'));
});

test('pipeline engine tracks brush painting, prefill locks, and exact grading', () => {
  const u = {
    kind: 'pipeline',
    pts: 10,
    forward: true,
    cycles: 6,
    insns: ['lw x1, 0(x2)', 'add x3, x1, x4'],
    prefill: { '0:0': 'IF', '0:1': 'ID', '0:2': 'EX', '0:3': 'MEM', '0:4': 'WB' },
    ans: [
      ['IF', 'ID', 'EX', 'MEM', 'WB', ''],
      ['', 'IF', 'ID', 'STALL', 'EX', 'MEM'],
    ],
    sol: '1 load-use stall',
  };
  const s = pipelineInit(u);
  subAct(u, s, 'brush', 'IF');
  subAct(u, s, 'cell', '1:1');
  subAct(u, s, 'brush', 'ID');
  subAct(u, s, 'cell', '1:2');
  subAct(u, s, 'brush', 'STALL');
  subAct(u, s, 'cell', '1:3');
  subAct(u, s, 'brush', 'EX');
  subAct(u, s, 'cell', '1:4');
  subAct(u, s, 'brush', 'MEM');
  subAct(u, s, 'cell', '1:5');
  assert.equal(pipelineFrac(u, s), 1);
  assert.ok(pipelineWidget(u, '0.0', s).includes('pipetab'));
});

test('cloze engine accepts case-insensitive synonyms and Frenglish fixes', () => {
  const u = {
    kind: 'cloze',
    pts: 10,
    mode: 'fix',
    blanks: [
      { before: 'I live here', bad: 'since 3 years', ans: ['for 3 years', 'for three years'] },
      { before: 'Looking forward', bad: 'to meet', ans: ['to meeting'] },
    ],
    sol: 'for 3 years / to meeting',
  };
  const s = clozeInit(u);
  subInput(u, s, '0', '  For Three Years ');
  subInput(u, s, '1', 'to meeting');
  assert.equal(clozeFrac(u, s), 1);
  assert.ok(clozeWidget(u, '0.0', s).includes('cloze-bad'));
});

test('sanitizeIngestionResponse normalizes generated modules to 20 pts and detects interfaces', () => {
  const plan = sanitizeIngestionResponse(
    {
      subject_key: 'a',
      confidence: 0.96,
      reasoning: 'Contient un filtre passe-bas RC et un tracé de Bode.',
      doc_type: 'td',
      detected_topics: ['c1'],
      action_summary: 'Créé un atelier Bode interactif et 2 questions rapides.',
      ds_module: {
        operation: 'create',
        module_type: 'theme',
        chap: 'c1',
        title: 'TD Filtres RC',
        sub: 'Bode asymptotique',
        dur: 20,
        ex: [
          {
            topic: 'Bode',
            title: 'Filtre RC',
            pts: 10,
            subs: [
              {
                pts: 5,
                kind: 'bode',
                circuit: 'rc_lp',
                ref: { gain0: 0, slopeLeft: 0, slopeRight: -20, fcDec: 2 },
                q: 'Trace le diagramme de Bode.',
                sol: 'fc = 1 kHz',
              },
              {
                pts: 5,
                q: 'Pente après fc ?',
                opts: ['0', '-20 dB/déc', '-40 dB/déc'],
                ans: 1,
                sol: '1er ordre = -20 dB/déc',
              },
            ],
          },
        ],
      },
      quiz_questions: [
        {
          topic: 'c1',
          concept: 'Coupure RC',
          ask: 'Formule de fc ?',
          opts: ['1/(2πRC)', 'RC'],
          ans: 0,
          why: 'Définition',
        },
      ],
      memo_update: {
        operation: 'enrich',
        target_id: 'c1',
        title: 'Réseaux & Bode',
        pts: ['<b>Coupure</b> : f_c = 1/(2πRC)'],
      },
    },
    {
      filename: 'TD2_Filtres_RC.pdf',
      mimeType: 'application/pdf',
      fileSize: 120000,
      mode: 'binary',
      summaryInfo: 'PDF multimodal',
    }
  );

  assert.equal(plan.subject_key, 'a');
  assert.equal(plan.modules.length, 3);
  const dsMod = plan.modules.find((m) => m.module_type === 'theme')!;
  const totalPts = dsMod.payload.ex.reduce(
    (acc: number, ex: { pts: number }) => acc + ex.pts,
    0
  );
  assert.equal(totalPts, 20);
  assert.ok(plan.interfaces_used.includes('bode'));
  assert.ok(plan.interfaces_used.includes('quiz'));
  assert.ok(plan.interfaces_used.includes('memo'));
});
