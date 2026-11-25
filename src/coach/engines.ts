/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Core pure & interactive engines from Coach Partiels:
 * - C syntax highlighting & numeric/fraction parsing
 * - Linear algebra helpers (matrix multiplication, determinant)
 * - Boolean expression parser & evaluator
 * - Interactive SVG editors & verifiers: FSM (Moore/Mealy), Logic Circuit, Chronogramme
 * - RISC-V 32-bit Assembler & Simulator
 * - Shell / Makefile command & globbing evaluator
 */

export const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const pct = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);

export const norm = (t: unknown): string =>
  String(t ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.');

export function toNum(t: unknown): number {
  const s = norm(t).replace(/−/g, '-');
  const m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (m) return +m[1] / +m[2];
  return /^-?\d+(?:\.\d+)?$/.test(s) ? +s : NaN;
}

export function pn(str: unknown): number | null {
  if (str == null) return null;
  const t = String(str)
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
  if (t === '') return null;
  const m = t.match(/^([+-]?\d+(?:\.\d+)?)(?:\/([+-]?\d+(?:\.\d+)?))?$/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  if (m[2] !== undefined) {
    const b = parseFloat(m[2]);
    if (!b) return null;
    return a / b;
  }
  return a;
}

export function eqn(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 1e-6;
}

export function fpt(x: number): string {
  return String(x).replace('.', ',');
}

export function tfmt(x: number | null | undefined): string {
  if (x === null || x === undefined || isNaN(x)) return '?';
  for (let d = 1; d <= 720; d++) {
    const v = x * d;
    if (Math.abs(v - Math.round(v)) < 1e-9) {
      const p = Math.round(v);
      return d === 1 ? String(p).replace('-', '−') : String(p).replace('-', '−') + '/' + d;
    }
  }
  return String(Math.round(x * 1000) / 1000);
}

export function shuffle<T>(a: T[]): T[] {
  const copy = a.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function matMul(A: number[][], B: number[][]): number[][] {
  return A.map((r) =>
    B[0].map((_, j) => {
      let t = 0;
      for (let x = 0; x < B.length; x++) t += r[x] * B[x][j];
      return t;
    })
  );
}

export function detN(M: number[][]): number {
  const n = M.length;
  const A = M.map((r) => r.slice());
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) return 0;
    if (p !== c) {
      const t = A[p];
      A[p] = A[c];
      A[c] = t;
      d = -d;
    }
    d *= A[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let x = c; x < n; x++) A[r][x] -= f * A[c][x];
    }
  }
  return d;
}

export function allNum(M: Array<Array<number | null>>): M is number[][] {
  return M.every((r) => r.every((x) => x !== null));
}

export function hl(code: string): string {
  const re =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#\w+)|\b(int|char|void|struct|typedef|enum|return|for|if|else|switch|case|break|default|while|sizeof|NULL|double|float)\b|\b(\d+)\b/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'p' : m[4] ? 'k' : 'n';
    out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}

export function augTable(rows: Array<Array<number | null>>, m: number, aug: boolean): string {
  let h = '<table class="mx">';
  rows.forEach((r) => {
    h +=
      '<tr>' +
      r
        .map(
          (x, j) =>
            '<td' + (aug && j === m ? ' style="border-left:1px solid currentColor"' : '') + '>' + tfmt(x) + '</td>'
        )
        .join('') +
      '</tr>';
  });
  return h + '</table>';
}

/* ---------- expressions logiques saisies par l'élève ---------- */
export function edBtn(k: string, act: string, arg: string | null, label: string, cls = '', extra = ''): string {
  return (
    '<button type="button" class="edb' +
    (cls ? ' ' + cls : '') +
    '" data-ed="' +
    k +
    '|' +
    act +
    '|' +
    (arg == null ? '' : arg) +
    '"' +
    extra +
    '>' +
    label +
    '</button>'
  );
}

export function lcs(a?: string[]): string[] {
  return (a || []).map((x) => String(x).toLowerCase());
}

export function lowOrig(a?: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  (a || []).forEach((x) => {
    m[String(x).toLowerCase()] = x;
  });
  return m;
}

const _xc: Record<string, any> = {};

export function xParse(src: unknown): any {
  const s = String(src || '').trim();
  if (s in _xc) return _xc[s];
  let r: any;
  try {
    r = xParse0(s);
  } catch (e: any) {
    r = { err: String(e?.message || e) };
  }
  return (_xc[s] = r);
}

function xParse0(src: string): any {
  if (src === '') return { ast: { o: 'c', v: 1 }, vars: [], empty: true };
  const toks: Array<{ t: string; v?: any }> = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const m = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/.exec(src.slice(i));
    if (m) {
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (c === '0' || c === '1') {
      toks.push({ t: 'c', v: +c });
      i++;
      continue;
    }
    if ('+|∨'.indexOf(c) >= 0) {
      toks.push({ t: '+' });
      i++;
      continue;
    }
    if ('.*&·∧'.indexOf(c) >= 0) {
      toks.push({ t: '.' });
      i++;
      continue;
    }
    if ('^⊕'.indexOf(c) >= 0) {
      toks.push({ t: '^' });
      i++;
      continue;
    }
    if ('/!~¬'.indexOf(c) >= 0) {
      toks.push({ t: '!' });
      i++;
      continue;
    }
    if (c === "'" || c === '’') {
      toks.push({ t: "'" });
      i++;
      continue;
    }
    if (c === '(' || c === ')') {
      toks.push({ t: c });
      i++;
      continue;
    }
    throw new Error('caractère « ' + c + ' » non reconnu');
  }
  let p = 0;
  const vars: string[] = [];
  const peek = () => toks[p];
  const starts = (t: any) => t && (t.t === 'id' || t.t === 'c' || t.t === '(' || t.t === '!');
  function pOr(): any {
    const l = [pXor()];
    while (peek() && peek().t === '+') {
      p++;
      l.push(pXor());
    }
    return l.length > 1 ? { o: 'o', l } : l[0];
  }
  function pXor(): any {
    const l = [pAnd()];
    while (peek() && peek().t === '^') {
      p++;
      l.push(pAnd());
    }
    return l.length > 1 ? { o: 'x', l } : l[0];
  }
  function pAnd(): any {
    const l = [pNot()];
    for (;;) {
      const t = peek();
      if (t && t.t === '.') {
        p++;
        l.push(pNot());
      } else if (starts(t)) l.push(pNot());
      else break;
    }
    return l.length > 1 ? { o: 'a', l } : l[0];
  }
  function pNot(): any {
    const t = peek();
    if (!t) throw new Error('expression incomplète');
    if (t.t === '!') {
      p++;
      return { o: 'n', a: pNot() };
    }
    let a = pAtom();
    while (peek() && peek().t === "'") {
      p++;
      a = { o: 'n', a };
    }
    return a;
  }
  function pAtom(): any {
    const t = toks[p++];
    if (!t) throw new Error('expression incomplète');
    if (t.t === 'id') {
      vars.push(t.v);
      return { o: 'v', n: t.v };
    }
    if (t.t === 'c') return { o: 'c', v: t.v };
    if (t.t === '(') {
      const e = pOr();
      if (!peek() || peek().t !== ')') throw new Error('parenthèse « ) » manquante');
      p++;
      return e;
    }
    throw new Error('symbole inattendu');
  }
  const ast = pOr();
  if (p < toks.length) throw new Error('expression incomplète ou parenthèse en trop');
  return { ast, vars };
}

export function xEval(a: any, env: Record<string, number>): number {
  switch (a.o) {
    case 'c':
      return a.v;
    case 'v':
      return env[a.n.toLowerCase()] ? 1 : 0;
    case 'n':
      return xEval(a.a, env) ? 0 : 1;
    case 'a':
      return a.l.every((x: any) => xEval(x, env)) ? 1 : 0;
    case 'o':
      return a.l.some((x: any) => xEval(x, env)) ? 1 : 0;
    case 'x':
      return a.l.reduce((t: number, x: any) => t ^ xEval(x, env), 0);
  }
  return 0;
}

export function outParse(str: unknown, names?: string[]): { key: string; unk: string[] } {
  const known = lcs(names);
  const toks = String(str || '')
    .toLowerCase()
    .split(/[\s,;+·.*&]+/)
    .filter(Boolean);
  const set: Record<string, number> = {};
  const unk: string[] = [];
  toks.forEach((t) => {
    if (known.indexOf(t) >= 0) set[t] = 1;
    else unk.push(t);
  });
  return { key: Object.keys(set).sort().join(','), unk };
}

export function descVec(env: Record<string, number>, inputs: string[]): string {
  const on = inputs.filter((n) => env[String(n).toLowerCase()]);
  return on.length ? on.join('+') : 'aucune entrée active';
}

export function descOut(key: string, outs: string[]): string {
  if (!key) return 'aucune sortie';
  const m = lowOrig(outs);
  return key
    .split(',')
    .map((x) => m[x] || x)
    .join(' ');
}

/* ---------- ÉDITEUR DE GRAPHE D'ÉTATS (FSM) ---------- */
export const FR = 28;

export function fsmInit(u: any): any {
  const s: any = { st: [], tr: [], sel: null, mode: 'sel', src: null, nid: 1 };
  const P = u.pre;
  if (P) {
    const m: Record<string, string> = {};
    P.st.forEach((a: any) => {
      const id = 's' + s.nid++;
      m[a.name] = id;
      s.st.push({ id, name: a.name, out: a.out || '', init: !!a.init, x: a.x, y: a.y });
    });
    (P.tr || []).forEach((t: any) => {
      s.tr.push({ id: 't' + s.nid++, from: m[t.from], to: m[t.to], cond: t.cond || '', out: t.out || '' });
    });
  }
  return s;
}

export function fsmRefState(u: any): any {
  const R = u.ref;
  const s: any = { st: [], tr: [], sel: null };
  const n = R.st.length;
  R.st.forEach((a: any, i: number) => {
    let x = a.x;
    let y = a.y;
    if (x == null) {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      x = 300 + 210 * Math.cos(ang);
      y = (u.h || 360) / 2 + (u.h || 360) * 0.32 * Math.sin(ang);
    }
    s.st.push({ id: a.name, name: a.name, out: a.out || '', init: !!a.init, x, y });
  });
  R.tr.forEach((t: any, i: number) => {
    s.tr.push({ id: 'r' + i, from: t.from, to: t.to, cond: t.cond || '', out: t.out || '' });
  });
  return s;
}

function fsmGeom(s: any): any[] {
  const by: Record<string, any> = {};
  const groups: Record<string, any[]> = {};
  s.st.forEach((a: any) => {
    by[a.id] = a;
  });
  s.tr.forEach((t: any) => {
    const key = t.from === t.to ? 'L' + t.from : 'E' + t.from + '>' + t.to;
    (groups[key] = groups[key] || []).push(t);
  });
  const res: any[] = [];
  s.tr.forEach((t: any) => {
    const A = by[t.from];
    const B = by[t.to];
    if (!A || !B) return;
    const g: any = { t };
    if (A === B) {
      const idx = groups['L' + t.from].indexOf(t);
      const up = A.y > 100;
      const sg = up ? -1 : 1;
      const h = 46 + idx * 28;
      const x = A.x;
      const y = A.y;
      g.d =
        'M' +
        (x - FR * 0.62) +
        ' ' +
        (y + sg * FR * 0.78) +
        ' C' +
        (x - FR * 1.6) +
        ' ' +
        (y + sg * (FR + h)) +
        ' ' +
        (x + FR * 1.6) +
        ' ' +
        (y + sg * (FR + h)) +
        ' ' +
        (x + FR * 0.62) +
        ' ' +
        (y + sg * FR * 0.78);
      g.lx = x;
      g.ly = y + sg * (FR + h * 0.76) + (up ? -3 : 11);
    } else {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      const nx = -uy;
      const ny = ux;
      const rev = groups['E' + t.to + '>' + t.from];
      const same = groups['E' + t.from + '>' + t.to];
      const idx = same.indexOf(t);
      let off = rev ? 34 + idx * 30 : same.length > 1 ? (idx - (same.length - 1) / 2) * 36 : 0;
      if (off === 0) {
        let blk: number | null = null;
        s.st.forEach((C: any) => {
          if (C === A || C === B) return;
          const tt = ((C.x - A.x) * dx + (C.y - A.y) * dy) / (L * L);
          if (tt <= 0.05 || tt >= 0.95) return;
          const px = A.x + tt * dx;
          const py = A.y + tt * dy;
          const d = Math.hypot(C.x - px, C.y - py);
          if (d < FR + 12) blk = (C.x - px) * nx + (C.y - py) * ny >= 0 ? 1 : -1;
        });
        if (blk) off = -blk * 48;
      }
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const cx = mx + nx * 2 * off;
      const cy = my + ny * 2 * off;
      const l1 = Math.hypot(cx - A.x, cy - A.y) || 1;
      const l2 = Math.hypot(cx - B.x, cy - B.y) || 1;
      const sx = A.x + ((cx - A.x) / l1) * FR;
      const sy = A.y + ((cy - A.y) / l1) * FR;
      const ex = B.x + ((cx - B.x) / l2) * (FR + 4);
      const ey = B.y + ((cy - B.y) / l2) * (FR + 4);
      g.d = 'M' + sx + ' ' + sy + ' Q' + cx + ' ' + cy + ' ' + ex + ' ' + ey;
      const px = 0.25 * sx + 0.5 * cx + 0.25 * ex;
      const py = 0.25 * sy + 0.5 * cy + 0.25 * ey;
      const sgn = off === 0 ? -1 : off > 0 ? 1 : -1;
      g.lx = px + nx * sgn * 13;
      g.ly = py + ny * sgn * 13 + 4;
    }
    res.push(g);
  });
  return res;
}

function fsmLabel(t: any, u: any): { txt: string; bad: boolean } {
  const ins = u.inputs || [];
  const c = xParse(t.cond);
  let txt = (t.cond || '').trim() || '1';
  if (u.mode === 'mealy') {
    const o = (t.out || '').trim();
    txt += ' / ' + (o || '–');
  }
  const bad =
    !!c.err ||
    (c.vars || []).some((v: string) => lcs(ins).indexOf(v.toLowerCase()) < 0) ||
    outParse(t.out, u.outputs).unk.length > 0;
  return { txt, bad };
}

export function fsmInner(u: any, s: any, k: string, o: any): string {
  const ro = !!o.ro;
  const tag = (o.tag || '') + k;
  let h =
    '<defs>' +
    [
      ['n', 'currentColor'],
      ['s', 'var(--accent)'],
      ['b', 'var(--bad)'],
      ['g', 'var(--good)'],
    ]
      .map(
        (m) =>
          '<marker id="ma' +
          m[0] +
          '-' +
          tag +
          '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' +
          m[1] +
          '"/></marker>'
      )
      .join('') +
    '</defs>';
  const geo = fsmGeom(s);
  geo.forEach((g) => {
    const t = g.t;
    const sel = !ro && s.sel && s.sel.t === 't' && s.sel.id === t.id;
    const lab = fsmLabel(t, u);
    const col = o.col || (sel ? 'var(--accent)' : lab.bad && !ro ? 'var(--bad)' : 'currentColor');
    const mk = o.col ? (o.col === 'var(--good)' ? 'g' : 'n') : sel ? 's' : lab.bad && !ro ? 'b' : 'n';
    const w = lab.txt.length * 6.4 + 10;
    h +=
      '<g class="edtr" data-tid="' +
      t.id +
      '"><path d="' +
      g.d +
      '" fill="none" stroke="transparent" stroke-width="16"/><path d="' +
      g.d +
      '" fill="none" stroke="' +
      col +
      '" stroke-width="' +
      (sel ? 2.6 : 1.7) +
      '" marker-end="url(#ma' +
      mk +
      '-' +
      tag +
      ')"' +
      (o.dash ? ' stroke-dasharray="5 4"' : '') +
      '/>' +
      '<rect x="' +
      (g.lx - w / 2) +
      '" y="' +
      (g.ly - 12) +
      '" width="' +
      w +
      '" height="17" rx="5" fill="var(--surface)" stroke="' +
      (sel ? 'var(--accent)' : 'none') +
      '" opacity=".92"/><text x="' +
      g.lx +
      '" y="' +
      g.ly +
      '" text-anchor="middle" class="edlab" fill="' +
      (lab.bad && !ro ? 'var(--bad)' : 'currentColor') +
      '">' +
      esc(lab.txt) +
      '</text></g>';
  });
  s.st.forEach((a: any) => {
    const sel = !ro && s.sel && s.sel.t === 's' && s.sel.id === a.id;
    const src = !ro && s.src === a.id;
    const col = sel || src ? 'var(--accent)' : 'currentColor';
    const outs = u.mode === 'mealy' ? '' : (a.out || '').trim();
    const ou = outParse(a.out, u.outputs);
    h +=
      '<g class="edst" data-sid="' +
      a.id +
      '" transform="translate(' +
      a.x +
      ' ' +
      a.y +
      ')"><circle r="' +
      FR +
      '" fill="var(--surface)" stroke="' +
      col +
      '" stroke-width="' +
      (sel || src ? 3 : 1.9) +
      '"/>' +
      (a.init ? '<circle r="' + (FR - 5) + '" fill="none" stroke="' + col + '" stroke-width="1.4"/>' : '') +
      '<text y="' +
      (outs ? -3 : 5) +
      '" text-anchor="middle" class="edname">' +
      esc(a.name || '?') +
      '</text>' +
      (outs
        ? '<text y="12" text-anchor="middle" class="edout' +
          (ou.unk.length && !ro ? ' bad' : '') +
          '" font-size="' +
          (outs.length > 9 ? 8.5 : 10.5) +
          '">' +
          esc(outs.toUpperCase().length > 14 ? outs.toUpperCase().slice(0, 13) + '…' : outs.toUpperCase()) +
          '</text>'
        : '') +
      '</g>';
  });
  return h;
}

export function fsmSvg(u: any, s: any, k: string, o: any = {}): string {
  return (
    '<svg class="edsvg" style="min-width:600px" id="' +
    (o.id || 'edsvg-' + k) +
    '" data-edk="' +
    k +
    '" data-edkind="fsm"' +
    (o.ro ? ' data-ro="1"' : '') +
    ' viewBox="0 0 600 ' +
    (u.h || 360) +
    '" role="img" aria-label="Graphe d\'états">' +
    fsmInner(u, s, k, o) +
    '</svg>'
  );
}

export function fsmFree(u: any, s: any): { x: number; y: number } {
  const H = u.h || 360;
  for (let i = 0; i < 40; i++) {
    const x = 80 + (i % 4) * 145;
    const y = 70 + Math.floor(i / 4) * 105;
    if (y > H - 50) break;
    if (!s.st.some((a: any) => Math.hypot(a.x - x, a.y - y) < 60)) return { x, y };
  }
  return { x: 60 + Math.random() * 480, y: 50 + Math.random() * (H - 100) };
}

function fsmPanel(u: any, k: string, s: any): string {
  const sel = s.sel;
  let h = '';
  if (s.mode === 'trans')
    return (
      '<p class="edmsg">' +
      (s.src
        ? "Touche maintenant l'état d'<b>arrivée</b> (le même état crée une boucle)."
        : "Touche l'état de <b>départ</b> de la transition.") +
      '</p>'
    );
  if (!sel) return '<p class="edmsg dim">Touche un état ou une flèche pour la modifier.</p>';
  if (sel.t === 's') {
    const a = s.st.find((x: any) => x.id === sel.id);
    if (!a) return '';
    h +=
      '<div class="edrow"><label>Nom<input type="text" maxlength="10" autocomplete="off" spellcheck="false" data-edi="' +
      k +
      '|name" value="' +
      esc(a.name) +
      '"></label>';
    if (u.mode !== 'mealy')
      h +=
        '<label>Sorties actives<input type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : ' +
        esc((u.outputs || []).slice(0, 2).join(' ')) +
        '" data-edi="' +
        k +
        '|sout" value="' +
        esc(a.out) +
        '"></label>';
    h +=
      '</div><div class="edrow">' +
      edBtn(k, 'init', a.id, a.init ? 'État initial ✓' : 'Définir comme état initial', a.init ? 'on' : '') +
      edBtn(k, 'del', '', "Supprimer l'état", 'danger') +
      '</div>';
    return h;
  }
  const t = s.tr.find((x: any) => x.id === sel.id);
  if (!t) return '';
  const A = s.st.find((x: any) => x.id === t.from);
  const B = s.st.find((x: any) => x.id === t.to);
  h +=
    '<p class="edmsg">Transition <b>' +
    esc(A ? A.name : '?') +
    ' → ' +
    esc(B ? B.name : '?') +
    '</b></p><div class="edrow"><label>Condition<input type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : ' +
    esc((u.inputs || ['x'])[0]) +
    '" data-edi="' +
    k +
    '|cond" value="' +
    esc(t.cond) +
    '"></label>';
  if (u.mode === 'mealy')
    h +=
      '<label>Sorties actives<input type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : ' +
      esc((u.outputs || []).slice(0, 2).join(' ')) +
      '" data-edi="' +
      k +
      '|tout" value="' +
      esc(t.out) +
      '"></label>';
  h += '</div><div class="edrow">' + edBtn(k, 'del', '', 'Supprimer la transition', 'danger') + '</div>';
  return h;
}

export function fsmWidget(u: any, k: string, s: any): string {
  let h =
    '<div class="edtb">' +
    edBtn(k, 'addst', '', '+ État') +
    edBtn(k, 'addtr', '', '+ Transition', s.mode === 'trans' ? 'on' : '') +
    edBtn(k, 'clear', '', 'Tout effacer', 'ghost') +
    '</div>';
  h += '<div class="edpn" id="edpn-' + k + '">' + fsmPanel(u, k, s) + '</div><div class="edcv">' + fsmSvg(u, s, k) + '</div>';
  h +=
    '<details class="edhd"><summary class="fine">Aide : comment écrire les conditions</summary><p class="fine edhint">Condition d\'une transition : noms des entrées (' +
    esc((u.inputs || []).join(', ')) +
    '), <b>+</b> pour OU, <b>·</b> <b>*</b> ou espace pour ET, <b>/</b> devant un nom pour NON, <b>1</b> = toujours. ' +
    (u.mode === 'mealy'
      ? 'Après la condition, écris les sorties actives (' + esc((u.outputs || []).join(', ')) + ').'
      : 'Sorties actives dans un état : ' + esc((u.outputs || []).join(', ')) + '.') +
    " Glisse un état pour le déplacer (ou touche-le puis touche l'endroit où le poser). Sur téléphone, fais défiler le cadre horizontalement si besoin.</p></details>";
  return h;
}

export function fsmModel(s: any, u: any): any {
  const M: any = { st: {}, init: null, tr: [], nst: s.st.length, ninit: 0 };
  s.st.forEach((a: any) => {
    M.st[a.id] = { id: a.id, name: a.name, out: outParse(a.out, u.outputs).key };
    if (a.init) {
      M.ninit++;
      if (!M.init) M.init = a.id;
    }
  });
  s.tr.forEach((t: any) => {
    const c = xParse(t.cond);
    M.tr.push({ from: t.from, to: t.to, ast: c.err ? null : c.ast, out: outParse(t.out, u.outputs).key });
  });
  return M;
}

export function fsmStep(M: any, st: string, env: Record<string, number>): any[] {
  const m: any[] = [];
  M.tr.forEach((t: any) => {
    if (t.from === st && t.ast && M.st[t.to] && xEval(t.ast, env)) m.push(t);
  });
  return m;
}

export function fsmCheck(s: any, u: any): any {
  const M = fsmModel(s, u);
  const R = fsmModel(fsmRefState(u), u);
  const ins = lcs(u.inputs);
  const n = ins.length;
  const vecs: Array<Record<string, number>> = [];
  for (let v = 0; v < 1 << n; v++) {
    const env: Record<string, number> = {};
    ins.forEach((nm, i) => {
      env[nm] = (v >> (n - 1 - i)) & 1;
    });
    if (
      u.excl &&
      u.excl.some((x: string) => {
        const p = xParse(x);
        return p.ast && xEval(p.ast, env);
      })
    )
      continue;
    vecs.push(env);
  }
  const res: any = { ok: 0, tot: 0, empty: 0, conf: 0, miss: 0, first: null, pairs: 0, noinit: !M.init, nst: M.nst };
  if (!M.init) return res;
  const mealy = u.mode === 'mealy';
  const seen: Record<string, number> = {};
  const q: any[] = [{ s: M.init, r: R.init, path: [] }];
  seen[M.init + '|' + R.init] = 1;
  if (!mealy) {
    res.tot++;
    const ex = R.st[R.init].out;
    if (!ex) res.empty++;
    if (M.st[M.init].out === ex) res.ok++;
    else res.first = { path: [], exp: ex, got: M.st[M.init].out, init: true };
  }
  while (q.length && res.pairs < 3000) {
    const c = q.shift();
    res.pairs++;
    vecs.forEach((env) => {
      const ms = fsmStep(M, c.s, env);
      const rs = fsmStep(R, c.r, env);
      const rt = rs[0] || { to: c.r, out: '' };
      let st2 = c.s;
      let got = '';
      let bad = false;
      if (ms.length > 1) {
        res.conf++;
        bad = true;
        st2 = ms[0].to;
        got = ms[0].out;
      } else if (ms.length === 1) {
        st2 = ms[0].to;
        got = ms[0].out;
      } else {
        res.miss++;
      }
      const ge = mealy ? got : M.st[st2].out;
      const ex = mealy ? rt.out : R.st[rt.to].out;
      res.tot++;
      if (!ex) res.empty++;
      if (!bad && ge === ex) res.ok++;
      else if (!res.first) res.first = { path: c.path.concat([env]), exp: ex, got: ge, conf: bad };
      const key = st2 + '|' + rt.to;
      if (!seen[key]) {
        seen[key] = 1;
        q.push({ s: st2, r: rt.to, path: c.path.concat([env]) });
      }
    });
  }
  return res;
}

export function fsmFrac(u: any, s: any): number {
  const r = fsmCheck(s, u);
  if (r.noinit || !r.tot) return 0;
  if (r.ok === r.tot && !r.conf) return 1;
  const f = r.ok / r.tot;
  const base = r.empty / r.tot;
  return Math.max(0, Math.round(0.5 * Math.max(0, (f - base) / (1 - base + 1e-9)) * 100) / 100);
}

export function fsmCorr(u: any, k: string, s: any, h: string): string {
  const r = fsmCheck(s, u);
  const f = fsmFrac(u, s);
  const ref = fsmRefState(u);
  h += '<div class="edcv ro">' + fsmSvg(u, s, k, { ro: 1, tag: 'c', id: 'edsvgc-' + k }) + '</div>';
  let msg: string;
  if (!s.st.length) msg = "Tu n'as pas dessiné de graphe.";
  else if (r.noinit) msg = "Aucun état initial n'est défini : le graphe ne peut pas être vérifié.";
  else if (f === 1)
    msg =
      'Ton graphe se comporte exactement comme le graphe attendu : toutes les situations testées (entrées possibles dans chaque état) donnent les bonnes sorties.';
  else
    msg =
      'Ton graphe donne la bonne sortie dans ' +
      r.ok +
      ' situation' +
      (r.ok > 1 ? 's' : '') +
      ' sur ' +
      r.tot +
      ' testées.';
  h += '<p class="dsres">' + msg + ' · ' + fpt(Math.round(u.pts * f * 100) / 100) + ' / ' + fpt(u.pts) + ' pt</p>';
  const notes: string[] = [];
  if (r.conf)
    notes.push('Dans certains états, plusieurs transitions peuvent être actives en même temps pour une même entrée (ambiguïté).');
  if (r.miss && f === 1)
    notes.push("Il manque des transitions : l'automate reste alors dans son état. Le comportement est correct, mais écris-les à l'examen.");
  if (r.first && !r.noinit) {
    const f1 = r.first;
    notes.push(
      f1.init
        ? "Dans l'état initial, la sortie devrait être « " +
            descOut(f1.exp, u.outputs) +
            ' » ; ton graphe donne « ' +
            descOut(f1.got, u.outputs) +
            ' ».'
        : 'Premier écart : avec les entrées ' +
            f1.path.map((v: any) => descVec(v, u.inputs)).join(' puis ') +
            ', la sortie attendue est « ' +
            descOut(f1.exp, u.outputs) +
            ' » ; ton graphe donne « ' +
            descOut(f1.got, u.outputs) +
            ' »' +
            (f1.conf ? ' (transitions ambiguës)' : '') +
            '.'
    );
  }
  const bad: string[] = [];
  s.tr.forEach((t: any) => {
    const l = fsmLabel(t, u);
    if (l.bad) bad.push(t.cond || '(vide)');
  });
  if (bad.length)
    notes.push(
      'Condition(s) ou sortie(s) non reconnue(s) (en rouge) : ' +
        esc(bad.join(' ; ')) +
        ". Seuls les noms d'entrées et de sorties de l'énoncé sont acceptés."
    );
  if (notes.length) h += '<ul class="ednotes">' + notes.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  h +=
    '<details' +
    (f < 1 ? ' open' : '') +
    '><summary class="fine">Voir le graphe attendu</summary><div class="edcv ro">' +
    fsmSvg(u, ref, k, { ro: 1, tag: 'r', id: 'edsvgr-' + k, col: 'var(--good)' }) +
    '</div><p class="fine">Plusieurs graphes équivalents existent : seul le comportement compte (états en plus ou nommés autrement, c\'est possible).</p></details>';
  h += '<div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
  return h;
}

/* ---------- ÉDITEUR DE LOGIGRAMME (CIRCUIT) ---------- */
export const CGATE: Record<string, { l: string; f: (a: number[]) => number }> = {
  AND: { l: 'ET', f: (a) => (a.every(Boolean) ? 1 : 0) },
  OR: { l: 'OU', f: (a) => (a.some(Boolean) ? 1 : 0) },
  NOT: { l: 'NON', f: (a) => (a[0] ? 0 : 1) },
  NAND: { l: 'NON-ET', f: (a) => (a.every(Boolean) ? 0 : 1) },
  NOR: { l: 'NON-OU', f: (a) => (a.some(Boolean) ? 0 : 1) },
  XOR: { l: 'OU exclusif', f: (a) => a.reduce((t, x) => t ^ (x ? 1 : 0), 0) },
  XNOR: { l: 'NON-OU exclusif', f: (a) => 1 - a.reduce((t, x) => t ^ (x ? 1 : 0), 0) },
};

export const CPAL: Array<[string, string]> = [
  ['in', 'Entrée'],
  ['out', 'Sortie'],
  ['AND', 'ET'],
  ['OR', 'OU'],
  ['NOT', 'NON'],
  ['NAND', 'NON-ET'],
  ['NOR', 'NON-OU'],
  ['XOR', 'XOR'],
  ['XNOR', 'XNOR'],
  ['DFF', 'Bascule D'],
  ['JK', 'Bascule JK'],
  ['TFF', 'Bascule T'],
  ['C0', '0'],
  ['C1', '1'],
];

export function jkNext(q: number, j: number, k: number): number {
  return j && !k ? 1 : k && !j ? 0 : j && k ? 1 - q : q;
}

export function circBox(n: any): any {
  const t = n.t;
  if (t === 'in') return { w: 46, h: 26, ins: [], outs: [{ id: 'o', x: 52, y: 13 }] };
  if (t === 'out') return { w: 46, h: 26, ins: [{ id: 'i0', x: -6, y: 13 }], outs: [] };
  if (t === 'C0' || t === 'C1') return { w: 26, h: 26, ins: [], outs: [{ id: 'o', x: 32, y: 13 }] };
  if (t === 'DFF' || t === 'JK' || t === 'TFF') {
    const jk = t === 'JK';
    const h = jk ? 72 : 60;
    return {
      w: 60,
      h,
      ins: jk
        ? [
            { id: 'j', x: -6, y: 18, l: 'J' },
            { id: 'k', x: -6, y: 54, l: 'K' },
          ]
        : [{ id: t === 'DFF' ? 'd' : 't', x: -6, y: 18, l: t === 'DFF' ? 'D' : 'T' }],
      outs: [
        { id: 'q', x: 66, y: 18, l: 'Q' },
        { id: 'qn', x: 66, y: h - 18, l: 'Q̅' },
      ],
    };
  }
  const k = t === 'NOT' ? 1 : n.n || 2;
  const h = t === 'NOT' ? 36 : Math.max(44, 16 * k + 10);
  const bub = t === 'NAND' || t === 'NOR' || t === 'XNOR' || t === 'NOT';
  const w = t === 'NOT' ? 40 : 56;
  const ins: any[] = [];
  for (let i = 0; i < k; i++) ins.push({ id: 'i' + i, x: -6, y: (h * (i + 1)) / (k + 1) });
  return { w, h, bub, ins, outs: [{ id: 'o', x: w + (bub ? 9 : 0) + 6, y: h / 2 }] };
}

function circPin(n: any, pid: string): { x: number; y: number } | null {
  const b = circBox(n);
  const all = b.ins.concat(b.outs);
  for (let i = 0; i < all.length; i++) if (all[i].id === pid) return { x: n.x + all[i].x, y: n.y + all[i].y };
  return null;
}

export function circInit(u: any): any {
  const s: any = { nodes: [], wires: [], sel: null, arm: null, nid: 1 };
  const P = u.pre;
  if (P) {
    P.nodes.forEach((a: any) => {
      s.nodes.push({ id: a.id, t: a.t, x: a.x, y: a.y, name: a.name || '', n: a.n || 2 });
    });
    (P.wires || []).forEach((w: any, i: number) => {
      s.wires.push({ id: 'pw' + i, a: w[0], b: w[1] });
    });
  }
  return s;
}

function circNodeSvg(n: any, o: any, s: any): string {
  const b = circBox(n);
  const sel = !o.ro && s && s.sel && s.sel.t === 'n' && s.sel.id === n.id;
  const col = sel ? 'var(--accent)' : 'currentColor';
  const sw = sel ? 2.6 : 1.8;
  const t = n.t;
  const W = b.w;
  const H = b.h;
  let g =
    '<g class="ednode" data-nid="' +
    n.id +
    '" transform="translate(' +
    n.x +
    ' ' +
    n.y +
    ')"><title>' +
    esc((CGATE[t] && CGATE[t].l) || t) +
    '</title>';
  const st = 'fill="var(--surface)" stroke="' + col + '" stroke-width="' + sw + '"';
  if (t === 'in' || t === 'out' || t === 'C0' || t === 'C1') {
    g +=
      '<rect width="' +
      W +
      '" height="' +
      H +
      '" rx="' +
      (t === 'in' ? 13 : 5) +
      '" ' +
      st +
      '/><text x="' +
      W / 2 +
      '" y="17.5" text-anchor="middle" class="edname">' +
      esc(t === 'C0' ? '0' : t === 'C1' ? '1' : n.name || '?') +
      '</text>';
  } else if (t === 'DFF' || t === 'JK' || t === 'TFF') {
    g +=
      '<rect width="' +
      W +
      '" height="' +
      H +
      '" rx="4" ' +
      st +
      '/><text x="' +
      (W / 2 + 3) +
      '" y="' +
      (H / 2 + 5) +
      '" text-anchor="middle" class="edname">' +
      (t === 'DFF' ? 'D' : t === 'JK' ? 'JK' : 'T') +
      '</text><path d="M0 ' +
      (H - 17) +
      'L9 ' +
      (H - 11) +
      'L0 ' +
      (H - 5) +
      '" fill="none" stroke="' +
      col +
      '" stroke-width="1.4"/>';
  } else {
    const h = H;
    if (t === 'AND' || t === 'NAND') g += '<path d="M0 0H28A28 ' + h / 2 + ' 0 0 1 28 ' + h + 'H0Z" ' + st + '/>';
    else if (t === 'OR' || t === 'NOR' || t === 'XOR' || t === 'XNOR')
      g +=
        '<path d="M0 0Q32 0 56 ' +
        h / 2 +
        'Q32 ' +
        h +
        ' 0 ' +
        h +
        'Q15 ' +
        h / 2 +
        ' 0 0Z" ' +
        st +
        '/>' +
        (t === 'XOR' || t === 'XNOR'
          ? '<path d="M-7 0Q8 ' + h / 2 + ' -7 ' + h + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '"/>'
          : '');
    else g += '<path d="M0 0L' + W + ' ' + h / 2 + 'L0 ' + h + 'Z" ' + st + '/>';
    if (b.bub) g += '<circle cx="' + (W + 4.5) + '" cy="' + h / 2 + '" r="4.5" ' + st + '/>';
  }
  b.ins.concat(b.outs).forEach((p: any) => {
    const isOut = b.outs.indexOf(p) >= 0;
    const key = n.id + '.' + p.id;
    const on = s && s.arm && s.arm.pin === key;
    const tgt = s && s.arm && s.arm.dir !== (isOut ? 'o' : 'i');
    const x0 = isOut ? (p.x > W ? W + (b.bub ? 9 : 0) : W) : 0;
    g +=
      '<line x1="' +
      (isOut ? x0 : p.x) +
      '" y1="' +
      p.y +
      '" x2="' +
      (isOut ? p.x : 0) +
      '" y2="' +
      p.y +
      '" stroke="' +
      col +
      '" stroke-width="1.6"/>';
    if (p.l && (t === 'DFF' || t === 'JK' || t === 'TFF'))
      g +=
        '<text x="' +
        (isOut ? p.x - 9 : 5) +
        '" y="' +
        (p.y + 4) +
        '" text-anchor="' +
        (isOut ? 'end' : 'start') +
        '" class="edpl">' +
        p.l +
        '</text>';
    g +=
      '<g class="edpin' +
      (on ? ' on' : '') +
      (tgt && !o.ro ? ' tgt' : '') +
      '" data-pin="' +
      key +
      '" data-dir="' +
      (isOut ? 'o' : 'i') +
      '"><circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="12" fill="transparent"/><circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="4.2" class="edpd"/></g>';
  });
  return g + '</g>';
}

function circRoute(a: { x: number; y: number }, b: { x: number; y: number }, w: number): string {
  const dx = b.x - a.x;
  const j = (((w || 0) % 5) - 2) * 3.5;
  if (dx >= 26) {
    const mx = a.x + dx / 2 + j;
    return 'M' + a.x + ' ' + a.y + 'H' + mx + 'V' + b.y + 'H' + b.x;
  }
  const yb = Math.max(a.y, b.y) + 44 + ((w || 0) % 4) * 6;
  return 'M' + a.x + ' ' + a.y + 'H' + (a.x + 14) + 'V' + yb + 'H' + (b.x - 14) + 'V' + b.y + 'H' + b.x;
}

export function circInner(_u: any, s: any, _k: string, o: any): string {
  const by: Record<string, any> = {};
  s.nodes.forEach((n: any) => {
    by[n.id] = n;
  });
  let h = '';
  s.wires.forEach((w: any, i: number) => {
    const A = by[w.a.split('.')[0]];
    const B = by[w.b.split('.')[0]];
    if (!A || !B) return;
    const pa = circPin(A, w.a.split('.')[1]);
    const pb = circPin(B, w.b.split('.')[1]);
    if (!pa || !pb) return;
    const sel = !o.ro && s.sel && s.sel.t === 'w' && s.sel.id === w.id;
    const d = circRoute(pa, pb, i);
    h +=
      '<g class="edwire" data-wid="' +
      w.id +
      '"><path d="' +
      d +
      '" fill="none" stroke="transparent" stroke-width="14"/><path d="' +
      d +
      '" fill="none" stroke="' +
      (sel ? 'var(--accent)' : 'currentColor') +
      '" stroke-width="' +
      (sel ? 2.8 : 1.6) +
      '" stroke-linejoin="round"/></g>';
  });
  s.nodes.forEach((n: any) => {
    h += circNodeSvg(n, o, s);
  });
  return h;
}

export function circSvg(u: any, s: any, k: string, o: any = {}): string {
  return (
    '<svg class="edsvg" style="min-width:' +
    (o.w || u.w || 640) +
    'px" id="' +
    (o.id || 'edsvg-' + k) +
    '" data-edk="' +
    k +
    '" data-edkind="circ"' +
    (o.ro ? ' data-ro="1"' : '') +
    ' viewBox="0 0 ' +
    (o.w || u.w || 640) +
    ' ' +
    (o.h || u.h || 340) +
    '" role="img" aria-label="Logigramme">' +
    circInner(u, s, k, o) +
    '</svg>'
  );
}

export function circFree(u: any, s: any, t: string): { x: number; y: number } {
  const H = u.h || 340;
  const W = u.w || 640;
  const near = (x: number, y: number, r: number) =>
    s.nodes.some((a: any) => Math.abs(a.x - x) < r && Math.abs(a.y - y) < r * 0.8);
  if (t === 'in') {
    for (let y = 20; y < H - 30; y += 42) if (!near(14, y, 34)) return { x: 14, y };
  } else if (t === 'out') {
    for (let y = 20; y < H - 30; y += 42) if (!near(W - 70, y, 34)) return { x: W - 70, y };
  } else {
    for (let x = 100; x < W - 150; x += 100) for (let y = 24; y < H - 80; y += 66) if (!near(x, y, 70)) return { x, y };
  }
  return { x: 90 + Math.random() * (W - 260), y: 20 + Math.random() * (H - 110) };
}

function circPanel(u: any, k: string, s: any): string {
  if (s.arm)
    return (
      '<p class="edmsg">Broche choisie : touche maintenant ' +
      (s.arm.dir === 'o' ? 'une <b>entrée</b>' : 'une <b>sortie</b>') +
      ' pour tracer le fil. ' +
      edBtn(k, 'disarm', '', 'Annuler', 'ghost') +
      '</p>'
    );
  const sel = s.sel;
  if (!sel) return '<p class="edmsg dim">Touche un composant ou un fil pour le modifier.</p>';
  if (sel.t === 'w')
    return '<div class="edrow"><span class="edmsg">Fil sélectionné</span>' + edBtn(k, 'del', '', 'Supprimer le fil', 'danger') + '</div>';
  const n = s.nodes.find((x: any) => x.id === sel.id);
  if (!n) return '';
  let h =
    '<div class="edrow"><span class="edmsg"><b>' +
    esc(
      n.t === 'in'
        ? 'Entrée'
        : n.t === 'out'
          ? 'Sortie'
          : n.t === 'C0'
            ? 'Constante 0'
            : n.t === 'C1'
              ? 'Constante 1'
              : n.t === 'DFF'
                ? 'Bascule D'
                : n.t === 'JK'
                  ? 'Bascule JK'
                  : n.t === 'TFF'
                    ? 'Bascule T'
                    : CGATE[n.t].l
    ) +
    '</b></span>';
  if (n.t === 'in' || n.t === 'out') {
    const names = (n.t === 'in' ? u.inputs : u.outputs) || [];
    h +=
      '<label>Nom <select data-edc="' +
      k +
      '|name">' +
      names.map((x: string) => '<option' + (x === n.name ? ' selected' : '') + '>' + esc(x) + '</option>').join('') +
      '</select></label>';
  }
  if (CGATE[n.t] && n.t !== 'NOT')
    h += '<span class="edfan">Entrées ' + edBtn(k, 'fan', '-1', '−') + '<b>' + (n.n || 2) + '</b>' + edBtn(k, 'fan', '1', '+') + '</span>';
  h += edBtn(k, 'del', '', 'Supprimer', 'danger') + '</div>';
  return h;
}

export function circWidget(u: any, k: string, s: any): string {
  const allow = u.allow || CPAL.map((p) => p[0]);
  let h =
    '<div class="edtb">' +
    CPAL.filter((p) => allow.indexOf(p[0]) >= 0 && !(p[0] === 'in' && !(u.inputs && u.inputs.length)))
      .map((p) => edBtn(k, 'add', p[0], '+ ' + p[1], p[0] === 'in' || p[0] === 'out' ? 'io' : ''))
      .join('') +
    edBtn(k, 'clear', '', 'Tout effacer', 'ghost') +
    '</div>';
  h += '<div class="edpn" id="edpn-' + k + '">' + circPanel(u, k, s) + '</div><div class="edcv">' + circSvg(u, s, k) + '</div>';
  h +=
    '<details class="edhd"><summary class="fine">Aide : placer et relier les composants</summary><p class="fine edhint">Ajoute des composants, glisse-les où tu veux (ou touche-en un puis touche l\'endroit où le poser). Pour tracer un fil : touche un petit rond (sortie à droite) puis un autre petit rond (entrée à gauche). Touche un fil pour le supprimer. Sur téléphone, fais défiler le cadre horizontalement si besoin. ' +
    (u.mode === 'seq' ? "L'horloge est reliée automatiquement à toutes les bascules (front montant) ; elles démarrent à 0." : '') +
    '</p></details>';
  return h;
}

export function circDelNode(s: any, id: string): void {
  s.wires = s.wires.filter((w: any) => w.a.split('.')[0] !== id && w.b.split('.')[0] !== id);
  s.nodes = s.nodes.filter((n: any) => n.id !== id);
}

export function circModel(s: any): any {
  const nodes: Record<string, any> = {};
  const into: Record<string, string> = {};
  s.nodes.forEach((n: any) => {
    nodes[n.id] = n;
  });
  s.wires.forEach((w: any) => {
    into[w.b] = w.a;
  });
  return { nodes, into, list: s.nodes };
}

export function circStep(m: any, inp: Record<string, number>, ff: Record<string, number>, fl: any = { float: 0, loop: 0 }): any {
  const memo: Record<string, number> = {};
  const stack: Record<string, number> = {};
  function pin(id: string, p: string): number {
    const key = id + '.' + p;
    if (key in memo) return memo[key];
    const n = m.nodes[id];
    let v = 0;
    const t = n.t;
    if (t === 'in') v = inp[String(n.name || '').toLowerCase()] ? 1 : 0;
    else if (t === 'C0') v = 0;
    else if (t === 'C1') v = 1;
    else if (t === 'DFF' || t === 'JK' || t === 'TFF') {
      const q = ff[id] ? 1 : 0;
      v = p === 'q' ? q : 1 - q;
    } else if (CGATE[t]) {
      if (stack[id]) {
        fl.loop = 1;
        return 0;
      }
      stack[id] = 1;
      const k = t === 'NOT' ? 1 : n.n || 2;
      const a: number[] = [];
      for (let i = 0; i < k; i++) a.push(inPin(id, 'i' + i));
      delete stack[id];
      v = CGATE[t].f(a);
    }
    memo[key] = v;
    return v;
  }
  function inPin(id: string, p: string): number {
    const src = m.into[id + '.' + p];
    if (!src) {
      fl.float++;
      return 0;
    }
    const q = src.split('.');
    if (!m.nodes[q[0]]) return 0;
    return pin(q[0], q[1]);
  }
  const out: Record<string, number> = {};
  const next: Record<string, number> = {};
  m.list.forEach((n: any) => {
    if (n.t === 'out') {
      const nm = String(n.name || '').toLowerCase();
      const v = inPin(n.id, 'i0');
      if (!(nm in out)) out[nm] = v;
    }
  });
  m.list.forEach((n: any) => {
    const q = ff[n.id] ? 1 : 0;
    if (n.t === 'DFF') next[n.id] = inPin(n.id, 'd');
    else if (n.t === 'TFF') next[n.id] = q ^ inPin(n.id, 't');
    else if (n.t === 'JK') next[n.id] = jkNext(q, inPin(n.id, 'j'), inPin(n.id, 'k'));
  });
  return { out, next };
}

export function circRun(u: any, s: any): any {
  const m = circModel(s);
  const outs = u.outputs || [];
  const res: any = {
    tot: 0,
    ok: 0,
    rows: [],
    fl: { float: 0, loop: 0 },
    hasOut: s.nodes.some((n: any) => n.t === 'out'),
    ones: 0,
  };
  if (u.mode === 'seq') {
    const N = u.seq.n;
    let ff: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const inp: Record<string, number> = {};
      Object.keys(u.seq.stim || {}).forEach((nm) => {
        inp[nm.toLowerCase()] = u.seq.stim[nm][i];
      });
      const r = circStep(m, inp, ff, res.fl);
      const row: any = { i, exp: {}, got: {}, ok: true };
      outs.forEach((o: string) => {
        const e = u.seq.exp[o][i];
        const g = r.out[o.toLowerCase()] || 0;
        row.exp[o] = e;
        row.got[o] = g;
        res.tot++;
        res.ones += e;
        if (e === g) res.ok++;
        else row.ok = false;
      });
      res.rows.push(row);
      ff = r.next;
    }
  } else {
    const ins = u.inputs || [];
    const n = ins.length;
    for (let idx = 0; idx < 1 << n; idx++) {
      const inp: Record<string, number> = {};
      ins.forEach((nm: string, i: number) => {
        inp[nm.toLowerCase()] = (idx >> (n - 1 - i)) & 1;
      });
      const r = circStep(m, inp, {}, res.fl);
      const row: any = { i: idx, inp, exp: {}, got: {}, ok: true };
      outs.forEach((o: string) => {
        const e = u.tt[o][idx];
        const g = r.out[o.toLowerCase()] || 0;
        row.exp[o] = e;
        row.got[o] = g;
        res.tot++;
        res.ones += e;
        if (e === g) res.ok++;
        else row.ok = false;
      });
      res.rows.push(row);
    }
  }
  return res;
}

export function circFrac(u: any, s: any): number {
  const r = circRun(u, s);
  if (!r.tot || !s.nodes.length) return 0;
  if (r.ok === r.tot && r.hasOut) return 1;
  const f = r.ok / r.tot;
  const p1 = r.ones / r.tot;
  const base = Math.max(p1, 1 - p1);
  return Math.round(0.55 * Math.max(0, (f - base) / (1 - base + 1e-9)) * 100) / 100;
}

export function circCorr(u: any, k: string, s: any, h: string): string {
  const r = circRun(u, s);
  const f = circFrac(u, s);
  const outs = u.outputs || [];
  h += '<div class="edcv ro">' + circSvg(u, s, k, { ro: 1, id: 'edsvgc-' + k }) + '</div>';
  let msg: string;
  if (!s.nodes.length) msg = "Tu n'as pas dessiné de circuit.";
  else if (f === 1)
    msg =
      'Ton circuit donne les bonnes sorties pour ' +
      (u.mode === 'seq' ? "tous les coups d'horloge testés" : "toutes les combinaisons d'entrées") +
      '.';
  else {
    const okRows = r.rows.filter((x: any) => x.ok).length;
    msg =
      (u.mode === 'seq'
        ? "Ton circuit donne les bonnes valeurs à " + okRows + ' coup' + (okRows > 1 ? 's' : '') + " d'horloge sur " + r.rows.length
        : 'Ton circuit donne les bonnes sorties pour ' + okRows + ' combinaison' + (okRows > 1 ? 's' : '') + ' sur ' + r.rows.length) + '.';
  }
  h += '<p class="dsres">' + msg + ' · ' + fpt(Math.round(u.pts * f * 100) / 100) + ' / ' + fpt(u.pts) + ' pt</p>';
  const notes: string[] = [];
  if (!r.hasOut && s.nodes.length) notes.push('Il manque un composant « Sortie » portant le nom attendu (' + esc(outs.join(', ')) + ').');
  if (r.fl.float && f < 1) notes.push('Certaines entrées de portes ou de bascules ne sont reliées à rien (elles valent 0).');
  if (r.fl.loop) notes.push("Ton circuit contient une boucle combinatoire (une porte qui dépend d'elle-même sans bascule).");
  if (notes.length) h += '<ul class="ednotes">' + notes.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  if (r.rows.length && r.rows.length <= 32) {
    const ins = u.mode === 'seq' ? Object.keys(u.seq.stim || {}) : u.inputs || [];
    h +=
      '<details' +
      (f < 1 ? ' open' : '') +
      '><summary class="fine">Voir la table attendue et celle de ton circuit</summary><div class="gwrap"><table class="gtab ctt"><tr><th>' +
      (u.mode === 'seq' ? 'coup' : '') +
      '</th>' +
      ins.map((x: string) => '<th>' + esc(x) + '</th>').join('') +
      outs.map((o: string) => '<th>' + esc(o) + ' att.</th><th>' + esc(o) + ' toi</th>').join('') +
      '</tr>' +
      r.rows
        .map(
          (row: any) =>
            '<tr class="' +
            (row.ok ? '' : 'wr') +
            '"><th>' +
            (u.mode === 'seq' ? row.i : '') +
            '</th>' +
            ins.map((x: string) => '<td>' + (u.mode === 'seq' ? u.seq.stim[x][row.i] : row.inp[x.toLowerCase()]) + '</td>').join('') +
            outs.map((o: string) => '<td>' + row.exp[o] + '</td><td class="' + (row.exp[o] === row.got[o] ? '' : 'x') + '">' + row.got[o] + '</td>').join('') +
            '</tr>'
        )
        .join('') +
      '</table></div></details>';
  }
  h += '<div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
  return h;
}

/* ---------- CHRONOGRAMME À COMPLÉTER ---------- */
export function chronoInit(u: any): any {
  const s: any = { v: {} };
  (u.ask || []).forEach((nm: string) => {
    s.v[nm] = [];
    for (let i = 0; i < u.n; i++) s.v[nm].push(null);
  });
  return s;
}

export function chronoExp(u: any): Record<string, number[]> {
  if (u._exp) return u._exp;
  const exp: Record<string, number[]> = {};
  const ask: string[] = u.ask || [];
  ask.forEach((nm) => {
    exp[nm] = [];
  });
  if (u.eq) {
    const E = u.eq;
    let st: Record<string, number> = {};
    E.ff.forEach((f: any) => {
      st[f.n.toLowerCase()] = 0;
    });
    for (let i = 0; i < u.n; i++) {
      const env: Record<string, number> = {};
      Object.keys(u.stim || {}).forEach((nm) => {
        env[nm.toLowerCase()] = u.stim[nm][i];
      });
      Object.keys(st).forEach((q) => {
        env[q] = st[q];
      });
      ask.forEach((nm) => {
        const l = nm.toLowerCase();
        exp[nm].push(l in st ? st[l] : xEval(xParse((E.out || {})[nm]).ast, env));
      });
      const nx: Record<string, number> = {};
      E.ff.forEach((f: any) => {
        const l = f.n.toLowerCase();
        const q = st[l];
        nx[l] =
          f.t === 'JK'
            ? jkNext(q, xEval(xParse(f.j).ast, env), xEval(xParse(f.k).ast, env))
            : f.t === 'D'
              ? xEval(xParse(f.d).ast, env)
              : q ^ xEval(xParse(f.tt).ast, env);
      });
      st = nx;
    }
  } else if (u.circ) {
    const s = circInit({ pre: u.circ });
    const m = circModel(s);
    let ff: Record<string, number> = {};
    for (let i = 0; i < u.n; i++) {
      const inp: Record<string, number> = {};
      Object.keys(u.stim || {}).forEach((nm) => {
        inp[nm.toLowerCase()] = u.stim[nm][i];
      });
      const r = circStep(m, inp, ff);
      ask.forEach((nm) => {
        exp[nm].push(r.out[nm.toLowerCase()] || 0);
      });
      ff = r.next;
    }
  } else if (u.fsm) {
    const F = u.fsm;
    const M = fsmModel(fsmRefState(F), F);
    const ins = lcs(F.inputs);
    const mealy = F.mode === 'mealy';
    let st = M.init;
    for (let i = 0; i < u.n; i++) {
      const env: Record<string, number> = {};
      ins.forEach((nm) => {
        env[nm] = (u.stim[nm] || u.stim[nm.toUpperCase()] || [])[i] || 0;
      });
      Object.keys(u.stim || {}).forEach((nm) => {
        env[nm.toLowerCase()] = u.stim[nm][i];
      });
      const ms = fsmStep(M, st, env);
      const t = ms[0] || { to: st, out: '' };
      const key = mealy ? t.out : M.st[st].out;
      ask.forEach((nm) => {
        exp[nm].push(key.split(',').indexOf(nm.toLowerCase()) >= 0 ? 1 : 0);
      });
      st = t.to;
    }
  }
  Object.defineProperty(u, '_exp', { value: exp, enumerable: false });
  return exp;
}

const CL = { lbl: 58, W: 600 };

function chronoRows(u: any): Array<{ k: string; nm: string; h: number }> {
  const rows = [{ k: 'clk', nm: 'clk', h: 30 }];
  Object.keys(u.stim || {}).forEach((nm) => {
    rows.push({ k: 'giv', nm, h: 40 });
  });
  (u.ask || []).forEach((nm: string) => {
    rows.push({ k: 'ask', nm, h: 44 });
  });
  return rows;
}

function chronoSvgH(u: any): number {
  return 12 + chronoRows(u).reduce((t, r) => t + r.h, 0) + 6;
}

function chronoPath(vals: Array<number | null>, x0: number, cw: number, _y0: number, hiY: number, loY: number): string {
  let d = '';
  let prev: number | null = null;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v == null) {
      prev = null;
      continue;
    }
    const y = v ? hiY : loY;
    const xa = x0 + i * cw;
    const xb = xa + cw;
    if (prev === null) d += 'M' + xa + ' ' + y;
    else if (prev !== v) d += 'V' + y;
    d += 'H' + xb;
    prev = v;
  }
  return d;
}

export function chronoInner(u: any, s: any, _k: string, o: any): string {
  const n = u.n;
  const cw = (CL.W - CL.lbl - 8) / n;
  const x0 = CL.lbl;
  const H = chronoSvgH(u);
  const rows = chronoRows(u);
  const ex = o.corr ? chronoExp(u) : null;
  let h = '';
  let y = 8;
  for (let i = 0; i <= n; i++)
    h +=
      '<line x1="' +
      (x0 + i * cw) +
      '" y1="4" x2="' +
      (x0 + i * cw) +
      '" y2="' +
      (H - 4) +
      '" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/>';
  rows.forEach((r) => {
    const hi = y + 7;
    const lo = y + r.h - 9;
    const mid = (hi + lo) / 2;
    h += '<text x="' + (x0 - 8) + '" y="' + (mid + 4) + '" text-anchor="end" class="edname" font-size="13">' + esc(r.nm) + '</text>';
    h += '<line x1="' + x0 + '" y1="' + (lo + 6) + '" x2="' + (x0 + n * cw) + '" y2="' + (lo + 6) + '" stroke="var(--line)" stroke-width=".6" opacity=".6"/>';
    if (r.k === 'clk') {
      let d = '';
      for (let i = 0; i < n; i++) {
        const xa = x0 + i * cw;
        d += (i ? 'V' + lo : 'M' + xa + ' ' + lo) + 'V' + hi + 'H' + (xa + cw / 2) + 'V' + lo + 'H' + (xa + cw);
      }
      h += '<path d="' + d + '" fill="none" stroke="var(--dim)" stroke-width="1.8"/>';
    } else if (r.k === 'giv') {
      const vals = u.stim[r.nm];
      h += '<path d="' + chronoPath(vals, x0, cw, 0, hi, lo) + '" fill="none" stroke="var(--dim)" stroke-width="2.2" stroke-linejoin="miter"/>';
    } else {
      const vals = s.v[r.nm] || [];
      for (let i = 0; i < n; i++) {
        const xa = x0 + i * cw;
        const e = ex && ex[r.nm] ? ex[r.nm][i] : null;
        const v = vals[i];
        if (o.corr && v !== e)
          h += '<rect x="' + xa + '" y="' + (y + 1) + '" width="' + cw + '" height="' + (r.h - 2) + '" fill="var(--bad)" opacity=".14"/>';
        if (!o.corr)
          h +=
            '<g class="edcell" data-cc="' +
            esc(r.nm) +
            '|' +
            i +
            '"><rect x="' +
            xa +
            '" y="' +
            (y + 1) +
            '" width="' +
            cw +
            '" height="' +
            (r.h - 2) +
            '" fill="' +
            (v == null ? 'var(--accent-soft, #8882)' : 'transparent') +
            '" opacity="' +
            (v == null ? 0.35 : 1) +
            '"/></g>';
        if (v == null && !o.corr)
          h +=
            '<line x1="' +
            (xa + 5) +
            '" y1="' +
            mid +
            '" x2="' +
            (xa + cw - 5) +
            '" y2="' +
            mid +
            '" stroke="var(--dim)" stroke-width="1.4" stroke-dasharray="2 3" pointer-events="none"/>';
      }
      if (o.corr && ex && ex[r.nm])
        h +=
          '<path d="' +
          chronoPath(ex[r.nm], x0, cw, 0, hi - 2.5, lo - 2.5) +
          '" fill="none" stroke="var(--good)" stroke-width="2.2" stroke-dasharray="5 3" opacity=".9"/>';
      h +=
        '<path d="' +
        chronoPath(vals, x0, cw, 0, hi, lo) +
        '" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="miter" pointer-events="none"/>';
    }
    y += r.h;
  });
  return h;
}

export function chronoSvg(u: any, s: any, k: string, o: any = {}): string {
  return (
    '<svg class="edsvg edchr" style="min-width:600px" id="' +
    (o.id || 'edsvg-' + k) +
    '" data-edk="' +
    k +
    '" data-edkind="chrono"' +
    (o.corr ? ' data-ro="1"' : '') +
    ' viewBox="0 0 600 ' +
    chronoSvgH(u) +
    '" role="img" aria-label="Chronogramme">' +
    chronoInner(u, s, k, o) +
    '</svg>'
  );
}

function chronoCirc(u: any, k: string, id: string): string {
  if (!u.circ) return '';
  const cs = circInit({ pre: u.circ });
  return '<div class="edcv ro">' + circSvg({ w: u.circ.w, h: u.circ.h }, cs, k, { ro: 1, id, w: u.circ.w, h: u.circ.h }) + '</div>';
}

export function chronoWidget(u: any, k: string, s: any): string {
  let h = chronoCirc(u, k, 'edsvgk-' + k);
  h +=
    '<div class="edtb">' +
    edBtn(k, 'clear', '', 'Tout effacer', 'ghost') +
    edBtn(k, 'fill0', '', 'Tout à 0', 'ghost') +
    '</div><div class="edcv">' +
    chronoSvg(u, s, k) +
    '</div>';
  h +=
    '<p class="fine edhint">Touche une case d\'un signal à compléter : 1ère fois = niveau haut (1), 2<sup>e</sup> = niveau bas (0), puis ça alterne. Les cases en pointillé ne sont pas encore remplies. ' +
    (u.rule || '') +
    '</p>';
  return h;
}

export function chronoCount(u: any, s: any): any {
  const ex = chronoExp(u);
  const r: any = { ok: 0, tot: 0, ones: 0, per: {} };
  (u.ask || []).forEach((nm: string) => {
    let ok = 0;
    for (let i = 0; i < u.n; i++) {
      r.tot++;
      r.ones += ex[nm][i];
      if (s.v[nm][i] === ex[nm][i]) {
        ok++;
        r.ok++;
      }
    }
    r.per[nm] = ok;
  });
  return r;
}

export function chronoFrac(u: any, s: any): number {
  const r = chronoCount(u, s);
  if (!r.tot) return 0;
  if (r.ok === r.tot) return 1;
  const f = r.ok / r.tot;
  const p = r.ones / r.tot;
  const base = Math.max(p, 1 - p);
  const filled = (u.ask || []).some((nm: string) => s.v[nm].some((x: any) => x != null));
  if (!filled) return 0;
  return Math.round(0.85 * Math.max(0, (f - base) / (1 - base + 1e-9)) * 100) / 100;
}

export function chronoCorr(u: any, k: string, s: any, h: string): string {
  const r = chronoCount(u, s);
  const f = chronoFrac(u, s);
  h += chronoCirc(u, k, 'edsvgk-' + k);
  h += '<div class="edcv ro">' + chronoSvg(u, s, k, { corr: 1, id: 'edsvgc-' + k }) + '</div>';
  h += '<p class="fine" style="margin:4px 0">Trait plein : ta réponse. Pointillés verts : le chronogramme attendu. Colonnes fausses ou vides en rouge.</p>';
  h +=
    '<p class="dsres">' +
    (f === 1 ? 'Chronogramme juste' : r.ok + ' case' + (r.ok > 1 ? 's' : '') + ' juste' + (r.ok > 1 ? 's' : '') + ' sur ' + r.tot) +
    ' · ' +
    (u.ask || []).map((nm: string) => esc(nm) + ' : ' + r.per[nm] + '/' + u.n).join(' · ') +
    ' · ' +
    fpt(Math.round(u.pts * f * 100) / 100) +
    ' / ' +
    fpt(u.pts) +
    ' pt</p>';
  h += '<div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
  return h;
}

/* ===== Programmation système : mini-simulateur RISC-V & évaluateur Shell/Makefile ===== */
export const RVR: Record<string, number> = {
  zero: 0, ra: 1, sp: 2, gp: 3, tp: 4,
  t0: 5, t1: 6, t2: 7, s0: 8, fp: 8, s1: 9,
  a0: 10, a1: 11, a2: 12, a3: 13, a4: 14, a5: 15, a6: 16, a7: 17,
  s2: 18, s3: 19, s4: 20, s5: 21, s6: 22, s7: 23, s8: 24, s9: 25, s10: 26, s11: 27,
  t3: 28, t4: 29, t5: 30, t6: 31,
};
for (let i = 0; i < 32; i++) RVR['x' + i] = i;

const RV_DATA = 0x10010000;
const RV_TEXT = 0x00400000;
const RV_END = 0x7ffffff0;

function rvErr(line: number, msg: string): Error & { rv?: number } {
  const e = new Error((line ? 'ligne ' + line + ' : ' : '') + msg) as Error & { rv?: number };
  e.rv = 1;
  return e;
}

function rvStripComment(l: string): string {
  let q = false;
  let out = '';
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"' && l[i - 1] !== '\\') q = !q;
    if (!q && (c === '#' || (c === '/' && l[i + 1] === '/'))) break;
    out += c;
  }
  return out;
}

function rvSplitOps(s: string): string[] {
  const o: string[] = [];
  let cur = '';
  let d = 0;
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') q = !q;
    if (!q) {
      if (c === '(') d++;
      if (c === ')') d--;
      if (c === ',' && d === 0) {
        o.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += c;
  }
  if (cur.trim() !== '' || o.length) o.push(cur.trim());
  return o;
}

function rvStr(s: string, ln: number): number[] {
  const m = /^"((?:[^"\\]|\\.)*)"$/.exec(s.trim());
  if (!m) throw rvErr(ln, 'chaîne de caractères mal écrite (guillemets attendus)');
  const out: number[] = [];
  const t = m[1];
  for (let i = 0; i < t.length; i++) {
    let c = t[i];
    if (c === '\\') {
      i++;
      const e = t[i];
      c = e === 'n' ? '\n' : e === 't' ? '\t' : e === '0' ? '\0' : e === 'r' ? '\r' : e;
    }
    out.push(c.charCodeAt(0) & 255);
  }
  return out;
}

function rvNum(tok: unknown, env: any, ln: number): number {
  const s = String(tok).trim();
  if (s === '') throw rvErr(ln, 'valeur manquante');
  const term = (t0: string): number => {
    const t = t0.trim();
    if (/^[-+]?0[xX][0-9a-fA-F]+$/.test(t)) return t[0] === '-' ? -parseInt(t.slice(1), 16) : parseInt(t.replace('+', ''), 16);
    if (/^[-+]?0[bB][01]+$/.test(t)) return t[0] === '-' ? -parseInt(t.slice(3), 2) : parseInt(t.replace('+', '').slice(2), 2);
    if (/^[-+]?\d+$/.test(t)) return parseInt(t, 10);
    const mc = /^'(\\?.)'$/.exec(t);
    if (mc) {
      const c = mc[1];
      return c.length === 2 ? ({ n: 10, t: 9, '0': 0, '\\': 92, "'": 39 } as Record<string, number>)[c[1]] : c.charCodeAt(0);
    }
    const mr = /^%(hi|lo)\((.+)\)$/.exec(t);
    if (mr) {
      const v = rvNum(mr[2], env, ln) >>> 0;
      return mr[1] === 'hi' ? (v + 0x800) >>> 12 : (v << 20) >> 20;
    }
    if (/^[A-Za-z_.$][\w.$]*$/.test(t)) {
      if (t in env.eqv) return env.eqv[t];
      if (t in env.sym) {
        const sym = env.sym[t];
        if (sym.t === 'data') return sym.addr;
        return RV_TEXT + 4 * sym.idx;
      }
      throw rvErr(ln, 'symbole inconnu « ' + t + ' »');
    }
    throw rvErr(ln, 'valeur illisible « ' + t + ' »');
  };
  const parts = s.match(/^[-+]?[^+\-]+|[+-][^+\-]+/g);
  if (parts && parts.length > 1 && !/^'.*'$/.test(s) && !/^%/.test(s)) {
    let v = 0;
    parts.forEach((p) => {
      v += term(p);
    });
    return v;
  }
  return term(s);
}

const RV_ALU: Record<string, (a: number, b: number) => number> = {
  add: (a, b) => (a + b) | 0,
  sub: (a, b) => (a - b) | 0,
  and: (a, b) => a & b,
  or: (a, b) => a | b,
  xor: (a, b) => a ^ b,
  sll: (a, b) => a << (b & 31),
  srl: (a, b) => (a >>> (b & 31)) | 0,
  sra: (a, b) => a >> (b & 31),
  slt: (a, b) => (a < b ? 1 : 0),
  sltu: (a, b) => (a >>> 0 < b >>> 0 ? 1 : 0),
  mul: (a, b) => Math.imul(a, b),
  mulh: (a, b) => Number((BigInt(a) * BigInt(b)) >> 32n) | 0,
  mulhu: (a, b) => Number((BigInt(a >>> 0) * BigInt(b >>> 0)) >> 32n) | 0,
  div: (a, b) => (b === 0 ? -1 : a === -2147483648 && b === -1 ? a : Math.trunc(a / b) | 0),
  divu: (a, b) => (b === 0 ? -1 : ((a >>> 0) / (b >>> 0) >>> 0) | 0),
  rem: (a, b) => (b === 0 ? a : a === -2147483648 && b === -1 ? 0 : (a % b) | 0),
  remu: (a, b) => (b === 0 ? a : ((a >>> 0) % (b >>> 0)) | 0),
};
const RV_IMM: Record<string, string> = { addi: 'add', andi: 'and', ori: 'or', xori: 'xor', slti: 'slt', sltiu: 'sltu' };
const RV_SH: Record<string, string> = { slli: 'sll', srli: 'srl', srai: 'sra' };
const RV_LD: Record<string, [number, number]> = { lb: [1, 1], lbu: [1, 0], lh: [2, 1], lhu: [2, 0], lw: [4, 1] };
const RV_ST: Record<string, number> = { sb: 1, sh: 2, sw: 4 };
const RV_BR: Record<string, (a: number, b: number) => boolean> = {
  beq: (a, b) => a === b,
  bne: (a, b) => a !== b,
  blt: (a, b) => a < b,
  bge: (a, b) => a >= b,
  bltu: (a, b) => a >>> 0 < b >>> 0,
  bgeu: (a, b) => a >>> 0 >= b >>> 0,
};
const RV_BRP: Record<string, [string, number]> = { bgt: ['blt', 1], ble: ['bge', 1], bgtu: ['bltu', 1], bleu: ['bgeu', 1] };
const RV_BRZ: Record<string, [string, number]> = {
  beqz: ['beq', 0],
  bnez: ['bne', 0],
  bltz: ['blt', 0],
  bgez: ['bge', 0],
  blez: ['bge', 1],
  bgtz: ['blt', 1],
};

function rvReg(t: unknown, ln: number): number {
  const s = String(t || '').trim();
  if (s in RVR) return RVR[s];
  throw rvErr(ln, '« ' + s + " » n'est pas un registre");
}

function rvMemOp(t: unknown, env: any, ln: number): any {
  const s = String(t || '').trim();
  const m = /^(.*)\(\s*([A-Za-z0-9]+)\s*\)$/.exec(s);
  if (m) return { off: m[1].trim() === '' ? 0 : rvNum(m[1], env, ln), base: rvReg(m[2], ln) };
  return { sym: s };
}

function rvImm12(v: number, ln: number, what?: string): number {
  if (v < -2048 || v > 2047) throw rvErr(ln, "l'immédiat " + v + ' ne tient pas sur 12 bits (−2048 à 2047) : ' + (what || 'utilise li/la ou lui'));
  return v;
}

function rvTarget(t: unknown, env: any, ln: number): number {
  const s = String(t).trim();
  const sym = env.sym[s];
  if (!sym) throw rvErr(ln, 'étiquette inconnue « ' + s + ' »');
  if (sym.t !== 'text') throw rvErr(ln, '« ' + s + " » est une donnée, pas une étiquette de code");
  return sym.idx;
}

function rvPrep(I: any, env: any): any {
  const ln = I.ln;
  const o = I.ops;
  const op = I.op;
  const need = (n: number) => {
    if (o.length !== n) throw rvErr(ln, op + ' attend ' + n + ' opérande' + (n > 1 ? 's' : '') + ' (virgules entre les opérandes)');
  };
  if (op in RV_ALU && op !== 'slli') {
    need(3);
    return { f: 'alu', op, rd: rvReg(o[0], ln), a: rvReg(o[1], ln), b: rvReg(o[2], ln), ln };
  }
  if (op in RV_IMM) {
    need(3);
    return { f: 'alui', op: RV_IMM[op], rd: rvReg(o[0], ln), a: rvReg(o[1], ln), imm: rvImm12(rvNum(o[2], env, ln), ln), ln };
  }
  if (op in RV_SH) {
    need(3);
    const s = rvNum(o[2], env, ln);
    if (s < 0 || s > 31) throw rvErr(ln, 'décalage hors de 0..31');
    return { f: 'alui', op: RV_SH[op], rd: rvReg(o[0], ln), a: rvReg(o[1], ln), imm: s, ln };
  }
  if (op in RV_LD) {
    if (o.length !== 2) throw rvErr(ln, op + ' attend 2 opérandes : rd, imm(rs1)');
    const m = rvMemOp(o[1], env, ln);
    const rd = rvReg(o[0], ln);
    if (m.sym !== undefined) return { f: 'ldsym', op, rd, addr: rvNum(m.sym, env, ln), ln };
    return { f: 'ld', op, rd, base: m.base, off: rvImm12(m.off, ln), ln };
  }
  if (op in RV_ST) {
    if (o.length !== 2) throw rvErr(ln, op + ' attend 2 opérandes : rs2, imm(rs1)');
    const m = rvMemOp(o[1], env, ln);
    if (m.sym !== undefined) throw rvErr(ln, op + " : il faut une adresse dans un registre, par exemple 0(a1) (charge-la d'abord avec la)");
    return { f: 'st', op, rs: rvReg(o[0], ln), base: m.base, off: rvImm12(m.off, ln), ln };
  }
  if (op in RV_BR) {
    need(3);
    return { f: 'br', op, a: rvReg(o[0], ln), b: rvReg(o[1], ln), t: rvTarget(o[2], env, ln), ln };
  }
  if (op in RV_BRP) {
    need(3);
    const p = RV_BRP[op];
    return { f: 'br', op: p[0], a: rvReg(o[1], ln), b: rvReg(o[0], ln), t: rvTarget(o[2], env, ln), ln };
  }
  if (op in RV_BRZ) {
    need(2);
    const p = RV_BRZ[op];
    const r = rvReg(o[0], ln);
    return { f: 'br', op: p[0], a: p[1] ? 0 : r, b: p[1] ? r : 0, t: rvTarget(o[1], env, ln), ln };
  }
  if (op === 'lui') {
    need(2);
    return { f: 'lui', rd: rvReg(o[0], ln), imm: rvNum(o[1], env, ln), ln };
  }
  if (op === 'auipc') {
    need(2);
    return { f: 'auipc', rd: rvReg(o[0], ln), imm: rvNum(o[1], env, ln), ln };
  }
  if (op === 'li' || op === 'la') {
    need(2);
    return { f: 'li', rd: rvReg(o[0], ln), v: rvNum(o[1], env, ln), ln };
  }
  if (op === 'mv') {
    need(2);
    return { f: 'alu', op: 'add', rd: rvReg(o[0], ln), a: rvReg(o[1], ln), b: 0, ln };
  }
  if (op === 'not') {
    need(2);
    return { f: 'alui', op: 'xor', rd: rvReg(o[0], ln), a: rvReg(o[1], ln), imm: -1, ln };
  }
  if (op === 'neg') {
    need(2);
    return { f: 'alu', op: 'sub', rd: rvReg(o[0], ln), a: 0, b: rvReg(o[1], ln), ln };
  }
  if (op === 'seqz') {
    need(2);
    return { f: 'alui', op: 'sltu', rd: rvReg(o[0], ln), a: rvReg(o[1], ln), imm: 1, ln };
  }
  if (op === 'snez') {
    need(2);
    return { f: 'alu', op: 'sltu', rd: rvReg(o[0], ln), a: 0, b: rvReg(o[1], ln), ln };
  }
  if (op === 'nop') return { f: 'nop', ln };
  if (op === 'j' || op === 'b') {
    need(1);
    return { f: 'jal', rd: 0, t: rvTarget(o[0], env, ln), ln };
  }
  if (op === 'jal') {
    if (o.length === 1) return { f: 'jal', rd: 1, t: rvTarget(o[0], env, ln), ln };
    need(2);
    return { f: 'jal', rd: rvReg(o[0], ln), t: rvTarget(o[1], env, ln), ln };
  }
  if (op === 'call') {
    need(1);
    return { f: 'jal', rd: 1, t: rvTarget(o[0], env, ln), ln };
  }
  if (op === 'jr') {
    need(1);
    return { f: 'jalr', rd: 0, rs: rvReg(o[0], ln), off: 0, ln };
  }
  if (op === 'ret') return { f: 'jalr', rd: 0, rs: 1, off: 0, ln };
  if (op === 'jalr') {
    if (o.length === 1) return { f: 'jalr', rd: 1, rs: rvReg(o[0], ln), off: 0, ln };
    if (o.length === 3) return { f: 'jalr', rd: rvReg(o[0], ln), rs: rvReg(o[1], ln), off: rvNum(o[2], env, ln), ln };
    const m = rvMemOp(o[1], env, ln);
    return { f: 'jalr', rd: rvReg(o[0], ln), rs: m.base, off: m.off, ln };
  }
  if (op === 'ecall') return { f: 'ecall', ln };
  throw rvErr(ln, 'instruction inconnue « ' + op + ' »');
}

export function rvAssemble(src: string): any {
  const lines = String(src).split('\n');
  const env: any = { eqv: {}, sym: {} };
  const ins: any[] = [];
  const data: Array<[number, number]> = [];
  let sec = 'text';
  let dptr = RV_DATA;
  let pend: string[] = [];
  const dbytes = (a: number[]) => {
    a.forEach((b) => {
      data.push([dptr++, b & 255]);
    });
  };
  const dalign = (n: number) => {
    while (dptr % n) dptr++;
  };
  const dirs: Array<{ addr: number; x: string; ln: number }> = [];
  lines.forEach((raw, li) => {
    const ln = li + 1;
    let l = rvStripComment(raw).trim();
    if (l === '') return;
    let m: RegExpExecArray | null;
    while ((m = /^([A-Za-z_.$][\w.$]*)\s*:\s*(.*)$/.exec(l))) {
      const name = m[1];
      l = m[2].trim();
      if (name in env.sym) throw rvErr(ln, 'étiquette « ' + name + ' » déjà définie');
      if (sec === 'text') env.sym[name] = { t: 'text', idx: ins.length };
      else {
        env.sym[name] = { t: 'data', addr: null, pending: true };
        pend.push(name);
      }
    }
    const flushPend = () => {
      pend.forEach((n) => {
        env.sym[n].addr = dptr;
        delete env.sym[n].pending;
      });
      pend = [];
    };
    if (l === '') return;
    const mm = /^(\S+)\s*(.*)$/.exec(l);
    if (!mm) return;
    const op = mm[1];
    const rest = mm[2];
    if (op[0] === '.') {
      if (op === '.data') {
        sec = 'data';
        return;
      }
      if (op === '.text') {
        sec = 'text';
        return;
      }
      if (op === '.globl' || op === '.global' || op === '.section' || op === '.option') return;
      if (op === '.eqv' || op === '.equ' || op === '.set') {
        const o = rvSplitOps(rest);
        if (o.length !== 2) throw rvErr(ln, 'directive ' + op + ' : nom, valeur attendus');
        env.eqv[o[0]] = rvNum(o[1], env, ln);
        return;
      }
      if (sec !== 'data') throw rvErr(ln, 'la directive ' + op + ' doit être placée dans la section .data (il manque « .data » ?)');
      if (op === '.align') {
        dalign(1 << rvNum(rest, env, ln));
        flushPend();
        return;
      }
      if (op === '.byte') {
        flushPend();
        const o = rvSplitOps(rest);
        if (!o.length) dbytes([0]);
        else o.forEach((x) => dbytes([x === '?' ? 0 : rvNum(x, env, ln)]));
        return;
      }
      if (op === '.half' || op === '.short') {
        dalign(2);
        flushPend();
        const o = rvSplitOps(rest);
        if (!o.length) o.push('0');
        o.forEach((x) => {
          const v = x === '?' ? 0 : rvNum(x, env, ln);
          dbytes([v, v >> 8]);
        });
        return;
      }
      if (op === '.word') {
        dalign(4);
        flushPend();
        const o = rvSplitOps(rest);
        if (!o.length) o.push('0');
        o.forEach((x) => {
          if (x === '?') {
            dbytes([0, 0, 0, 0]);
            return;
          }
          if (/^[A-Za-z_.$][\w.$]*$/.test(x) && !(x in env.eqv)) {
            dirs.push({ addr: dptr, x, ln });
            dbytes([0, 0, 0, 0]);
            return;
          }
          const v = rvNum(x, env, ln);
          dbytes([v, v >> 8, v >> 16, v >> 24]);
        });
        return;
      }
      if (op === '.space' || op === '.zero') {
        flushPend();
        const n = rvNum(rest, env, ln);
        if (n < 0 || n > 1 << 20) throw rvErr(ln, '.space : taille invalide');
        dbytes(new Array(n).fill(0));
        return;
      }
      if (op === '.string' || op === '.asciz' || op === '.ascii') {
        flushPend();
        rvSplitOps(rest).forEach((x) => dbytes(rvStr(x, ln).concat(op === '.ascii' ? [] : [0])));
        return;
      }
      throw rvErr(ln, 'directive inconnue « ' + op + ' »');
    }
    if (sec === 'data') throw rvErr(ln, 'instruction « ' + op + ' » dans la section .data (il faut « .text » avant les instructions)');
    ins.push({ op: op.toLowerCase(), ops: rvSplitOps(rest), ln });
  });
  pend.forEach((n) => {
    env.sym[n].addr = dptr;
    delete env.sym[n].pending;
  });
  dirs.forEach((d) => {
    const v = rvNum(d.x, env, d.ln);
    [v, v >> 8, v >> 16, v >> 24].forEach((b, i) => {
      data.forEach((p) => {
        if (p[0] === d.addr + i) p[1] = b & 255;
      });
    });
  });
  const prog = ins.map((I) => rvPrep(I, env));
  return { ins: prog, env, data, dend: dptr };
}

export function rvMachine(prog: any): any {
  const M: any = { r: new Int32Array(32), mem: {}, pc: 0, out: '', steps: 0, halted: false, inq: [] };
  prog.data.forEach((p: [number, number]) => {
    M.mem[p[0]] = p[1];
  });
  M.r[1] = RV_END | 0;
  M.r[2] = 0x7fffeffc | 0;
  M.r[3] = 0x10008000 | 0;
  return M;
}

function rvRd(M: any, a0: number, n: number, sgn: number | boolean, ln: number): number {
  const a = a0 >>> 0;
  if (a % n)
    throw rvErr(ln, "accès non aligné à l'adresse 0x" + a.toString(16) + ' (un mot doit être à une adresse multiple de 4, un demi-mot de 2)');
  let v = 0;
  for (let i = n - 1; i >= 0; i--) v = v * 256 + (M.mem[(a + i) >>> 0] || 0);
  if (n === 4) return v | 0;
  if (sgn) {
    const bits = n * 8;
    return (v << (32 - bits)) >> (32 - bits);
  }
  return v;
}

function rvWr(M: any, a0: number, n: number, v: number, ln: number): void {
  const a = a0 >>> 0;
  if (a % n)
    throw rvErr(ln, "accès non aligné à l'adresse 0x" + a.toString(16) + ' (un mot doit être à une adresse multiple de 4, un demi-mot de 2)');
  for (let i = 0; i < n; i++) M.mem[(a + i) >>> 0] = (v >> (8 * i)) & 255;
}

export function rvRun(prog: any, M: any, max = 100000): any {
  const P = prog.ins;
  M.err = null;
  try {
    while (M.pc >= 0 && M.pc < P.length && !M.halted) {
      if (++M.steps > max) throw rvErr(0, "le programme ne s'arrête pas (boucle infinie ?) après " + max + ' instructions');
      const I = P[M.pc];
      const R = M.r;
      let next = M.pc + 1;
      const set = (rd: number, v: number) => {
        if (rd) R[rd] = v;
      };
      switch (I.f) {
        case 'alu':
          set(I.rd, RV_ALU[I.op](R[I.a], R[I.b]));
          break;
        case 'alui':
          set(I.rd, RV_ALU[I.op](R[I.a], I.imm));
          break;
        case 'lui':
          set(I.rd, I.imm << 12);
          break;
        case 'auipc':
          set(I.rd, (RV_TEXT + 4 * M.pc + (I.imm << 12)) | 0);
          break;
        case 'li':
          set(I.rd, I.v | 0);
          break;
        case 'ld': {
          const d = RV_LD[I.op];
          set(I.rd, rvRd(M, (R[I.base] + I.off) | 0, d[0], d[1], I.ln));
          break;
        }
        case 'ldsym': {
          const d = RV_LD[I.op];
          set(I.rd, rvRd(M, I.addr | 0, d[0], d[1], I.ln));
          break;
        }
        case 'st':
          rvWr(M, (R[I.base] + I.off) | 0, RV_ST[I.op], R[I.rs], I.ln);
          break;
        case 'br':
          if (RV_BR[I.op](R[I.a], R[I.b])) next = I.t;
          break;
        case 'jal':
          set(I.rd, (RV_TEXT + 4 * (M.pc + 1)) | 0);
          next = I.t;
          break;
        case 'jalr': {
          const t = ((R[I.rs] + I.off) | 0) >>> 0;
          set(I.rd, (RV_TEXT + 4 * (M.pc + 1)) | 0);
          if (t < RV_TEXT || t >= RV_TEXT + 4 * P.length) {
            M.halted = true;
            next = M.pc;
          } else next = (t - RV_TEXT) / 4;
          break;
        }
        case 'ecall': {
          const c = R[17];
          if (c === 1) M.out += String(R[10]);
          else if (c === 4) {
            let a = R[10] >>> 0;
            let s = '';
            for (let n = 0; n < 4096; n++) {
              const b = M.mem[a++] || 0;
              if (!b) break;
              s += String.fromCharCode(b);
            }
            M.out += s;
          } else if (c === 11) M.out += String.fromCharCode(R[10] & 255);
          else if (c === 10 || c === 93) M.halted = true;
          else if (c === 5) R[10] = M.inq.length ? M.inq.shift() : 0;
          else throw rvErr(I.ln, 'ecall : service ' + c + ' non géré par ce simulateur (utilise 1, 4, 5, 10 ou 11)');
          break;
        }
        default:
          break;
      }
      R[0] = 0;
      M.pc = next;
    }
  } catch (e: any) {
    if (!e.rv) throw e;
    M.err = e.message;
  }
  return M;
}

function rvHex(v: number): string {
  return '0x' + (v >>> 0).toString(16);
}

function rvAddr(t: unknown, env: any): number {
  if (typeof t === 'number') return t;
  return rvNum(String(t).replace(/^@/, ''), env, 0);
}

export function asmEval(u: any, code: unknown): any {
  const out: any = { err: null, tests: [], passed: 0, n: 0, dchk: null };
  const body = String(code || '').trim();
  if (body === '') {
    out.empty = true;
    out.n = (u.tests || []).length || (u.dchk || []).length;
    return out;
  }
  let prog: any;
  const head = u.dmode ? '.data\n' + (u.pre || '') + '\n' : (u.pre || '') + '\n.text\n';
  const off = head.split('\n').length - 1;
  const fix = (m: string) =>
    String(m).replace(/^ligne (\d+)/, (_, n) => {
      const k = +n - off;
      return k > 0 && k <= body.split('\n').length ? 'ligne ' + k : '(code fourni)';
    });
  try {
    if (u.dmode) prog = rvAssemble(head + body + '\n__fin: .byte 0\n.text\n');
    else prog = rvAssemble(head + body + '\n' + (u.post ? 'j __fin\n' + u.post + '\n' : '') + '__fin: nop\n');
  } catch (e: any) {
    if (!e.rv) throw e;
    out.err = fix(e.message);
    out.n = (u.tests || []).length || (u.dchk || []).length;
    return out;
  }
  const env = prog.env;
  if (u.dmode) {
    out.n = u.dchk.length;
    u.dchk.forEach((c: any) => {
      const s = env.sym[c.l];
      const res: any = { name: c.l, ok: true, msgs: [] };
      if (!s || s.t !== 'data') {
        res.ok = false;
        res.msgs.push('étiquette « ' + c.l + ' » absente');
      } else {
        const addrs = Object.keys(env.sym)
          .map((k) => env.sym[k])
          .filter((x) => x.t === 'data' && x.addr >= s.addr && x.addr !== s.addr)
          .map((x) => x.addr);
        const nxt = addrs.length ? Math.min(...addrs) : prog.dend;
        const sz = nxt - s.addr;
        if (c.align && s.addr % c.align) {
          res.ok = false;
          res.msgs.push('adresse 0x' + s.addr.toString(16) + ' mal alignée (multiple de ' + c.align + ' attendu)');
        }
        if (sz < c.size || sz > c.size + 3) {
          res.ok = false;
          res.msgs.push('taille réservée : ' + sz + ' octets, attendu ' + c.size);
        }
        if (c.re) {
          const mm = new RegExp('(^|\\n)\\s*' + c.l + '\\s*:([^\\n]*)(\\n[^\\n]*)?').exec(body);
          const tx = mm ? (mm[2] || '') + (mm[3] || '') : '';
          if (!new RegExp(c.re).test(tx)) {
            res.ok = false;
            res.msgs.push(c.remsg || 'directive attendue non trouvée');
          }
        }
        if (c.val !== undefined) {
          const M = rvMachine(prog);
          const v = rvRd(M, s.addr, c.w || 4, false, 0);
          if (v !== c.val) {
            res.ok = false;
            res.msgs.push('valeur initiale ' + v + ', attendu ' + c.val);
          }
        }
      }
      if (res.ok) out.passed++;
      out.tests.push(res);
    });
    return out;
  }
  out.n = u.tests.length;
  u.tests.forEach((t: any) => {
    const M = rvMachine(prog);
    const res: any = { name: t.name || '', ok: true, msgs: [] };
    try {
      Object.keys(t.regs || {}).forEach((k) => {
        M.r[RVR[k]] = rvAddr(t.regs[k], env) | 0;
      });
      (t.mem || []).forEach((m: any) => {
        const a = rvAddr(m.a, env);
        const w = m.w || 4;
        if (m.n) {
          for (let i = 0; i < m.n; i++) {
            const v = m.vs ? m.vs[i % m.vs.length] : m.v;
            rvWr(M, a + i * w, w, rvAddr(v, env), 0);
          }
        } else rvWr(M, a, w, rvAddr(m.v, env), 0);
      });
      if (t.inq) M.inq = t.inq.slice();
      if (u.entry && env.sym[u.entry]) M.pc = env.sym[u.entry].idx;
      rvRun(prog, M, u.max || 100000);
      if (M.err) {
        res.ok = false;
        res.msgs.push(M.err);
      } else {
        Object.keys((t.exp && t.exp.regs) || {}).forEach((k) => {
          const want = rvAddr(t.exp.regs[k], env) | 0;
          const got = M.r[RVR[k]] | 0;
          if (got !== want) {
            res.ok = false;
            res.msgs.push(k + ' vaut ' + got + ' (' + rvHex(got) + '), attendu ' + want + ' (' + rvHex(want) + ')');
          }
        });
        ((t.exp && t.exp.mem) || []).forEach((m: any) => {
          const a = rvAddr(m.a, env);
          const w = m.w || 4;
          const want = rvAddr(m.v, env);
          const got = rvRd(M, a, w, false, 0);
          const wm = w === 4 ? want | 0 : want & ((1 << (8 * w)) - 1);
          if (got !== wm) {
            res.ok = false;
            res.msgs.push(
              'mémoire à ' +
                (typeof m.a === 'string' ? m.a + ' ' : '') +
                '(' +
                rvHex(a) +
                ', ' +
                w +
                ' octet' +
                (w > 1 ? 's' : '') +
                ') : ' +
                got +
                ', attendu ' +
                wm
            );
          }
        });
        if (t.exp && t.exp.out !== undefined && M.out !== t.exp.out) {
          res.ok = false;
          res.msgs.push('affichage « ' + M.out + ' », attendu « ' + t.exp.out + ' »');
        }
        if (t.exp && t.exp.keep) {
          t.exp.keep.forEach((k: string) => {
            const want = rvAddr((t.regs || {})[k] || 0, env) | 0;
            if ((M.r[RVR[k]] | 0) !== want) {
              res.ok = false;
              res.msgs.push(k + " a été modifié (valeur d'origine " + want + ") alors qu'il devait être conservé");
            }
          });
        }
      }
    } catch (e: any) {
      if (!e.rv) throw e;
      res.ok = false;
      res.msgs.push(e.message);
    }
    res.msgs = res.msgs.map(fix);
    res.steps = M.steps;
    if (res.ok) out.passed++;
    out.tests.push(res);
  });
  return out;
}

export function asmReport(_u: any, r: any): string {
  if (r.empty) return '<p class="fine">Écris d\'abord ton code.</p>';
  if (r.err) return '<p class="thm-bad" style="margin:4px 0"><b>Erreur d\'assemblage</b> — ' + esc(r.err) + '</p>';
  return (
    '<p class="dsres" style="margin:4px 0">' +
    r.passed +
    ' test' +
    (r.passed > 1 ? 's' : '') +
    ' réussi' +
    (r.passed > 1 ? 's' : '') +
    ' sur ' +
    r.n +
    '</p><ul class="ednotes" style="list-style:none;padding-left:0">' +
    r.tests
      .map(
        (t: any) =>
          '<li>' +
          (t.ok ? '<span class="thm-good">✓</span> ' : '<span class="thm-bad">✗</span> ') +
          '<b>' +
          esc(t.name || '') +
          '</b>' +
          (t.ok ? '' : '<br><span class="fine">' + t.msgs.map(esc).join('<br>') + '</span>') +
          '</li>'
      )
      .join('') +
    '</ul>'
  );
}

/* ---------- Réponses « commande » (Shell / Makefile) ---------- */
export function cmdNorm(s: unknown): string {
  return String(s || '')
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').replace(/^\s*\$\s+/, '').replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '')
    .join('\n');
}

function globRe(p: string): RegExp {
  let r = '^';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '\\') {
      i++;
      r += (p[i] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      continue;
    }
    if (c === '*') r += '[^/]*';
    else if (c === '?') r += '[^/]';
    else if (c === '[') {
      let j = i + 1;
      let set = '';
      if (p[j] === '!' || p[j] === '^') {
        set = '^';
        j++;
      }
      let cls = '';
      while (j < p.length && (p[j] !== ']' || cls === '')) {
        cls += p[j];
        j++;
      }
      if (j >= p.length) {
        r += '\\[';
        continue;
      }
      r += '[' + set + cls.replace(/\\/g, '\\\\') + ']';
      i = j;
    } else r += c.replace(/[.+^${}()|\]\\]/g, '\\$&');
  }
  return new RegExp(r + '$');
}

function shWords(s: string): string[] {
  const w: string[] = [];
  let cur = '';
  let q: string | null = null;
  let has = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      else cur += (q === '"' || q === "'") && '*?[]\\'.indexOf(c) >= 0 ? '\\' + c : c;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      has = true;
      continue;
    }
    if (c === '\\' && i + 1 < s.length) {
      cur += '\\' + s[++i];
      has = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur !== '' || has) {
        w.push(cur);
        cur = '';
        has = false;
      }
      continue;
    }
    cur += c;
  }
  if (cur !== '' || has) w.push(cur);
  return w;
}

function braceExp(w: string): string[] {
  const m = /^(.*?)\{([^{}]*,[^{}]*)\}(.*)$/.exec(w);
  if (!m) return [w];
  let out: string[] = [];
  m[2].split(',').forEach((x) => {
    out = out.concat(braceExp(m[1] + x + m[3]));
  });
  return out;
}

export function globEval(cmd: string, g: { files: string[]; dir: string; want: string[] }): string[] | null {
  const words: string[] = [];
  shWords(cmd).forEach((w, i) => {
    (i ? braceExp(w) : [w]).forEach((x) => words.push(x));
  });
  if (!words.length || words[0] !== 'ls') return null;
  const files = g.files;
  const dir = g.dir;
  const got: Record<string, number> = {};
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w[0] === '-') continue;
    let rel = w;
    if (rel.indexOf(dir) === 0) rel = rel.slice(dir.length);
    else if (rel.indexOf('/') >= 0 && rel[0] === '/') return null;
    if (rel === '') {
      files.forEach((f) => {
        if (f[0] !== '.') got[f] = 1;
      });
      continue;
    }
    const re = globRe(rel);
    const hidden = rel[0] === '.';
    let any = false;
    files.forEach((f) => {
      if (f[0] === '.' && !hidden) return;
      if (re.test(f)) {
        got[f] = 1;
        any = true;
      }
    });
    if (!any && !/[*?\[]/.test(rel)) got['?' + rel] = 1;
  }
  return Object.keys(got).sort();
}

export function cmdEval(u: any, text: unknown): any {
  const t = cmdNorm(text);
  const res: any = { items: [], got: 0, max: 0, pen: 0 };
  (u.checks || []).forEach((c: any) => {
    let ok = false;
    if (c.glob) {
      const r = globEval(t.split('\n')[0] || '', c.glob);
      ok = !!r && r.join('|') === c.glob.want.slice().sort().join('|');
    } else {
      try {
        ok = new RegExp(c.re, c.fl || '').test(t);
      } catch {
        ok = false;
      }
    }
    res.max += c.w || 1;
    if (ok) res.got += c.w || 1;
    res.items.push({ ok, msg: c.msg, w: c.w || 1 });
  });
  (u.bans || []).forEach((c: any) => {
    let hit = false;
    try {
      hit = new RegExp(c.re, c.fl || '').test(t);
    } catch {
      // ignore invalid regex
    }
    if (hit) {
      res.pen += c.w || 1;
      res.items.push({ ok: false, msg: c.msg, w: -(c.w || 1), ban: true });
    }
  });
  res.empty = t === '';
  res.frac = res.empty || !res.max ? 0 : Math.max(0, Math.round(((res.got - res.pen) / res.max) * 100) / 100);
  return res;
}

export function progChecks(items: any[]): string {
  return (
    '<ul class="ednotes" style="list-style:none;padding-left:0">' +
    items
      .map(
        (c) =>
          '<li>' +
          (c.ban ? '<span class="thm-bad">✗ ' : c.ok ? '<span class="thm-good">✓ ' : '<span class="thm-bad">✗ ') +
          '</span>' +
          c.msg +
          '</li>'
      )
      .join('') +
    '</ul>'
  );
}
