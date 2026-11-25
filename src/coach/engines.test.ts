import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  asmEval,
  chronoExp,
  chronoFrac,
  chronoInit,
  circFrac,
  circInit,
  cmdEval,
  detN,
  eqn,
  fsmFrac,
  fsmRefState,
  globEval,
  hl,
  matMul,
  pn,
  rvAssemble,
  rvMachine,
  rvRun,
  tfmt,
  xEval,
  xParse,
} from './engines';

test('numeric, fraction, and matrix helpers behave accurately', () => {
  assert.equal(pn('−3/4'), -0.75);
  assert.equal(pn('1,5'), 1.5);
  assert.equal(pn('1/0'), null);
  assert.equal(eqn(pn('2/3'), 2 / 3), true);
  assert.equal(tfmt(-0.5), '−1/2');
  assert.deepEqual(
    matMul(
      [
        [1, 2],
        [3, 4],
      ],
      [
        [2, 0],
        [1, 2],
      ]
    ),
    [
      [4, 4],
      [10, 8],
    ]
  );
  assert.ok(Math.abs(detN([[2, 1], [5, 3]]) - 1) < 1e-9);
});

test('C syntax highlighter escapes HTML and tags keywords, numbers, comments', () => {
  const out = hl('int x = 42; // a < b');
  assert.ok(out.includes('<span class="k">int</span>'));
  assert.ok(out.includes('<span class="n">42</span>'));
  assert.ok(out.includes('&lt;'));
  assert.ok(out.includes('<span class="c">// a &lt; b</span>'));
});

test('boolean expression parser evaluates AND, OR, XOR, NOT accurately', () => {
  const parsed = xParse("a.b' + c^d");
  assert.equal(parsed.err, undefined);
  assert.equal(xEval(parsed.ast, { a: 1, b: 0, c: 0, d: 0 }), 1);
  assert.equal(xEval(parsed.ast, { a: 1, b: 1, c: 1, d: 1 }), 0);
  assert.equal(xEval(parsed.ast, { a: 0, b: 1, c: 1, d: 0 }), 1);
});

test('RISC-V assembler and VM execute loops and memory operations', () => {
  const src = `
    addi x10, x0, 0
    addi x11, x0, 1
  loop:
    add x10, x10, x11
    addi x11, x11, 1
    addi x12, x0, 6
    blt x11, x12, loop
  `;
  const prog = rvAssemble(src);
  assert.ok(!prog.err, String(prog.err));
  const M = rvMachine(prog);
  const res = rvRun(prog, M);
  assert.ok(!res.err, String(res.err));
  assert.equal(M.r[10], 15);

  const evalRes = asmEval(
    {
      tests: [{ name: 'sum 1..5', regs: {}, exp: { regs: { x10: 15 } } }],
    },
    src
  );
  assert.equal(evalRes.passed, 1);
  assert.equal(evalRes.n, 1);
});

test('Shell command and glob evaluator validate expected commands', () => {
  const matched = globEval('ls *.c', {
    files: ['main.c', 'util.c', 'readme.md'],
    dir: '.',
    want: ['main.c', 'util.c'],
  });
  assert.deepEqual(matched, ['main.c', 'util.c']);

  const r = cmdEval(
    { checks: [{ re: '^chmod\\s+(?:u\\+x|755)\\s+script\\.sh$', msg: 'chmod u+x' }] },
    'chmod u+x script.sh'
  );
  assert.equal(r.empty, false);
  assert.equal(r.frac, 1);
});

test('FSM, Circuit, and Chronogramme engines score reference states correctly', () => {
  const dsPath = path.resolve(import.meta.dirname, '../../public/coach-data/ds.json');
  const ds: any[] = JSON.parse(fs.readFileSync(dsPath, 'utf8'));

  let fsmEx: any = null;
  let circEx: any = null;
  let chronoEx: any = null;
  for (const exam of ds) {
    if (exam.s !== 'e') continue;
    for (const ex of exam.ex || []) {
      for (const u of ex.subs || []) {
        if (!fsmEx && u.kind === 'fsm') fsmEx = u;
        if (!circEx && u.kind === 'circ') circEx = u;
        if (!chronoEx && u.kind === 'chrono') chronoEx = u;
      }
    }
  }
  assert.ok(fsmEx, 'Expected an FSM exercise in ds.json');
  assert.ok(circEx, 'Expected a Circuit exercise in ds.json');
  assert.ok(chronoEx, 'Expected a Chronogramme exercise in ds.json');

  const refFsm = fsmRefState(fsmEx);
  assert.equal(fsmFrac(fsmEx, refFsm), 1);

  const emptyCirc = circInit(circEx);
  const cf = circFrac(circEx, emptyCirc);
  assert.ok(cf >= 0 && cf <= 1);

  const chronoState = chronoInit(chronoEx);
  const expected = chronoExp(chronoEx);
  for (const name of Object.keys(expected)) {
    chronoState.v[name] = expected[name].slice();
  }
  assert.equal(chronoFrac(chronoEx, chronoState), 1);
});

test('All 8 ESET 3A subject datasets exist and are structurally valid', () => {
  const dataDir = path.resolve(import.meta.dirname, '../../public/coach-data');
  const ds: any[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'ds.json'), 'utf8'));
  const allq = JSON.parse(fs.readFileSync(path.join(dataDir, 'allq.json'), 'utf8'));
  const memo = JSON.parse(fs.readFileSync(path.join(dataDir, 'memo.json'), 'utf8'));
  const annales = JSON.parse(fs.readFileSync(path.join(dataDir, 'annales.json'), 'utf8'));
  const thm = JSON.parse(fs.readFileSync(path.join(dataDir, 'thm.json'), 'utf8'));

  // All 8 subjects have memos
  for (const k of ['c', 'm', 'e', 'p', 't', 'a', 'r', 'g']) {
    assert.ok(Array.isArray(memo[k]) && memo[k].length >= 4, `Memo missing for ${k}`);
  }
  // DS datasets for all non-C subjects
  for (const k of ['m', 'e', 'p', 't', 'a', 'r', 'g']) {
    const entries = ds.filter((d) => d.s === k);
    assert.ok(entries.length >= 6, `DS missing for ${k} (found ${entries.length})`);
  }
  // Quiz datasets for C, ELEN, TTSD, Analog, Archi, Anglais
  assert.ok(Array.isArray(allq), 'allq.json must be an array');
  for (const k of ['c', 'e', 't', 'a', 'r', 'g']) {
    const qs = allq.filter((q: any) => q.s === k);
    assert.ok(qs.length >= 16, `Quiz missing for ${k} (found ${qs.length})`);
  }
  // Annales include 3 ELEN + 2 TTSD
  assert.equal(annales.length, 5);
  assert.equal(annales.filter((a: any) => a.s === 'e').length, 3);
  assert.equal(annales.filter((a: any) => a.s === 't').length, 2);
  // Maths Gauss-Jordan themes
  assert.ok(Array.isArray(thm) && thm.some((x: any) => x.id === 'inv') && thm.some((x: any) => x.id === 'rk'));
});
