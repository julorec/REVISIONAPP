/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Subject-adapted interactive engines for ESET 3A Moodle modules:
 * - `bode`: Analog electronics interactive asymptotic Bode plotter + SVG circuit schematic
 * - `signal`: TTSD interactive signal/spectrum & Shannon-Nyquist aliasing visualizer
 * - `pipeline`: Computer Architecture interactive 5-stage RISC-V pipeline grid (IF/ID/EX/MEM/WB/STALL)
 * - `cloze`: English S5 interactive TOEIC Part 5/6 Cloze & Frenglish spot-and-fix trainer
 */

import { esc, fpt, pn } from './engines';

/* ============================================================================
 * 1. ANALOG ELECTRONICS — Circuit Schematics & Interactive Asymptotic Bode
 * ============================================================================ */

export function analogCircuitSvg(type: string, params?: Record<string, string>): string {
  const p = params || {};
  const wrap = (body: string, w = 420, h = 155, label = 'Schéma électronique') =>
    `<div class="edcv ro" style="margin:6px 0 10px"><svg class="edsvg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg></div>`;

  if (type === 'rc_lp') {
    const R = esc(p.R || 'R');
    const C = esc(p.C || 'C');
    return wrap(
      `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <text x="18" y="54" class="edname" stroke="none">Vₑ</text>
        <circle cx="44" cy="50" r="3.5" fill="var(--surface)"/>
        <line x1="48" y1="50" x2="105" y2="50"/>
        <rect x="105" y="38" width="66" height="24" rx="2"/>
        <text x="138" y="30" text-anchor="middle" class="edlab" fill="currentColor" stroke="none">${R}</text>
        <line x1="171" y1="50" x2="365" y2="50"/>
        <circle cx="235" cy="50" r="3" fill="currentColor"/>
        <line x1="235" y1="50" x2="235" y2="82"/>
        <line x1="213" y1="82" x2="257" y2="82" stroke="var(--accent)" stroke-width="2.6"/>
        <line x1="213" y1="92" x2="257" y2="92" stroke="var(--accent)" stroke-width="2.6"/>
        <text x="266" y="92" class="edlab" fill="var(--accent)" stroke="none">${C}</text>
        <line x1="235" y1="92" x2="235" y2="128"/>
        <line x1="44" y1="128" x2="365" y2="128"/>
        <line x1="222" y1="128" x2="248" y2="128"/><line x1="227" y1="134" x2="243" y2="134"/><line x1="232" y1="140" x2="238" y2="140"/>
        <circle cx="369" cy="50" r="3.5" fill="var(--surface)"/>
        <circle cx="369" cy="128" r="3.5" fill="var(--surface)"/>
        <text x="386" y="92" class="edname" fill="var(--accent)" stroke="none">Vₛ</text>
        <path d="M377 120 L377 60 M373 66 L377 58 L381 66" stroke="var(--accent)" stroke-width="1.6"/>
      </g>`,
      440,
      152,
      'Filtre passe-bas RC'
    );
  }

  if (type === 'rc_hp') {
    const R = esc(p.R || 'R');
    const C = esc(p.C || 'C');
    return wrap(
      `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <text x="18" y="54" class="edname" stroke="none">Vₑ</text>
        <circle cx="44" cy="50" r="3.5" fill="var(--surface)"/>
        <line x1="48" y1="50" x2="122" y2="50"/>
        <line x1="122" y1="32" x2="122" y2="68" stroke="var(--accent)" stroke-width="2.6"/>
        <line x1="132" y1="32" x2="132" y2="68" stroke="var(--accent)" stroke-width="2.6"/>
        <text x="127" y="24" text-anchor="middle" class="edlab" fill="var(--accent)" stroke="none">${C}</text>
        <line x1="132" y1="50" x2="365" y2="50"/>
        <circle cx="235" cy="50" r="3" fill="currentColor"/>
        <line x1="235" y1="50" x2="235" y2="66"/>
        <rect x="223" y="66" width="24" height="46" rx="2"/>
        <text x="256" y="94" class="edlab" fill="currentColor" stroke="none">${R}</text>
        <line x1="235" y1="112" x2="235" y2="128"/>
        <line x1="44" y1="128" x2="365" y2="128"/>
        <line x1="222" y1="128" x2="248" y2="128"/><line x1="227" y1="134" x2="243" y2="134"/><line x1="232" y1="140" x2="238" y2="140"/>
        <circle cx="369" cy="50" r="3.5" fill="var(--surface)"/>
        <circle cx="369" cy="128" r="3.5" fill="var(--surface)"/>
        <text x="386" y="92" class="edname" fill="var(--accent)" stroke="none">Vₛ</text>
        <path d="M377 120 L377 60 M373 66 L377 58 L381 66" stroke="var(--accent)" stroke-width="1.6"/>
      </g>`,
      440,
      152,
      'Filtre passe-haut CR'
    );
  }

  if (type === 'rlc_lp' || type === 'rlc_bp') {
    const R = esc(p.R || 'R');
    const L = esc(p.L || 'L');
    const C = esc(p.C || 'C');
    const isBp = type === 'rlc_bp';
    return wrap(
      `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <text x="14" y="54" class="edname" stroke="none">Vₑ</text>
        <circle cx="38" cy="50" r="3.5" fill="var(--surface)"/>
        <line x1="42" y1="50" x2="72" y2="50"/>
        <path d="M72 50 q8-16 16 0 q8-16 16 0 q8-16 16 0 q8-16 16 0" stroke="var(--warm)" stroke-width="2.2"/>
        <text x="104" y="28" text-anchor="middle" class="edlab" fill="var(--warm)" stroke="none">${L}</text>
        <line x1="136" y1="50" x2="165" y2="50"/>
        ${
          isBp
            ? `<line x1="165" y1="34" x2="165" y2="66" stroke="var(--accent)" stroke-width="2.5"/><line x1="175" y1="34" x2="175" y2="66" stroke="var(--accent)" stroke-width="2.5"/><text x="170" y="26" text-anchor="middle" class="edlab" fill="var(--accent)" stroke="none">${C}</text><line x1="175" y1="50" x2="340" y2="50"/><circle cx="265" cy="50" r="3" fill="currentColor"/><line x1="265" y1="50" x2="265" y2="66"/><rect x="253" y="66" width="24" height="46" rx="2"/><text x="288" y="94" class="edlab" fill="currentColor" stroke="none">${R}</text><line x1="265" y1="112" x2="265" y2="128"/>`
            : `<rect x="165" y="38" width="56" height="24" rx="2"/><text x="193" y="28" text-anchor="middle" class="edlab" fill="currentColor" stroke="none">${R}</text><line x1="221" y1="50" x2="340" y2="50"/><circle cx="272" cy="50" r="3" fill="currentColor"/><line x1="272" y1="50" x2="272" y2="82"/><line x1="252" y1="82" x2="292" y2="82" stroke="var(--accent)" stroke-width="2.5"/><line x1="252" y1="92" x2="292" y2="92" stroke="var(--accent)" stroke-width="2.5"/><text x="302" y="92" class="edlab" fill="var(--accent)" stroke="none">${C}</text><line x1="272" y1="92" x2="272" y2="128"/>`
        }
        <line x1="38" y1="128" x2="340" y2="128"/>
        <circle cx="344" cy="50" r="3.5" fill="var(--surface)"/>
        <circle cx="344" cy="128" r="3.5" fill="var(--surface)"/>
        <text x="362" y="92" class="edname" fill="var(--accent)" stroke="none">Vₛ</text>
      </g>`,
      420,
      152,
      isBp ? 'Filtre RLC passe-bande' : 'Filtre RLC passe-bas 2e ordre'
    );
  }

  if (type === 'aop_inv' || type === 'aop_noninv') {
    const R1 = esc(p.R1 || 'R₁');
    const R2 = esc(p.R2 || 'R₂');
    const inv = type === 'aop_inv';
    return wrap(
      `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="210,55 210,125 282,90" fill="var(--surface-2)"/>
        <text x="219" y="79" class="edname" stroke="none">−</text>
        <text x="219" y="111" class="edname" stroke="none">+</text>
        <line x1="168" y1="74" x2="210" y2="74"/>
        <circle cx="168" cy="74" r="3" fill="currentColor"/>
        <line x1="168" y1="74" x2="168" y2="30"/><line x1="168" y1="30" x2="208" y2="30"/>
        <rect x="208" y="19" width="56" height="22" rx="2" stroke="var(--accent)"/>
        <text x="236" y="13" text-anchor="middle" class="edlab" fill="var(--accent)" stroke="none">${R2}</text>
        <line x1="264" y1="30" x2="312" y2="30"/><line x1="312" y1="30" x2="312" y2="90"/>
        <line x1="282" y1="90" x2="352" y2="90"/>
        <circle cx="312" cy="90" r="3" fill="currentColor"/>
        <circle cx="356" cy="90" r="3.5" fill="var(--surface)"/>
        <text x="368" y="94" class="edname" fill="var(--accent)" stroke="none">Vₛ</text>
        <rect x="82" y="63" width="56" height="22" rx="2"/>
        <text x="110" y="56" text-anchor="middle" class="edlab" fill="currentColor" stroke="none">${R1}</text>
        <line x1="138" y1="74" x2="168" y2="74"/>
        ${
          inv
            ? `<line x1="48" y1="74" x2="82" y2="74"/><circle cx="44" cy="74" r="3.5" fill="var(--surface)"/><text x="18" y="78" class="edname" stroke="none">Vₑ</text><line x1="184" y1="106" x2="210" y2="106"/><line x1="184" y1="106" x2="184" y2="136"/><line x1="172" y1="136" x2="196" y2="136"/><line x1="176" y1="142" x2="192" y2="142"/>`
            : `<line x1="60" y1="74" x2="82" y2="74"/><line x1="60" y1="74" x2="60" y2="136"/><line x1="48" y1="136" x2="72" y2="136"/><line x1="52" y1="142" x2="68" y2="142"/><line x1="48" y1="106" x2="210" y2="106"/><circle cx="44" cy="106" r="3.5" fill="var(--surface)"/><text x="18" y="110" class="edname" stroke="none">Vₑ</text>`
        }
      </g>`,
      420,
      154,
      inv ? 'Amplificateur opérationnel inverseur' : 'Amplificateur opérationnel non-inverseur'
    );
  }

  return '';
}

export interface BodeState {
  gain0: number; // Gain at lowest decade (dB)
  slopeLeft: number; // Slope before fc (dB/dec): -40, -20, 0, +20, +40
  slopeRight: number; // Slope after fc (dB/dec): -40, -20, 0, +20, +40
  fcDec: number; // Breakpoint decade index (0..nDec-1)
}

export function bodeInit(u: any): BodeState {
  const nDec = (u.decades || ['10', '100', '1k', '10k', '100k']).length;
  return {
    gain0: typeof u.initGain === 'number' ? u.initGain : 0,
    slopeLeft: typeof u.initSlopeLeft === 'number' ? u.initSlopeLeft : 0,
    slopeRight: typeof u.initSlopeRight === 'number' ? u.initSlopeRight : 0,
    fcDec: typeof u.initFcDec === 'number' ? u.initFcDec : Math.floor(nDec / 2),
  };
}

function bodeValueAt(s: BodeState, dec: number): number {
  const refGainAtFc = s.gain0 + s.slopeLeft * s.fcDec;
  if (dec <= s.fcDec) return s.gain0 + s.slopeLeft * dec;
  return refGainAtFc + s.slopeRight * (dec - s.fcDec);
}

export function bodeSvg(u: any, s: BodeState, k: string, opts: { ref?: BodeState; ro?: boolean } = {}): string {
  const decades: string[] = u.decades || ['10 Hz', '100 Hz', '1 kHz', '10 kHz', '100 kHz'];
  const n = decades.length;
  const minDb = typeof u.minDb === 'number' ? u.minDb : -60;
  const maxDb = typeof u.maxDb === 'number' ? u.maxDb : 40;
  const W = 540;
  const H = 250;
  const L = 58;
  const R = 24;
  const T = 20;
  const B = 38;
  const pw = W - L - R;
  const ph = H - T - B;
  const xOf = (d: number) => L + (pw * d) / Math.max(1, n - 1);
  const yOf = (db: number) => {
    const clamped = Math.max(minDb - 6, Math.min(maxDb + 6, db));
    return T + ph * (1 - (clamped - minDb) / Math.max(1, maxDb - minDb));
  };

  let g = '';
  // Horizontal dB grid
  for (let db = minDb; db <= maxDb; db += 20) {
    const y = yOf(db);
    const isZero = db === 0;
    g += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="${isZero ? 'currentColor' : 'var(--line)'}" stroke-width="${isZero ? 1.3 : 1}" ${isZero ? 'opacity=".55"' : 'stroke-dasharray="3 4"'}/>`;
    g += `<text x="${L - 8}" y="${y + 4}" text-anchor="end" class="edpl" opacity=".8">${db} dB</text>`;
  }
  // Vertical decade grid + clickable breakpoint zones
  decades.forEach((lab, i) => {
    const x = xOf(i);
    g += `<line x1="${x}" y1="${T}" x2="${x}" y2="${H - B}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${x}" y="${H - 14}" text-anchor="middle" class="edpl">${esc(lab)}</text>`;
  });

  // Reference curve (during correction)
  if (opts.ref) {
    const refPts = Array.from({ length: n }, (_, i) => `${xOf(i).toFixed(1)},${yOf(bodeValueAt(opts.ref!, i)).toFixed(1)}`).join(' ');
    g += `<polyline points="${refPts}" fill="none" stroke="var(--good)" stroke-width="3" stroke-dasharray="7 5"/>`;
    const rfx = xOf(opts.ref.fcDec);
    const rfy = yOf(bodeValueAt(opts.ref, opts.ref.fcDec));
    g += `<circle cx="${rfx}" cy="${rfy}" r="6" fill="var(--good)" opacity=".85"/>`;
  }

  // Student asymptotic curve
  const pts = Array.from({ length: n }, (_, i) => `${xOf(i).toFixed(1)},${yOf(bodeValueAt(s, i)).toFixed(1)}`).join(' ');
  g += `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`;
  const fx = xOf(s.fcDec);
  const fy = yOf(bodeValueAt(s, s.fcDec));
  g += `<line x1="${fx}" y1="${T}" x2="${fx}" y2="${H - B}" stroke="var(--warm)" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  g += `<circle cx="${fx}" cy="${fy}" r="6.5" fill="var(--warm)" stroke="var(--surface)" stroke-width="2"/>`;
  g += `<text x="${Math.min(W - R - 34, fx + 8)}" y="${Math.max(T + 14, fy - 10)}" class="edlab" fill="var(--warm)">f_c = ${esc(decades[s.fcDec])}</text>`;
  g += `<text x="${L + 6}" y="${T + 13}" class="edpl" opacity=".75">Gain asymptotique G(dB) vs log(f)</text>`;

  return `<div class="edcv${opts.ro ? ' ro' : ''}"><svg class="edsvg" id="edsvg-${esc(k)}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme de Bode interactif">${g}</svg></div>`;
}

export function bodeWidget(u: any, k: string, s: BodeState): string {
  const decades: string[] = u.decades || ['10 Hz', '100 Hz', '1 kHz', '10 kHz', '100 kHz'];
  const slopes = [-40, -20, 0, 20, 40];
  const gains: number[] = u.gainChoices || [-20, -6, 0, 6, 12, 20, 40];
  let h = u.circuit ? analogCircuitSvg(u.circuit, u.circuitParams) : '';
  h += bodeSvg(u, s, k, {});
  h += '<div class="edpn">';
  h += '<div class="edrow"><label>Fréquence de cassure f<sub>c</sub></label><div class="edtb" style="margin:0">';
  decades.forEach((lab, i) => {
    h += `<button type="button" class="edb${s.fcDec === i ? ' on' : ''}" data-subed="bode|${k}|fc|${i}">${esc(lab)}</button>`;
  });
  h += '</div></div>';
  h += '<div class="edrow"><label>Pente avant f<sub>c</sub> (dB/déc)</label><div class="edtb" style="margin:0">';
  slopes.forEach((sl) => {
    h += `<button type="button" class="edb${s.slopeLeft === sl ? ' on' : ''}" data-subed="bode|${k}|sl|${sl}">${sl > 0 ? '+' + sl : sl}</button>`;
  });
  h += '</div></div>';
  h += '<div class="edrow"><label>Pente après f<sub>c</sub> (dB/déc)</label><div class="edtb" style="margin:0">';
  slopes.forEach((sl) => {
    h += `<button type="button" class="edb${s.slopeRight === sl ? ' on' : ''}" data-subed="bode|${k}|sr|${sl}">${sl > 0 ? '+' + sl : sl}</button>`;
  });
  h += '</div></div>';
  h += '<div class="edrow"><label>Gain au départ (' + esc(decades[0]) + ')</label><div class="edtb" style="margin:0">';
  gains.forEach((gv) => {
    h += `<button type="button" class="edb${s.gain0 === gv ? ' on' : ''}" data-subed="bode|${k}|g0|${gv}">${gv > 0 ? '+' + gv : gv} dB</button>`;
  });
  h += '</div></div>';
  h += '</div>';
  return h;
}

export function bodeFrac(u: any, s: BodeState): number {
  const ref: BodeState = u.ref;
  if (!ref) return 0;
  let score = 0;
  if (s.fcDec === ref.fcDec) score += 0.3;
  if (s.slopeLeft === ref.slopeLeft) score += 0.25;
  if (s.slopeRight === ref.slopeRight) score += 0.25;
  if (Math.abs(s.gain0 - ref.gain0) <= 1) score += 0.2;
  return Math.round(score * 100) / 100;
}

export function bodeCorr(u: any, k: string, s: BodeState, h: string): string {
  const f = bodeFrac(u, s);
  const decades: string[] = u.decades || ['10 Hz', '100 Hz', '1 kHz', '10 kHz', '100 kHz'];
  const ref: BodeState = u.ref;
  h += u.circuit ? analogCircuitSvg(u.circuit, u.circuitParams) : '';
  h += bodeSvg(u, s, k, { ref, ro: true });
  h += `<p class="fine" style="margin:2px 0 6px"><span style="color:var(--accent);font-weight:600">━━ Ton tracé</span> · <span style="color:var(--good);font-weight:600">┅┅ Asymptote attendue</span> (f<sub>c</sub> = ${esc(decades[ref.fcDec])}, pentes ${ref.slopeLeft}/${ref.slopeRight} dB/déc, départ ${ref.gain0} dB)</p>`;
  h += `<p class="dsres">${f === 1 ? 'Diagramme de Bode parfait !' : 'Score partiel : ' + Math.round(f * 100) + ' %'} · ${fpt(Math.round(u.pts * f * 100) / 100)} / ${fpt(u.pts)} pt</p>`;
  h += `<div class="dssol"><b>Correction.</b> ${u.sol}</div>`;
  return h;
}

/* ============================================================================
 * 2. TTSD — Interactive Signal, Spectrum & Shannon-Nyquist Aliasing Visualizer
 * ============================================================================ */

export interface SignalState {
  fe?: number; // Selected sampling frequency (for aliasing mode)
  vals: Record<string, string>; // Interactive parameter answers tied to the plot
}

export function signalInit(u: any): SignalState {
  return {
    fe: u.feChoices ? u.feChoices[0] : undefined,
    vals: {},
  };
}

export function signalPlotSvg(u: any, s: SignalState): string {
  const W = 540;
  const H = 200;
  const L = 48;
  const R = 20;
  const T = 22;
  const B = 32;
  const pw = W - L - R;
  const ph = H - T - B;
  const mode = u.plot || 'aliasing';
  const yMid = T + ph * 0.72;
  const xMid = L + pw / 2;

  let g = `<line x1="${L}" y1="${yMid}" x2="${W - R}" y2="${yMid}" stroke="currentColor" stroke-width="1.3" opacity=".6"/>`;
  g += `<line x1="${xMid}" y1="${T}" x2="${xMid}" y2="${H - B}" stroke="currentColor" stroke-width="1.2" opacity=".45"/>`;

  if (mode === 'aliasing') {
    const fmax = Number(u.fmax) || 4; // kHz
    const fe = Number(s.fe || (u.feChoices ? u.feChoices[0] : 10));
    const fSpan = Math.max(fmax * 3.5, fe * 1.6, 14);
    const xF = (f: number) => xMid + (f / fSpan) * (pw / 2);
    const hPeak = ph * 0.56;
    const aliased = fe < 2 * fmax;

    // Draw shifted replicas k = -2..2
    [-2, -1, 0, 1, 2].forEach((kIdx) => {
      const center = kIdx * fe;
      const x0 = xF(center - fmax);
      const xc = xF(center);
      const x1 = xF(center + fmax);
      const col = kIdx === 0 ? 'var(--accent)' : aliased ? 'var(--bad)' : 'var(--warm)';
      const op = kIdx === 0 ? 0.25 : 0.16;
      g += `<polygon points="${x0.toFixed(1)},${yMid} ${xc.toFixed(1)},${(yMid - hPeak).toFixed(1)} ${x1.toFixed(1)},${yMid}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-width="${kIdx === 0 ? 2.4 : 1.7}" ${kIdx === 0 ? '' : 'stroke-dasharray="5 3"'}/>`;
      if (Math.abs(center) <= fSpan * 0.92) {
        g += `<text x="${xc.toFixed(1)}" y="${H - 12}" text-anchor="middle" class="edpl">${kIdx === 0 ? '0' : (kIdx > 0 ? '+' : '') + kIdx + 'fₑ'}</text>`;
      }
    });
    // Nyquist limit markers ±fe/2
    const xNyqP = xF(fe / 2);
    const xNyqM = xF(-fe / 2);
    g += `<line x1="${xNyqP}" y1="${T}" x2="${xNyqP}" y2="${yMid}" stroke="var(--dim)" stroke-dasharray="3 3"/>`;
    g += `<line x1="${xNyqM}" y1="${T}" x2="${xNyqM}" y2="${yMid}" stroke="var(--dim)" stroke-dasharray="3 3"/>`;
    g += `<text x="${L + 4}" y="${T + 12}" class="edlab" fill="${aliased ? 'var(--bad)' : 'var(--good)'}">${aliased ? '⚠ REPLIEMENT SPECTRAL (fₑ < 2·f_max)' : '✓ Pas de repliement (fₑ ≥ 2·f_max)'}</text>`;
    g += `<text x="${W - R}" y="${T + 12}" text-anchor="end" class="edpl">f_max = ${fmax} ${esc(u.unit || 'kHz')} · fₑ = ${fe} ${esc(u.unit || 'kHz')}</text>`;
  } else if (mode === 'haar') {
    const y0 = T + ph * 0.5;
    const x = (t: number) => L + ((t + 0.5) / 2) * pw;
    const y = (v: number) => y0 - v * (ph * 0.38);
    g = `<line x1="${L}" y1="${y0}" x2="${W - R}" y2="${y0}" stroke="currentColor" stroke-width="1.3" opacity=".6"/>`;
    g += `<line x1="${x(0)}" y1="${T}" x2="${x(0)}" y2="${H - B}" stroke="currentColor" stroke-width="1.2" opacity=".45"/>`;
    g += `<polyline points="${x(-0.4)},${y(0)} ${x(0)},${y(0)} ${x(0)},${y(1)} ${x(0.5)},${y(1)} ${x(0.5)},${y(-1)} ${x(1)},${y(-1)} ${x(1)},${y(0)} ${x(1.4)},${y(0)}" fill="none" stroke="var(--accent)" stroke-width="2.8"/>`;
    g += `<text x="${x(0)}" y="${H - 10}" text-anchor="middle" class="edpl">0</text>`;
    g += `<text x="${x(0.5)}" y="${H - 10}" text-anchor="middle" class="edpl">T/2</text>`;
    g += `<text x="${x(1)}" y="${H - 10}" text-anchor="middle" class="edpl">T</text>`;
    g += `<text x="${x(0) - 8}" y="${y(1) + 4}" text-anchor="end" class="edpl">+A</text>`;
    g += `<text x="${x(0) - 8}" y="${y(-1) + 4}" text-anchor="end" class="edpl">−A</text>`;
    g += `<text x="${L + 6}" y="${T + 12}" class="edlab" fill="var(--accent)">Ondelette de Haar ψ(t)</text>`;
  } else if (mode === 'rect' || mode === 'clock') {
    const x = (t: number) => xMid + (t / 3) * (pw / 2);
    const y1 = T + ph * 0.16;
    if (mode === 'rect') {
      g += `<polygon points="${x(-0.8)},${yMid} ${x(-0.8)},${y1} ${x(0.8)},${y1} ${x(0.8)},${yMid}" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2.6"/>`;
      g += `<text x="${x(-0.8)}" y="${H - 10}" text-anchor="middle" class="edpl">−τ/2</text><text x="${x(0.8)}" y="${H - 10}" text-anchor="middle" class="edpl">+τ/2</text><text x="${xMid}" y="${H - 10}" text-anchor="middle" class="edpl">0</text>`;
      g += `<text x="${L + 6}" y="${T + 12}" class="edlab" fill="var(--accent)">Porte Π_τ(t)  ⇄  TF : τ·sinc(f·τ)</text>`;
    } else {
      let pts = '';
      for (let k = -2; k <= 1; k++) {
        const a = k * 1.2;
        const b = a + 0.6;
        const c = a + 1.2;
        pts += `${x(a).toFixed(1)},${yMid} ${x(a).toFixed(1)},${y1} ${x(b).toFixed(1)},${y1} ${x(b).toFixed(1)},${yMid} ${x(c).toFixed(1)},${yMid} `;
      }
      g += `<polyline points="${pts.trim()}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
      g += `<text x="${L + 6}" y="${T + 12}" class="edlab" fill="var(--accent)">Signal horloge périodique (rapport cyclique α = τ/T₀)</text>`;
      g += `<text x="${xMid}" y="${H - 10}" text-anchor="middle" class="edpl">0</text><text x="${x(1.2)}" y="${H - 10}" text-anchor="middle" class="edpl">T₀</text><text x="${x(-1.2)}" y="${H - 10}" text-anchor="middle" class="edpl">−T₀</text>`;
    }
  } else if (mode === 'dirac_comb') {
    const diracs: Array<{ x: number; a: number; l?: string }> = u.impulses || [
      { x: -2, a: 0.4, l: '-2f₀' },
      { x: -1, a: 0.75, l: '-f₀' },
      { x: 0, a: 1, l: '0' },
      { x: 1, a: 0.75, l: '+f₀' },
      { x: 2, a: 0.4, l: '+2f₀' },
    ];
    const maxX = Math.max(2.5, ...diracs.map((d) => Math.abs(d.x) + 0.5));
    const xF = (v: number) => xMid + (v / maxX) * (pw / 2);
    diracs.forEach((d) => {
      const px = xF(d.x);
      const py = yMid - d.a * ph * 0.55;
      g += `<line x1="${px}" y1="${yMid}" x2="${px}" y2="${py}" stroke="var(--accent)" stroke-width="2.6"/>`;
      g += `<polygon points="${px - 4},${py + 7} ${px + 4},${py + 7} ${px},${py}" fill="var(--accent)"/>`;
      if (d.l) g += `<text x="${px}" y="${H - 10}" text-anchor="middle" class="edpl">${esc(d.l)}</text>`;
    });
    g += `<text x="${L + 6}" y="${T + 12}" class="edlab" fill="var(--accent)">${esc(u.plotTitle || 'Spectre de raies (impulsions de Dirac)')}</text>`;
  }

  return `<div class="edcv ro"><svg class="edsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Visualiseur de signal TTSD">${g}</svg></div>`;
}

export function signalWidget(u: any, k: string, s: SignalState): string {
  let h = signalPlotSvg(u, s);
  if (u.feChoices && u.feChoices.length) {
    h += '<div class="edpn"><div class="edrow"><label>Tester une fréquence d\'échantillonnage f<sub>e</sub> (' + esc(u.unit || 'kHz') + ')</label><div class="edtb" style="margin:0">';
    u.feChoices.forEach((fe: number) => {
      h += `<button type="button" class="edb${s.fe === fe ? ' on' : ''}" data-subed="signal|${k}|fe|${fe}">${fe} ${esc(u.unit || 'kHz')}</button>`;
    });
    h += '</div></div></div>';
  }
  if (u.items && u.items.length) {
    h += '<div class="dsnums">';
    u.items.forEach((it: any, i: number) => {
      const v = s.vals[String(i)] || '';
      h += `<span class="nl">${it.label}</span><input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-subin="signal|${k}|${i}" value="${esc(v)}">`;
    });
    h += '</div><p class="fine" style="margin:0">Utilise le graphe ci-dessus puis complète les valeurs calculées (entier, décimal ou fraction).</p>';
  }
  return h;
}

export function signalFrac(u: any, s: SignalState): number {
  let total = 0;
  let ok = 0;
  if (typeof u.expectFe === 'number') {
    total += 1;
    if (s.fe === u.expectFe) ok += 1;
  }
  (u.items || []).forEach((it: any, i: number) => {
    total += 1;
    const got = pn(s.vals[String(i)]);
    const want = pn(it.ans);
    if (got !== null && want !== null && Math.abs(got - want) <= Math.max(1e-5, Math.abs(want) * 0.02)) {
      ok += 1;
    }
  });
  return total ? Math.round((ok / total) * 100) / 100 : 0;
}

export function signalCorr(u: any, _k: string, s: SignalState, h: string): string {
  const f = signalFrac(u, s);
  const viewState = typeof u.expectFe === 'number' ? { ...s, fe: u.expectFe } : s;
  h += signalPlotSvg(u, viewState);
  if (u.items && u.items.length) {
    h += '<div class="dsnums">';
    u.items.forEach((it: any, i: number) => {
      const v = s.vals[String(i)] || '';
      const got = pn(v);
      const want = pn(it.ans);
      const isOk = got !== null && want !== null && Math.abs(got - want) <= Math.max(1e-5, Math.abs(want) * 0.02);
      h += `<span class="nl">${it.label}</span><input type="text" readonly class="${isOk ? 'good' : 'wrong'}" value="${esc(v)}">`;
    });
    h += '</div>';
  }
  h += `<p class="dsres">${f === 1 ? 'Tout est juste !' : 'Attendu : ' + (typeof u.expectFe === 'number' ? 'fₑ = ' + u.expectFe + ' ' + (u.unit || 'kHz') + (u.items?.length ? ' · ' : '') : '') + (u.items || []).map((it: any) => it.ans).join(' ; ')} · ${fpt(Math.round(u.pts * f * 100) / 100)} / ${fpt(u.pts)} pt</p>`;
  h += `<div class="dssol"><b>Correction.</b> ${u.sol}</div>`;
  return h;
}

/* ============================================================================
 * 3. COMPUTER ARCHITECTURE — Interactive 5-Stage RISC-V Pipeline Grid
 * ============================================================================ */

export const PIPE_STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB', 'STALL', ''] as const;

export interface PipelineState {
  brush: string; // Active brush stage ('IF' | 'ID' | 'EX' | 'MEM' | 'WB' | 'STALL' | '')
  cells: Record<string, string>; // "row:col" -> stage
}

export function pipelineInit(u: any): PipelineState {
  const cells: Record<string, string> = {};
  if (u.prefill) {
    Object.entries(u.prefill).forEach(([k, v]) => {
      cells[k] = String(v);
    });
  }
  return { brush: 'IF', cells };
}

export function pipelineWidget(u: any, k: string, s: PipelineState, ro = false): string {
  const insns: string[] = u.insns || [];
  const cycles: number = u.cycles || 8;
  let h = '';
  if (!ro) {
    h += `<div class="edtb" style="align-items:center"><span class="fine" style="margin:0 4px 0 0">Étage actif :</span>`;
    ['IF', 'ID', 'EX', 'MEM', 'WB', 'STALL', ''].forEach((st) => {
      const label = st === '' ? 'Effacer' : st === 'STALL' ? 'STALL (bulle)' : st;
      h += `<button type="button" class="edb${s.brush === st ? ' on' : ''}${st === 'STALL' ? ' danger' : ''}" data-subed="pipeline|${k}|brush|${st}">${label}</button>`;
    });
    h += `<button type="button" class="edb ghost" data-subed="pipeline|${k}|clear|1">Réinitialiser</button></div>`;
  }
  h += '<div class="gwrap"><table class="gtab pipetab"><tr><th style="text-align:left">Instruction</th>';
  for (let c = 1; c <= cycles; c++) h += `<th>C${c}</th>`;
  h += '</tr>';
  insns.forEach((ins, r) => {
    h += `<tr><th class="pipe-ins"><code>${esc(ins)}</code></th>`;
    for (let c = 0; c < cycles; c++) {
      const ck = `${r}:${c}`;
      const fixed = u.prefill && u.prefill[ck] !== undefined;
      const val = s.cells[ck] || '';
      const want = u.ans?.[r]?.[c] ?? '';
      let cls = 'pipecell';
      if (val) cls += ' st-' + val.toLowerCase();
      if (ro) {
        if (val === want) cls += want ? ' pgood' : '';
        else cls += ' pbad';
      }
      if (fixed && !ro) {
        h += `<td><span class="${cls} pfix">${esc(val)}</span></td>`;
      } else if (ro) {
        h += `<td><span class="${cls}">${esc(val || '·')}</span></td>`;
      } else {
        h += `<td><button type="button" class="${cls}" data-subed="pipeline|${k}|cell|${r}:${c}" aria-label="Instruction ${r + 1} cycle ${c + 1}">${esc(val || '·')}</button></td>`;
      }
    }
    h += '</tr>';
  });
  h += '</table></div>';
  if (!ro) {
    h += `<p class="fine" style="margin:2px 0 0">${u.forward ? 'Mode : <b>avec forwarding (court-circuit EX→EX / MEM→EX)</b>.' : 'Mode : <b>sans forwarding</b> (insère STALL jusqu\'au WB de l\'instruction productrice).'} Clique un étage puis clique dans la grille (ou re-clique une case pour effacer).</p>`;
  }
  return h;
}

export function pipelineFrac(u: any, s: PipelineState): number {
  const ans: string[][] = u.ans || [];
  let total = 0;
  let ok = 0;
  ans.forEach((row, r) => {
    row.forEach((want, c) => {
      const ck = `${r}:${c}`;
      if (u.prefill && u.prefill[ck] !== undefined) return;
      const got = (s.cells[ck] || '').toUpperCase();
      const w = String(want || '').toUpperCase();
      if (w !== '' || got !== '') {
        total += 1;
        if (got === w) ok += 1;
      }
    });
  });
  return total ? Math.round((ok / total) * 100) / 100 : 0;
}

export function pipelineCorr(u: any, k: string, s: PipelineState, h: string): string {
  const f = pipelineFrac(u, s);
  h += pipelineWidget(u, k, s, true);
  h += `<p class="dsres">${f === 1 ? 'Pipeline exact !' : Math.round(f * 100) + ' % des étages justes'} · ${fpt(Math.round(u.pts * f * 100) / 100)} / ${fpt(u.pts)} pt</p>`;
  if (f < 1 && u.ans) {
    const expState: PipelineState = { brush: '', cells: {} };
    (u.ans as string[][]).forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) expState.cells[`${r}:${c}`] = val;
      });
    });
    h += `<details><summary class="fine">Voir le diagramme de pipeline attendu</summary>${pipelineWidget(u, k + '_ref', expState, true)}</details>`;
  }
  h += `<div class="dssol"><b>Correction.</b> ${u.sol}</div>`;
  return h;
}

/* ============================================================================
 * 4. ENGLISH S5 — Interactive TOEIC Cloze & Frenglish Spot-and-Fix
 * ============================================================================ */

export interface ClozeState {
  blanks: Record<string, string>;
}

export function clozeInit(_u: any): ClozeState {
  return { blanks: {} };
}

function normEng(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, ' ');
}

function blankMatches(got: string, ans: string | string[]): boolean {
  const g = normEng(got);
  if (!g) return false;
  const list = Array.isArray(ans) ? ans : [ans];
  return list.some((a) => normEng(a) === g);
}

export function clozeWidget(u: any, k: string, s: ClozeState, ro = false): string {
  const blanks: Array<{ before?: string; after?: string; bad?: string; ans: string | string[]; choices?: string[]; hint?: string }> =
    u.blanks || [];
  let h = '<div class="cloze-box">';
  blanks.forEach((b, idx) => {
    const val = s.blanks[String(idx)] || '';
    const isOk = ro ? blankMatches(val, b.ans) : false;
    h += '<p class="cloze-line">';
    if (b.before) h += esc(b.before) + ' ';
    if (b.bad) h += `<del class="cloze-bad">${esc(b.bad)}</del> → `;
    if (b.choices && b.choices.length && !ro) {
      h += '<span class="cloze-chips">';
      b.choices.forEach((ch) => {
        const active = normEng(val) === normEng(ch);
        h += `<button type="button" class="edb${active ? ' on' : ''}" data-subed="cloze|${k}|pick|${idx}:${esc(ch)}">${esc(ch)}</button>`;
      });
      h += '</span>';
    } else {
      const cls = ro ? (isOk ? 'cloze-in good' : 'cloze-in wrong') : 'cloze-in';
      const expectedFirst = Array.isArray(b.ans) ? b.ans[0] : b.ans;
      const w = Math.max(
        14,
        Math.min(36, Math.max(String(expectedFirst).length, String(b.hint || '').length) + 4)
      );
      h += `<input type="text" autocomplete="off" spellcheck="false" class="${cls}" style="width:${w}ch" data-subin="cloze|${k}|${idx}" placeholder="${esc(b.hint || '...')}" value="${esc(val)}"${ro ? ' readonly' : ''}>`;
      if (ro && !isOk) {
        h += ` <span class="cloze-fix">✓ ${esc(expectedFirst)}</span>`;
      }
    }
    if (b.after) h += ' ' + esc(b.after);
    h += '</p>';
  });
  h += '</div>';
  if (!ro) {
    h += `<p class="fine" style="margin:4px 0 0">${u.mode === 'fix' ? 'Corrige les tournures fautives (Frenglish) par la formulation anglaise naturelle.' : 'Complète chaque trou (sensible au vocabulaire/grammaire, pas aux majuscules).'}</p>`;
  }
  return h;
}

export function clozeFrac(u: any, s: ClozeState): number {
  const blanks: Array<{ ans: string | string[] }> = u.blanks || [];
  if (!blanks.length) return 0;
  let ok = 0;
  blanks.forEach((b, idx) => {
    if (blankMatches(s.blanks[String(idx)] || '', b.ans)) ok += 1;
  });
  return Math.round((ok / blanks.length) * 100) / 100;
}

export function clozeCorr(u: any, k: string, s: ClozeState, h: string): string {
  const f = clozeFrac(u, s);
  h += clozeWidget(u, k, s, true);
  h += `<p class="dsres">${f === 1 ? 'Parfait !' : Math.round(f * 100) + ' % juste'} · ${fpt(Math.round(u.pts * f * 100) / 100)} / ${fpt(u.pts)} pt</p>`;
  h += `<div class="dssol"><b>Correction.</b> ${u.sol}</div>`;
  return h;
}

/* ============================================================================
 * Unified Dispatchers for Coach Runtime
 * ============================================================================ */

export function isSubjectKind(kind: unknown): kind is 'bode' | 'signal' | 'pipeline' | 'cloze' {
  return kind === 'bode' || kind === 'signal' || kind === 'pipeline' || kind === 'cloze';
}

export function subInit(u: any): any {
  if (u.kind === 'bode') return bodeInit(u);
  if (u.kind === 'signal') return signalInit(u);
  if (u.kind === 'pipeline') return pipelineInit(u);
  if (u.kind === 'cloze') return clozeInit(u);
  return {};
}

export function subWidget(u: any, k: string, s: any): string {
  if (u.kind === 'bode') return bodeWidget(u, k, s);
  if (u.kind === 'signal') return signalWidget(u, k, s);
  if (u.kind === 'pipeline') return pipelineWidget(u, k, s, false);
  if (u.kind === 'cloze') return clozeWidget(u, k, s, false);
  return '';
}

export function subFrac(u: any, s: any): number {
  if (u.kind === 'bode') return bodeFrac(u, s);
  if (u.kind === 'signal') return signalFrac(u, s);
  if (u.kind === 'pipeline') return pipelineFrac(u, s);
  if (u.kind === 'cloze') return clozeFrac(u, s);
  return 0;
}

export function subCorr(u: any, k: string, s: any, h: string): string {
  if (u.kind === 'bode') return bodeCorr(u, k, s, h);
  if (u.kind === 'signal') return signalCorr(u, k, s, h);
  if (u.kind === 'pipeline') return pipelineCorr(u, k, s, h);
  if (u.kind === 'cloze') return clozeCorr(u, k, s, h);
  return h;
}

export function subAct(u: any, s: any, act: string, arg: string): boolean {
  if (u.kind === 'bode') {
    if (act === 'fc') s.fcDec = Number(arg);
    else if (act === 'sl') s.slopeLeft = Number(arg);
    else if (act === 'sr') s.slopeRight = Number(arg);
    else if (act === 'g0') s.gain0 = Number(arg);
    else return false;
    return true;
  }
  if (u.kind === 'signal') {
    if (act === 'fe') {
      s.fe = Number(arg);
      return true;
    }
    return false;
  }
  if (u.kind === 'pipeline') {
    if (act === 'brush') {
      s.brush = arg;
      return true;
    }
    if (act === 'clear') {
      s.cells = {};
      if (u.prefill) {
        Object.entries(u.prefill).forEach(([ck, v]) => {
          s.cells[ck] = String(v);
        });
      }
      return true;
    }
    if (act === 'cell') {
      if (u.prefill && u.prefill[arg] !== undefined) return false;
      const cur = s.cells[arg] || '';
      s.cells[arg] = cur === s.brush ? '' : s.brush;
      return true;
    }
    return false;
  }
  if (u.kind === 'cloze') {
    if (act === 'pick') {
      const idx = arg.indexOf(':');
      if (idx > 0) {
        const bi = arg.slice(0, idx);
        const val = arg.slice(idx + 1);
        s.blanks[bi] = val;
        return true;
      }
    }
    return false;
  }
  return false;
}

export function subInput(u: any, s: any, idx: string, value: string): void {
  if (u.kind === 'signal') {
    s.vals[idx] = value;
  } else if (u.kind === 'cloze') {
    s.blanks[idx] = value;
  }
}
