/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Automatic document classification & subject-adapted training generator.
 * - Uses Gemini 4 Hydrogen (`gemini-4-hydrogen`) via `/api/ingest-document` (server-side API key)
 *   or optional client-side `@google/genai` fallback if the admin supplies a personal key on static hosts.
 * - Detects which of the 8 INSA Rennes ESET 3A subjects a new document belongs to.
 * - Creates or enriches subject-adapted trainings using the native interactive engines
 *   (`bode`, `signal`, `pipeline`, `cloze`, `fsm`, `circ`, `chrono`, `asm`, `cmd`, `mat`, `grid`, `nums`, `num`, `qcm`).
 */

import { GoogleGenAI } from '@google/genai';
import type { CoachModuleRow } from '../coach/supabaseBackend';
import type { ExtractedDocument } from './documentExtract';

export const GEMINI_MODEL = 'gemini-4-hydrogen';
const LOCAL_KEY_STORAGE = 'coach-partiels-gemini-key.v1';

export interface SubjectDescriptor {
  key: 'c' | 'm' | 'e' | 'p' | 't' | 'a' | 'r' | 'g';
  name: string;
  chapters: Array<[string, string]>;
  preferredKinds: string[];
  keywords: string[];
}

export const SUBJECT_CATALOG: SubjectDescriptor[] = [
  {
    key: 'c',
    name: 'Langage C',
    chapters: [
      ['es', 'Entrées-sorties & formats'],
      ['tab', 'Tableaux et chaînes'],
      ['ptr', 'Pointeurs'],
      ['st', 'Structures'],
      ['en', 'Énumérations'],
    ],
    preferredKinds: ['quiz_code_c'],
    keywords: ['printf', 'scanf', 'malloc', 'pointeur', 'struct', 'enum', 'char', 'gcc', 'langage c'],
  },
  {
    key: 'm',
    name: 'Maths',
    chapters: [
      ['esp', 'Espaces vectoriels et familles'],
      ['app', 'Applications linéaires'],
      ['mat', 'Matrices'],
      ['det', 'Déterminant'],
      ['inv', "Inverse d'une matrice"],
      ['bas', 'Changement de base'],
      ['pol', 'Polynômes'],
      ['vp', 'Valeurs propres et diagonalisation'],
    ],
    preferredKinds: ['mat', 'diag', 'nums', 'num', 'qcm'],
    keywords: ['matrice', 'déterminant', 'gauss', 'jordan', 'valeurs propres', 'diagonalisation', 'noyau', 'polynôme', 'algèbre'],
  },
  {
    key: 'e',
    name: 'ELEN numérique',
    chapters: [
      ['c1', 'Fonctions logiques & Karnaugh'],
      ['c2', 'Représentation et codage (CA2, virgule fixe, half)'],
      ['c3', 'Composants asynchrones (MUX, ROM, additionneur)'],
      ['c4', 'Mémoires & adressage'],
      ['c5', 'Électronique synchrone (bascules, temps)'],
      ['c6', "Machines d'états (Moore / Mealy)"],
      ['c7', 'Compteurs & chronogrammes'],
    ],
    preferredKinds: ['fsm', 'circ', 'chrono', 'grid', 'nums', 'num', 'qcm'],
    keywords: ['karnaugh', 'moore', 'mealy', 'bascule', 'chronogramme', 'logigramme', 'complément à 2', 'half', 'virgule fixe', 'compteur'],
  },
  {
    key: 'p',
    name: 'Prog syst',
    chapters: [
      ['c1', 'Shell (redirections, globbing, droits, scripts)'],
      ['c2', 'Makefile'],
      ['c3', 'RISC-V : registres, mémoire, calculs'],
      ['c4', 'RISC-V : données et directives'],
      ['c5', 'RISC-V : contrôle et appels système'],
    ],
    preferredKinds: ['asm', 'cmd', 'grid', 'num', 'qcm'],
    keywords: ['shell', 'bash', 'makefile', 'chmod', 'grep', 'glob', 'risc-v', 'assembleur', 'ecall', '.data', '.text'],
  },
  {
    key: 'r',
    name: 'Architecture des processeurs',
    chapters: [
      ['c1', 'CM1 · Calculateur câblé (UT / UC)'],
      ['c2', 'CM2 · Processeurs à instructions (ISA)'],
      ['c3', 'CM3 · Performance & pipeline 5 étages'],
      ['c4', 'CM4 · Hiérarchie mémoire & caches'],
    ],
    preferredKinds: ['pipeline', 'grid', 'asm', 'nums', 'num', 'qcm'],
    keywords: ['pipeline', 'forwarding', 'aléa', 'raw', 'stall', 'cpi', 'cache', 'tag', 'index', 'offset', 'amat', 'ual', 'ut/uc', 'isa', 'micro-code'],
  },
  {
    key: 'a',
    name: 'Électronique analogique',
    chapters: [
      ['c1', 'Analyse de réseaux & Bode'],
      ['c2', 'Amplificateurs opérationnels (AOP)'],
      ['c3', 'Diodes et redressement'],
      ['c4', 'Transistors bipolaires (BJT)'],
      ['c5', 'Transistors MOS & CMOS'],
      ['c6', 'Structures intégrées (étage différentiel, miroir)'],
    ],
    preferredKinds: ['bode', 'nums', 'num', 'grid', 'qcm'],
    keywords: ['bode', 'aop', 'amplificateur', 'filtre', 'rc', 'rlc', 'diode', 'zener', 'transistor', 'bipolaire', 'bjt', 'mos', 'cmos', 'thévenin', 'slew rate', 'gbp'],
  },
  {
    key: 't',
    name: 'Traitement du signal (TTSD)',
    chapters: [
      ['c1', 'Signaux, énergie et puissance'],
      ['c2', 'Séries de Fourier'],
      ['c3', 'Transformée de Fourier & distributions'],
      ['c4', 'Convolution, corrélation et filtrage'],
      ['c5', 'Échantillonnage et séquences discrètes'],
      ['c6', 'TFTD, TFD et changement de cadence'],
    ],
    preferredKinds: ['signal', 'grid', 'nums', 'num', 'qcm'],
    keywords: ['fourier', 'spectre', 'dirac', 'convolution', 'corrélation', 'shannon', 'nyquist', 'repliement', 'tftd', 'tfd', 'fft', 'haar', 'parseval', 'ttsd'],
  },
  {
    key: 'g',
    name: 'Anglais',
    chapters: [
      ['c1', 'Indénombrables, articles & quantifieurs'],
      ['c2', 'Relatifs, ordre des mots & adjectifs composés'],
      ['c3', 'Prépositions, verbes pièges & faux amis'],
      ['c4', 'Vocabulaire TOEIC officiel'],
    ],
    preferredKinds: ['cloze', 'qcm'],
    keywords: ['toeic', 'english', 'frenglish', 'grammar', 'vocabulary', 'advice', 'whereas', 'despite', 'although', 'phrasal', 'summary'],
  },
];

export interface ExistingCatalogContext {
  dsBySubject: Record<string, Array<{ id: string; title: string; chap?: string; th?: boolean; ann?: boolean }>>;
  memoBySubject: Record<string, Array<{ id: string; title: string }>>;
}

export interface IngestionPlan {
  subject_key: SubjectDescriptor['key'];
  subject_name: string;
  confidence: number;
  reasoning: string;
  doc_type: 'cm' | 'td' | 'tp' | 'annale' | 'vocab' | 'fiche';
  detected_topics: string[];
  action_summary: string;
  interfaces_used: string[];
  modules: Array<Omit<CoachModuleRow, 'document_id' | 'created_at'>>;
}

export function getSavedGeminiKey(): string {
  try {
    return localStorage.getItem(LOCAL_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setSavedGeminiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(LOCAL_KEY_STORAGE, key.trim());
    else localStorage.removeItem(LOCAL_KEY_STORAGE);
  } catch {
    // ignore storage errors
  }
}

export async function checkServerGeminiAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/ingest-status');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.available);
  } catch {
    return false;
  }
}

export function buildIngestionPrompt(
  doc: ExtractedDocument,
  existing: ExistingCatalogContext,
  userHint?: string
): string {
  const subjectsSummary = SUBJECT_CATALOG.map((s) => {
    const existingDs = (existing.dsBySubject[s.key] || [])
      .slice(0, 8)
      .map((d) => `${d.id} ("${d.title}"${d.chap ? `, chap=${d.chap}` : ''}${d.ann ? ', annale' : ''})`)
      .join('; ');
    const existingMemos = (existing.memoBySubject[s.key] || [])
      .map((m) => `${m.id} ("${m.title}")`)
      .join('; ');
    return `- key="${s.key}" (${s.name})
  Chapitres: ${s.chapters.map(([k, n]) => `${k}=${n}`).join(' | ')}
  Interfaces recommandées: ${s.preferredKinds.join(', ')}
  Modules existants: ${existingDs || 'aucun'}
  Mémos existants: ${existingMemos || 'aucun'}`;
  }).join('\n');

  return `Tu es le moteur pédagogique de "Coach Partiels — INSA Rennes ESET 3A".
On vient d'ajouter un nouveau document : "${doc.filename}" (${doc.summaryInfo}).
${userHint ? `Consigne spécifique de l'étudiant : "${userHint}"\n` : ''}
TÂCHES OBLIGATOIRES :
1. IDENTIFIE précisément à quelle matière ESET 3A (parmi les 8 ci-dessous) appartient ce document, son type (cm/td/tp/annale/vocab/fiche), et les chapitres exacts concernés.
2. COMPARE avec les modules et mémos existants de cette matière. Décide intelligemment de :
   - CRÉER ou ENRICHIR (operation="enrich" avec target_id si le doc complète clairement un entraînement/mémo existant, sinon operation="create") un entraînement interactif complet (DS blanc, annale corrigée ou atelier Par thème) utilisant les INTERFACES INTERACTIVES ADAPTÉES À LA MATIÈRE ET AU SUJET (pas seulement des QCM basiques !).
   - CRÉER des questions de Quiz rapide (4 à 8 questions ciblées sur le document).
   - ENRICHIR ou CRÉER une fiche Aide-mémoire avec les formules clés, méthodes et pièges du document.

CATALOGUE DES 8 MATIÈRES ESET 3A :
${subjectsSummary}

SCHÉMA DES INTERFACES INTERACTIVES NATIVES (choisis les plus pertinentes pour le document !) :
- Pour Électronique analogique (a) :
  * kind="bode" : { pts, kind:"bode", circuit:"rc_lp"|"rc_hp"|"rlc_lp"|"rlc_bp"|"aop_inv"|"aop_noninv", circuitParams:{R:"1kΩ",C:"100nF"}, decades:["10 Hz","100 Hz","1 kHz","10 kHz","100 kHz"], gainChoices:[-20,0,20], minDb:-60, maxDb:40, initGain:0, initSlopeLeft:0, initSlopeRight:0, initFcDec:1, ref:{gain0:0,slopeLeft:0,slopeRight:-20,fcDec:2}, q:"...", sol:"...", t:"c1", c:"..." }
  * kind="nums" / kind="num" pour calculs numériques précis (courants, tensions, gains, fréquences).
- Pour TTSD (t) :
  * kind="signal" : { pts, kind:"signal", plot:"aliasing"|"haar"|"rect"|"clock"|"dirac_comb", fmax:4, unit:"kHz", feChoices:[6,8,10,12], expectFe:8, items:[{label:"f_e,min (kHz) =", ans:"8"}], q:"...", sol:"...", t:"c5", c:"..." }
  * kind="grid" pour tables de convolution / échantillons / spectres ; kind="nums"/"num" pour valeurs moyennes/énergie/Fourier.
- Pour Architecture des processeurs (r) :
  * kind="pipeline" : { pts, kind:"pipeline", forward:true|false, cycles:8, insns:["lw x1, 0(x2)","add x3, x1, x4"], prefill:{"0:0":"IF","0:1":"ID","0:2":"EX","0:3":"MEM","0:4":"WB"}, ans:[["IF","ID","EX","MEM","WB","","",""],["","IF","ID","STALL","EX","MEM","WB",""]], q:"...", sol:"...", t:"c3", c:"..." }
  * kind="grid" pour décodage binaire RISC-V ou tables de Cache (Tag | Index | Offset | Hit/Miss).
  * kind="asm" pour exercices assembleur RISC-V exécutables.
- Pour Anglais (g) :
  * kind="cloze" : { pts, kind:"cloze", mode:"fix"|"toeic", blanks:[{before:"...", bad:"(optionnel si fix)", ans:["réponse1","synonyme"], after:"...", choices:["opt1","opt2","opt3","opt4"], hint:"..."}], q:"...", sol:"...", t:"c3"|"c4", c:"..." }
- Pour ELEN numérique (e) :
  * kind="grid" (Karnaugh, binaire/hexa, tables de vérité), kind="chrono" (eq:{ff:[{n:"Q",t:"D",d:"x"}],out:{}}), kind="nums", kind="num".
- Pour Prog syst (p) :
  * kind="cmd" ({ checks:[{re:"...", msg:"..."}], ph:"...", hint:"..." }), kind="asm" ({ tests:[{name:"...", regs:{a0:5}, exp:{regs:{a0:10}}}] }).
- Pour Maths (m) :
  * kind="mat" ({ label:"A⁻¹", n:2, m:2, ans:[["1","-1"],["-1","2"]] }), kind="nums", kind="num".
- Pour Langage C (c) :
  * Génère surtout des questions de code C dans quiz_questions avec { topic:"es"|"tab"|"ptr"|"st"|"en", concept:"...", code:"int main(void){...}", stdin:"", opts:["...","...","...","..."], ans:0, why:"..." } + fiche mémo.
- Et pour toute matière : question QCM { pts, q:"...", opts:["...","...","...","..."], ans:0, sol:"...", t:"c1", c:"..." }.

RÈGLES DE QUALITÉ STRICTES :
- Tous les calculs mathématiques et réponses doivent être 100% vérifiés et exacts.
- Dans un module DS/Thème (ds_module), la somme des pts de tous les exercices et sous-questions doit faire exactement 20 points.
- Utilise le français pour les consignes/corrections (sauf phrases/options d'Anglais bien sûr).
- Retourne UNIQUEMENT un objet JSON valide respectant EXACTEMENT cette structure :
{
  "subject_key": "c|m|e|p|t|a|r|g",
  "confidence": 0.95,
  "reasoning": "Explication concise de pourquoi ce doc appartient à cette matière",
  "doc_type": "cm|td|tp|annale|vocab|fiche",
  "detected_topics": ["c1", "c2"],
  "action_summary": "Résumé clair en 1 phrase des entraînements créés ou améliorés",
  "ds_module": null | {
    "operation": "create|enrich",
    "target_id": null | "id_module_existant_a_ameliorer",
    "module_type": "theme|ds|annale",
    "chap": "c1",
    "title": "Titre court de l'atelier ou DS",
    "sub": "Sous-titre descriptif",
    "dur": 25,
    "ex": [
      {
        "id": "e1",
        "topic": "Nom du thème",
        "title": "Titre de l'exercice",
        "pts": 20,
        "subs": [ ... 2 à 5 sous-questions utilisant les interfaces adaptées ... ]
      }
    ]
  },
  "quiz_questions": [
    {
      "topic": "c1",
      "concept": "Notion précise",
      "ask": "Énoncé (ou code pour Langage C)",
      "code": "",
      "stdin": "",
      "opts": ["A", "B", "C", "D"],
      "ans": 0,
      "why": "Correction pédagogique détaillée"
    }
  ],
  "memo_update": null | {
    "operation": "create|enrich",
    "target_id": null | "id_chapitre_memo_existant",
    "title": "Titre de la fiche mémo",
    "pts": ["<b>Formule / règle clé</b> : explication...", "<b>Piège classique</b> : ..."]
  }
}`;
}

function stripCodeFences(raw: string): string {
  const s = raw.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  return m ? m[1].trim() : s;
}

function validChapterFor(subjKey: string, chap: unknown): string {
  const desc = SUBJECT_CATALOG.find((s) => s.key === subjKey);
  if (!desc) return 'c1';
  const str = String(chap || '').trim();
  if (desc.chapters.some(([k]) => k === str)) return str;
  return desc.chapters[0][0];
}

function normalizePointsTo20(exs: any[]): void {
  let rawSum = 0;
  for (const ex of exs) {
    for (const u of ex.subs || []) {
      rawSum += Number(u.pts) > 0 ? Number(u.pts) : 2;
    }
  }
  if (rawSum <= 0) return;
  const scale = 20 / rawSum;
  let running = 0;
  const allSubs: any[] = [];
  for (const ex of exs) {
    let exSum = 0;
    for (const u of ex.subs || []) {
      const p = Math.max(0.5, Math.round((Number(u.pts) > 0 ? Number(u.pts) : 2) * scale * 4) / 4);
      u.pts = p;
      exSum += p;
      running += p;
      allSubs.push({ ex, u });
    }
    ex.pts = Math.round(exSum * 100) / 100;
  }
  if (allSubs.length > 0 && Math.abs(running - 20) > 0.001) {
    const diff = Math.round((20 - running) * 100) / 100;
    const last = allSubs[allSubs.length - 1];
    last.u.pts = Math.max(0.5, Math.round((last.u.pts + diff) * 100) / 100);
    last.ex.pts = Math.round(last.ex.subs.reduce((a: number, b: any) => a + b.pts, 0) * 100) / 100;
  }
}

export function sanitizeIngestionResponse(
  rawJson: any,
  doc: ExtractedDocument,
  storageUrl?: string | null
): IngestionPlan {
  const validKey = (SUBJECT_CATALOG.find((s) => s.key === rawJson?.subject_key)?.key || 'c') as SubjectDescriptor['key'];
  const desc = SUBJECT_CATALOG.find((s) => s.key === validKey)!;
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const docType = (['cm', 'td', 'tp', 'annale', 'vocab', 'fiche'].includes(rawJson?.doc_type)
    ? rawJson.doc_type
    : 'cm') as IngestionPlan['doc_type'];

  const detectedTopics: string[] = Array.isArray(rawJson?.detected_topics)
    ? Array.from(new Set<string>(rawJson.detected_topics.map((t: unknown) => validChapterFor(validKey, t))))
    : [desc.chapters[0][0]];

  const modules: Array<Omit<CoachModuleRow, 'document_id' | 'created_at'>> = [];
  const interfacesUsed = new Set<string>();

  // 1. DS / Theme / Annale interactive module (non-C subjects, or if explicitly provided)
  if (rawJson?.ds_module && Array.isArray(rawJson.ds_module.ex) && rawJson.ds_module.ex.length > 0 && validKey !== 'c') {
    const dsm = rawJson.ds_module;
    const cleanedEx: any[] = [];
    for (let ei = 0; ei < dsm.ex.length; ei++) {
      const ex = dsm.ex[ei];
      if (!ex || !Array.isArray(ex.subs) || ex.subs.length === 0) continue;
      const cleanedSubs: any[] = [];
      for (const u of ex.subs) {
        if (!u || !u.q) continue;
        const kind = u.kind ? String(u.kind) : undefined;
        // Validate each interactive kind minimally so UI never crashes
        if (kind === 'bode' && !u.ref) continue;
        if (kind === 'pipeline' && (!Array.isArray(u.insns) || !Array.isArray(u.ans))) continue;
        if (kind === 'cloze' && !Array.isArray(u.blanks)) continue;
        if (kind === 'grid' && (!Array.isArray(u.ans) || !Array.isArray(u.rl) || !Array.isArray(u.cl))) continue;
        if (kind === 'nums' && !Array.isArray(u.items)) continue;
        if (kind === 'mat' && !Array.isArray(u.ans)) continue;
        if (!kind && (!Array.isArray(u.opts) || u.opts.length < 2)) continue;
        if (kind) interfacesUsed.add(kind);
        else interfacesUsed.add('qcm');
        cleanedSubs.push({
          ...u,
          t: validChapterFor(validKey, u.t || dsm.chap || detectedTopics[0]),
          c: String(u.c || ex.topic || desc.name),
          sol: String(u.sol || 'Voir le cours et le document source.'),
        });
      }
      if (cleanedSubs.length > 0) {
        cleanedEx.push({
          id: `e${ei + 1}`,
          topic: String(ex.topic || desc.name),
          title: String(ex.title || `Exercice ${ei + 1}`),
          intro: ex.intro ? String(ex.intro) : undefined,
          pts: Number(ex.pts) || 10,
          subs: cleanedSubs,
        });
      }
    }

    if (cleanedEx.length > 0) {
      normalizePointsTo20(cleanedEx);
      const mType: 'ds' | 'theme' | 'annale' =
        dsm.module_type === 'annale' ? 'annale' : dsm.module_type === 'ds' ? 'ds' : 'theme';
      const chap = validChapterFor(validKey, dsm.chap || detectedTopics[0]);
      const modId = `dyn_${validKey}_${uid}`;
      const payload = {
        id: modId,
        s: validKey,
        th: mType === 'theme',
        ann: mType === 'annale',
        chap: mType === 'theme' ? chap : undefined,
        title: String(dsm.title || `Atelier · ${doc.filename.replace(/\.[^.]+$/, '')}`),
        sub: String(dsm.sub || `Généré depuis ${doc.filename}`),
        dur: Number(dsm.dur) || (mType === 'ds' || mType === 'annale' ? 60 : 20),
        ex: cleanedEx,
        sourceDoc: doc.filename,
      };
      modules.push({
        id: modId,
        subject_key: validKey,
        module_type: mType,
        target_id: dsm.operation === 'enrich' && typeof dsm.target_id === 'string' ? dsm.target_id : null,
        operation: dsm.operation === 'enrich' && typeof dsm.target_id === 'string' ? 'enrich' : 'create',
        title: payload.title,
        payload,
      });
    }
  }

  // 2. Rapid Quiz questions (works for C and all Moodle subjects!)
  if (Array.isArray(rawJson?.quiz_questions) && rawJson.quiz_questions.length > 0) {
    const cleanedQ: any[] = [];
    rawJson.quiz_questions.forEach((q: any, idx: number) => {
      if (!q || !Array.isArray(q.opts) || q.opts.length < 2) return;
      const ans = Number(q.ans);
      if (!Number.isInteger(ans) || ans < 0 || ans >= q.opts.length) return;
      const item: any = {
        id: `dynq_${validKey}_${uid}_${idx}`,
        s: validKey,
        topic: validChapterFor(validKey, q.topic || detectedTopics[0]),
        concept: String(q.concept || doc.filename.replace(/\.[^.]+$/, '')),
        opts: q.opts.map(String),
        ans,
        why: String(q.why || 'Voir le document source.'),
      };
      if (validKey === 'c' && q.code) {
        item.code = String(q.code);
        item.stdin = String(q.stdin || '');
      } else {
        item.ask = String(q.ask || q.code || 'Question issue du document');
      }
      cleanedQ.push(item);
    });
    if (cleanedQ.length > 0) {
      interfacesUsed.add(validKey === 'c' ? 'code_c' : 'quiz');
      modules.push({
        id: `dyn_quiz_${validKey}_${uid}`,
        subject_key: validKey,
        module_type: 'quiz',
        target_id: null,
        operation: 'create',
        title: `Quiz rapide (${cleanedQ.length} q.) · ${doc.filename}`,
        payload: cleanedQ,
      });
    }
  }

  // 3. Aide-mémoire enrichment or new chapter
  if (rawJson?.memo_update && Array.isArray(rawJson.memo_update.pts) && rawJson.memo_update.pts.length > 0) {
    const mu = rawJson.memo_update;
    const isEnrich = mu.operation === 'enrich' && typeof mu.target_id === 'string' && mu.target_id.trim().length > 0;
    const memoId = isEnrich ? mu.target_id.trim() : `dynm_${validKey}_${uid}`;
    interfacesUsed.add('memo');
    modules.push({
      id: `dyn_memo_${validKey}_${uid}`,
      subject_key: validKey,
      module_type: 'memo',
      target_id: isEnrich ? memoId : null,
      operation: isEnrich ? 'enrich' : 'create',
      title: String(mu.title || `Mémo · ${doc.filename.replace(/\.[^.]+$/, '')}`),
      payload: [memoId, String(mu.title || doc.filename), mu.pts.map(String)],
    });
  }

  // 4. If PDF annale uploaded to Storage, also expose it in the subject's Annales tab!
  if (docType === 'annale' && doc.mimeType === 'application/pdf' && storageUrl) {
    interfacesUsed.add('pdf_annale');
    modules.push({
      id: `dyn_pdf_${validKey}_${uid}`,
      subject_key: validKey,
      module_type: 'pdf_annale',
      target_id: null,
      operation: 'create',
      title: `Annale PDF · ${doc.filename}`,
      payload: {
        id: `pdf_${uid}`,
        key: `pdf_${uid}`,
        s: validKey,
        title: doc.filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
        date: new Date().toLocaleDateString('fr-FR'),
        meta: `Document ajouté le ${new Date().toLocaleDateString('fr-FR')} · ${desc.name}`,
        file: doc.filename,
        cfile: '',
        todo: 'Annale ajoutée via le gestionnaire de documents intelligent.',
        surl: storageUrl,
        curl: '',
        spages: [],
        cpages: [],
      },
    });
  }

  return {
    subject_key: validKey,
    subject_name: desc.name,
    confidence: Math.max(0, Math.min(1, Number(rawJson?.confidence) || 0.85)),
    reasoning: String(rawJson?.reasoning || `Document classé automatiquement dans ${desc.name}.`),
    doc_type: docType,
    detected_topics: detectedTopics,
    action_summary:
      String(rawJson?.action_summary || '').trim() ||
      `${modules.length} module(s) généré(s) pour ${desc.name} à partir de ${doc.filename}.`,
    interfaces_used: Array.from(interfacesUsed),
    modules,
  };
}

/**
 * Analyzes an extracted document using server-side Gemini (`/api/ingest-document`)
 * or falls back to direct `@google/genai` with an admin-provided Gemini API key.
 */
export async function analyzeDocumentWithGemini(
  doc: ExtractedDocument,
  existing: ExistingCatalogContext,
  options: { userHint?: string; apiKey?: string; storageUrl?: string | null } = {}
): Promise<IngestionPlan> {
  const prompt = buildIngestionPrompt(doc, existing, options.userHint);

  // 1. Try server-side endpoint first (uses process.env.GEMINI_API_KEY securely in AI Studio / dev / Node)
  let rawText: string | null = null;
  let serverError = '';
  try {
    const resp = await fetch('/api/ingest-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode: doc.mode,
        mimeType: doc.mimeType,
        base64: doc.base64,
        text: doc.text,
        filename: doc.filename,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data?.outputText === 'string' && data.outputText.trim()) {
        rawText = data.outputText;
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      serverError = errData?.error || `HTTP ${resp.status}`;
    }
  } catch {
    serverError = 'Endpoint serveur /api/ingest-document indisponible';
  }

  // 2. Fallback to browser-side @google/genai if an explicit API key is available
  if (!rawText) {
    const key = (options.apiKey || getSavedGeminiKey()).trim();
    if (!key) {
      throw new Error(
        `Clé API Gemini requise (${serverError || 'mode statique'}). Configure GEMINI_API_KEY côté serveur ou renseigne ta clé Gemini dans le panneau Admin ci-dessous.`
      );
    }
    const ai = new GoogleGenAI({ apiKey: key });
    const inputParts: any[] = [{ type: 'text', text: prompt }];
    if (doc.mode === 'binary' && doc.base64) {
      if (doc.mimeType.startsWith('image/')) {
        inputParts.push({ type: 'image', data: doc.base64, mime_type: doc.mimeType });
      } else {
        inputParts.push({ type: 'document', data: doc.base64, mime_type: doc.mimeType });
      }
    } else if (doc.text) {
      inputParts.push({
        type: 'text',
        text: `--- CONTENU DU DOCUMENT (${doc.filename}) ---\n${doc.text}`,
      });
    }

    const interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input: inputParts,
      response_mime_type: 'application/json',
      store: false,
    });
    rawText = interaction.output_text || '';
  }

  const parsed = JSON.parse(stripCodeFences(rawText));
  return sanitizeIngestionResponse(parsed, doc, options.storageUrl);
}
