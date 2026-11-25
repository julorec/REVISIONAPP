/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  allNum,
  asmEval,
  asmReport,
  augTable,
  CGATE,
  chronoCorr,
  chronoFrac,
  chronoInit,
  chronoInner,
  chronoWidget,
  circBox,
  circCorr,
  circDelNode,
  circFrac,
  circFree,
  circInit,
  circInner,
  circWidget,
  cmdEval,
  detN,
  eqn,
  esc,
  fpt,
  FR,
  fsmCorr,
  fsmFrac,
  fsmFree,
  fsmInit,
  fsmInner,
  fsmWidget,
  hashStr,
  hl,
  matMul,
  norm,
  pct,
  pn,
  progChecks,
  shuffle,
  toNum,
} from './engines';
import {
  deleteBoardEntry,
  downloadPdfFile,
  fetchCoachModules,
  fetchHomeBannerOverride,
  getOrCreateStudentUid,
  loadCloudProfile,
  postChatMessage,
  saveCloudProfile,
  subscribeBoardEntries,
  subscribeChatMessages,
  subscribeCoachModules,
  upsertBoardEntry,
  type BoardRow,
  type ChatRow,
  type CoachModuleRow,
} from './supabaseBackend';
import {
  isSubjectKind,
  subAct,
  subCorr,
  subFrac,
  subInit,
  subInput,
  subWidget,
} from './subjectEngines';
import type { ExistingCatalogContext } from '../lib/documentIngestion';

export interface CoachMountOptions {
  root: HTMLElement;
  onOpenAdmin: () => void;
}

export interface CoachController {
  destroy: () => void;
  refreshBanner: () => Promise<void>;
  refreshModules: () => Promise<void>;
  getCatalogContext: () => ExistingCatalogContext;
}

interface SubjectConfig {
  name: string;
  full?: string;
  topics: Array<[string, string]>;
  quota: Record<string, number>;
  board: string;
  chat: string;
  intro: string;
  simTitle: string;
}

const CFG: Record<string, SubjectConfig> = {
  c: {
    name: 'Langage C',
    topics: [
      ['es', 'Entrées-sorties'],
      ['tab', 'Tableaux et chaînes'],
      ['ptr', 'Pointeurs'],
      ['st', 'Structures'],
      ['en', 'Énumérations'],
    ],
    quota: { es: 4, tab: 5, ptr: 5, st: 4, en: 2 },
    board: 'board',
    chat: 'chat',
    intro: '« qu\'affiche ce code ? »',
    simTitle: '20 questions, comme demain',
  },
  m: {
    name: 'Maths',
    full: 'Algèbre linéaire',
    topics: [
      ['esp', 'Espaces vectoriels et rang'],
      ['app', 'Applications linéaires'],
      ['mat', 'Matrices'],
      ['det', 'Déterminant'],
      ['inv', 'Inverse et pivot de Gauss'],
      ['bas', 'Changement de base'],
      ['pol', 'Polynômes'],
      ['vp', 'Diagonalisation'],
    ],
    quota: { esp: 2, app: 2, mat: 2, det: 2, inv: 2, bas: 2, pol: 2, vp: 4 },
    board: 'board-m',
    chat: 'chat-m',
    intro: "d'algèbre linéaire (DS blancs corrigés)",
    simTitle: 'DS blanc',
  },
  e: {
    name: 'ELEN numérique',
    full: 'Électronique numérique',
    topics: [
      ['c1', 'Chapitre 1 · Fonctions logiques'],
      ['c2', 'Chapitre 2 · Représentation et codage'],
      ['c3', 'Chapitre 3 · Composants asynchrones'],
      ['c4', 'Chapitre 4 · Mémoires'],
      ['c5', 'Chapitre 5 · Électronique synchrone'],
      ['c6', "Chapitre 6 · Machines d'états"],
      ['c7', 'Chapitre 7 · Composants synchrones'],
    ],
    quota: { c1: 3, c2: 3, c3: 3, c4: 2, c5: 3, c6: 3, c7: 3 },
    board: 'board-e',
    chat: 'chat-e',
    intro: "d'électronique numérique (QCM et réponses à saisir)",
    simTitle: 'DS blanc',
  },
  p: {
    name: 'Prog syst',
    full: 'Programmation système',
    topics: [
      ['c1', 'Chapitre 1 · Shell'],
      ['c2', 'Chapitre 2 · Makefile'],
      ['c3', 'Chapitre 3 · RISC-V : registres, mémoire, calculs'],
      ['c4', 'Chapitre 4 · RISC-V : données et directives'],
      ['c5', 'Chapitre 5 · RISC-V : contrôle et appels système'],
    ],
    quota: {},
    board: 'board-p',
    chat: 'chat-p',
    intro: 'de programmation système (commandes et assembleur)',
    simTitle: 'DS blanc',
  },
  r: {
    name: 'Architecture des processeurs',
    full: 'Architecture des processeurs',
    topics: [
      ['c1', 'CM1 · Calculateur câblé (UT / UC)'],
      ['c2', 'CM2 · Processeurs à instructions (ISA)'],
      ['c3', 'CM3 · Performance & pipeline'],
      ['c4', 'CM4 · Hiérarchie mémoire & caches'],
    ],
    quota: { c1: 4, c2: 4, c3: 4, c4: 4 },
    board: 'board-r',
    chat: 'chat-r',
    intro: "d'architecture des processeurs (UT/UC, ISA, pipeline, caches)",
    simTitle: 'DS blanc',
  },
  a: {
    name: 'Électronique analogique',
    full: "Électronique d'interface",
    topics: [
      ['c1', 'Chapitre 1 · Analyse de réseaux & Bode'],
      ['c2', 'Chapitre 2 · Amplificateurs opérationnels'],
      ['c3', 'Chapitre 3 · Diodes et redressement'],
      ['c4', 'Chapitre 4 · Transistors bipolaires (BJT)'],
      ['c5', 'Chapitre 5 · Transistors MOS & CMOS'],
      ['c6', 'Chapitre 6 · Structures intégrées'],
    ],
    quota: { c1: 3, c2: 4, c3: 3, c4: 4, c5: 4, c6: 2 },
    board: 'board-a',
    chat: 'chat-a',
    intro: "d'électronique analogique (AOP, diodes, BJT, MOS, différentiel)",
    simTitle: 'DS blanc',
  },
  t: {
    name: 'Traitement du signal (TTSD)',
    full: 'Théorie et traitement du signal déterministe',
    topics: [
      ['c1', 'Chapitre 1 · Signaux, énergie et puissance'],
      ['c2', 'Chapitre 2 · Séries de Fourier'],
      ['c3', 'Chapitre 3 · Transformée de Fourier & distributions'],
      ['c4', 'Chapitre 4 · Convolution, corrélation et filtrage'],
      ['c5', 'Chapitre 5 · Échantillonnage et séquences discrètes'],
      ['c6', 'Chapitre 6 · TFTD, TFD et changement de cadence'],
    ],
    quota: { c1: 4, c2: 4, c3: 4, c4: 3, c5: 3, c6: 2 },
    board: 'board-t',
    chat: 'chat-t',
    intro: 'de TTSD (Fourier, filtrage, échantillonnage, TFTD)',
    simTitle: 'DS blanc',
  },
  g: {
    name: 'Anglais',
    full: 'Anglais ESET · My English is French & TOEIC',
    topics: [
      ['c1', '1 · Indénombrables, articles & quantifieurs'],
      ['c2', '2 · Relatifs, ordre des mots & adjectifs composés'],
      ['c3', '3 · Prépositions, verbes pièges & faux amis'],
      ['c4', '4 · Vocabulaire TOEIC officiel'],
    ],
    quota: { c1: 5, c2: 5, c3: 5, c4: 5 },
    board: 'board-g',
    chat: 'chat-g',
    intro: "d'anglais (My English is French & liste TOEIC INSA)",
    simTitle: 'Test blanc',
  },
};

const THCH_MAP: Record<string, Array<[string, string, string]>> = {
  m: [
    ['esp', 'Espaces vectoriels et familles', 'Sous-espaces, rang, bases et coordonnées'],
    ['app', 'Applications linéaires', "Linéarité, matrice d'une application, noyau et image"],
    ['mat', 'Matrices', 'Produit, transposée, puissances'],
    ['det', 'Déterminant', 'Calcul, propriétés, paramètre'],
    ['inv', "Inverse d'une matrice", 'Formule 2×2, 3×3, Gauss-Jordan pas à pas, systèmes'],
    ['bas', 'Changement de base', "Matrice de passage, coordonnées, A' = P⁻¹AP"],
    ['pol', 'Polynômes', 'Racines, division euclidienne, ℝ[X] comme espace vectoriel'],
    ['vp', 'Valeurs propres et diagonalisation', 'Valeurs propres, sous-espaces propres, D, P, P⁻¹, puissances'],
  ],
  e: [
    ['c1', 'Chapitre 1 · Fonctions logiques', 'Algèbre de Boole, Karnaugh, tables de vérité'],
    ['c2', 'Chapitre 2 · Représentation et codage', 'Binaire, hexadécimal, complément à 2, BCD, Gray, virgule fixe, half'],
    ['c3', 'Chapitre 3 · Composants asynchrones', 'Multiplexeur, ROM, additionneur, soustracteur'],
    ['c4', 'Chapitre 4 · Mémoires', "Bus d'adresse, carte mémoire, RAM et ROM"],
    ['c5', 'Chapitre 5 · Électronique synchrone', 'Bascules D, JK, T, temps de propagation, chemin critique'],
    ['c6', "Chapitre 6 · Machines d'états", 'Moore, Mealy, table de transition, détecteurs de séquence'],
    ['c7', 'Chapitre 7 · Composants synchrones', 'Compteurs, registre à décalage, chronogrammes'],
  ],
  p: [
    ['c1', 'Chapitre 1 · Shell', 'Chemins, redirections, globbing, variables, scripts, man'],
    ['c2', 'Chapitre 2 · Makefile', 'Règles, variables automatiques, règles génériques, cibles muettes'],
    ['c3', 'Chapitre 3 · RISC-V : registres, mémoire, calculs', 'Registres, little-endian, instructions arithmétiques, logiques et décalages'],
    ['c4', 'Chapitre 4 · RISC-V : données et directives', 'Sections .data / .text, directives, tableaux, accès mémoire, pointeurs'],
    ['c5', 'Chapitre 5 · RISC-V : contrôle et appels système', 'Branchements, if / for / while, ecall, programmes complets'],
  ],
  r: [
    ['c1', 'CM1 · Calculateur câblé (UT / UC)', 'Décomposition UT/UC, UAL, registres, MUX, tableau de commandes, PGCD'],
    ['c2', 'CM2 · Processeurs à instructions (ISA)', 'UT généraliste, extension de signe, RegFile, RAM, PC/IR, micro-code'],
    ['c3', 'CM3 · Performance & pipeline', 'CPI, chemin critique, f_clk, pipeline 5 étages, aléas RAW/contrôle, forwarding'],
    ['c4', 'CM4 · Hiérarchie mémoire & caches', 'Localité, Tag/Index/Offset, direct vs associatif, LRU, AMAT, cohérence'],
  ],
  a: [
    ['c1', 'Chapitre 1 · Analyse de réseaux & Bode', 'Kirchhoff, Thévenin/Norton avec sources liées, filtres 1er ordre, Bode'],
    ['c2', 'Chapitre 2 · Amplificateurs opérationnels', 'AOP idéal (inverseur, non-inverseur, suiveur), Slew Rate, GBP, saturation'],
    ['c3', 'Chapitre 3 · Diodes et redressement', 'Modèles sans/avec seuil, Zener, résistance dynamique r_d, redresseur sans seuil'],
    ['c4', 'Chapitre 4 · Transistors bipolaires (BJT)', 'Polarisation pont de base, commutation, petits signaux g_m/r_π, EC / CC / BC'],
    ['c5', 'Chapitre 5 · Transistors MOS & CMOS', 'Shichman-Hodges, saturation de courant, ampli MOS, portes CMOS NAND/NOR'],
    ['c6', 'Chapitre 6 · Structures intégrées', 'Étage différentiel, mode commun, miroir de courant'],
  ],
  t: [
    ['c1', 'Chapitre 1 · Signaux, énergie et puissance', 'Classification, valeur moyenne/efficace, voltmètre DC/AC, distorsion (TD1)'],
    ['c2', 'Chapitre 2 · Séries de Fourier', 'Coefficients c_n / a_n / b_n, symétries, spectre de raies, Parseval'],
    ['c3', 'Chapitre 3 · Transformée de Fourier & distributions', 'Porte, triangle, sinc, Dirac, peigne, retard, échelle, modulation (TD2)'],
    ['c4', 'Chapitre 4 · Convolution, corrélation et filtrage', 'SLI, filtres en cascade (TD3), passe-bas idéal, Haar, Wiener-Khintchine'],
    ['c5', 'Chapitre 5 · Échantillonnage et séquences discrètes', 'Shannon-Nyquist, repliement spectral, fréquence réduite F, séquences'],
    ['c6', 'Chapitre 6 · TFTD, TFD et changement de cadence', 'Spectre continu périodique, FFT, résolution Δf, décimation & interpolation'],
  ],
  g: [
    ['c1', '1 · Indénombrables, articles & quantifieurs', 'advice, news, software, a/the/Ø, some/any/no, many/much, fewer/less'],
    ['c2', '2 · Relatifs, ordre des mots & adjectifs composés', 'who/whom/which/what, questions indirectes, COD, 26-year-old, want sb to do'],
    ['c3', '3 · Prépositions, verbes pièges & faux amis', 'discuss Ø, depend on, for/during, succeed in, remind/remember, make a mistake'],
    ['c4', '4 · Vocabulaire TOEIC officiel', 'Liste officielle INSA / Prep My Future (Publicité, Commerce, Entreprise…)'],
  ],
};

const PUNS: Record<string, string[]> = {
  es: ['Scanf-dale en vue', "Un printf d'inquiétude", 'Entrées-sorties : problème de sortie', "Format C'est la vie", 'Le %d de la discorde', "scanf, c'est pas gagné"],
  tab: ["Hors du tableau d'honneur", 'Chaînon manquant', 'Le \\0 de la classe', 'Indice de gravité : 5 sur 5', 'Dépassement de tableau, dépassement de budget', "Dans le tableau, mais pas au tableau d'honneur"],
  ptr: ["Pointeur d'interrogation", 'NULL part ailleurs', 'Segfault au démarrage', 'Pointe de stress', 'Il pointe, mais à côté', 'Adresse inconnue, destinataire parti'],
  st: ['Champ de ruines', 'Sans queue ni struct', "Structure d'accueil en travaux", "Un point, c'est tout (ou une flèche ?)", 'Champ libre aux erreurs', 'La structure a du mal à tenir'],
  en: ['Énuméro un des galères', 'Perdu entre deux constantes', 'Compte jusqu’à 0, puis se perd', 'Enum-ennuis', "Il manque une valeur à l'appel", 'Constante en détresse'],
  mat: ['Matrice de tous les dangers', 'Produit en croix, erreur en bloc', 'Il a perdu le fil de la ligne', 'Transposée dans un autre monde', 'AB ≠ BA, et ça se voit'],
  det: ['Déterminant mais pas déterminé', "Un déterminant nul, c'est vite vu", "Sarrus ne l'a pas sauvé", 'Le signe, ça change tout', 'Triangulaire, mais pas triomphant'],
  inv: ['Inversé de bonne foi', "L'inverse n'existe pas (pour lui)", "Système d'équations, système D", 'Pivot de Gauss, mais pivot à côté', 'Cramer, pas assez sûr'],
  vp: ['Valeur propre, vraiment ?', 'Vecteur propre, valeur sale', 'Propre sur lui, mais pas sur le calcul', 'λ de la discorde', 'Diagonalise, mais de travers'],
  esp: ['Espace vectoriel, vide intersidéral', "Famille libre, mais pas indépendante d'esprit", 'Rang de dernier', 'Dimension parallèle', 'Base fragile'],
  c1: ['Porte mal fermée', 'Base fragile sur le chapitre 1', 'Les bases demandent un petit tour de chauffe'],
  c2: ['Un bit (ou un gain) de retard', 'Retenue de justesse', 'Chapitre 2 en cours de rodage'],
  c3: ['Bascule dans le doute', 'Un aléa sur le chemin critique', 'Piège classique du chapitre 3'],
  c4: ['Défaut de cache imminent', 'En panne de polarisation', 'Transition délicate au chapitre 4'],
  c5: ['Repliement spectral en vue', 'Zone ohmique ou saturation ?', 'Front montant, moral descendant'],
  c6: ["Machine à états d'âme", 'Mode commun non rejeté', 'Résolution TFD à affiner'],
  c7: ['Chronogramme, pas chronométré', 'En retard d’un front', 'Période d’adaptation en cours'],
};

const QPOOL_G = {
  top: ["Premier : l'équation est résolue.", 'Un sans-faute de signe.', 'Le podium lui va bien.', 'Plus fort que le théorème du rang.'],
  last: ['Chaque grand ingénieur a eu son premier échec.', 'Il reste du temps avant le partiel.', 'La dernière place a une belle vue sur la remontée.', "Le meilleur moment pour progresser, c'est maintenant."],
  hi: ['Très peu d’erreurs, beaucoup de rigueur.', 'Ça se calcule bien, tout ça.', 'Il passe presque tout.', 'Du solide.'],
  mid: ['En bonne voie, encore deux ou trois notions.', 'Quelques points à revoir avant le partiel.', 'Le plus dur est derrière, le reste est devant.', 'Ça avance, doucement mais sûrement.'],
  low: ['On relance une simulation ?', "La courbe monte, c'est l'essentiel.", 'Pas de souci : relire la fiche et on repart.', 'Chaque erreur est une leçon gratuite.'],
};
const STRONG = ['Aucune difficulté repérée', 'Zéro warning', 'Sans faute de segmentation', 'Compile du premier coup', 'Même gcc applaudit', 'Le -Wall ne lui fait pas peur'];
const QTOP = ['Sur le podium, sans warning.', "Premier : le compilateur s'incline.", 'Un code d’avance sur la classe.', 'Rien ne dépasse, sauf son score.', "Le vrai main(), c'est lui."];
const QLAST = ['Chaque grand programmeur a eu son premier segfault.', 'Il reste du temps avant demain : \\0 stress.', 'Pas de panique, la dernière place a un bon point de vue.', "Le meilleur moment pour remonter, c'est maintenant.", "Ça compile, c'est déjà ça."];
const QHI = ['Ça se compile bien, tout ça.', 'Très peu de bugs, beaucoup de style.', 'Le printf est confiant.', 'Il passe sans warning.'];
const QMID = ['En bonne voie, encore deux ou trois pointeurs à dompter.', 'Ça tourne, mais pas encore sans fuite mémoire.', 'Quelques lignes à relire avant le DS.', 'Le plus dur est derrière, le reste est devant.'];
const QLOW = ['Il tient bon, seulement quelques erreurs de syntaxe d’écart.', 'On relance une simulation ?', "La courbe monte, c'est l'essentiel.", 'Pas de souci : relire la fiche et on repart.'];

const PALETTE = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#eab308', '#6366f1', '#14b8a6', '#a16207', '#64748b'];
const CROWN =
  '<svg class="crown" viewBox="0 0 34 24" aria-hidden="true"><path d="M2 20 L1 6 L10 13 L17 2 L24 13 L33 6 L32 20 Z" fill="currentColor" stroke="#b07d00" stroke-width="1.5" stroke-linejoin="round"/><rect x="2" y="20" width="30" height="3" rx="1" fill="#b07d00"/></svg>';

const L = 'ABCD';
const SK = 'coach-ds1-c.v1';
const THK = 'coach-theme.v1';
const SEENK = 'coach-chat-seen.v1';

export function mountCoachApp(options: CoachMountOptions): CoachController {
  const { root, onOpenAdmin } = options;
  const ac = new AbortController();
  const { signal } = ac;

  root.innerHTML = `
<div class="coach-shell">
  <div class="wrap">
    <header>
      <div class="top">
        <div class="eyebrow">INSA Rennes · ESET · 3A · Partiels</div>
        <div class="who" id="who"></div>
      </div>
      <button id="homebtn" class="btn homebig" data-act="home" hidden>← Accueil</button>
      <h1 id="h1">Ton coach pour les partiels</h1>
      <p class="sub" id="subtxt"></p>
      <div class="chips subj" id="subj" role="tablist" aria-label="Matière"></div>
      <nav role="tablist" id="tabs">
        <button role="tab" data-t="sim" aria-selected="true">Simulation DS</button>
        <button role="tab" data-t="ann" aria-selected="false" hidden>Annales</button>
        <button role="tab" data-t="train" aria-selected="false">Par thème</button>
        <button role="tab" data-t="suivi" aria-selected="false">Mon suivi</button>
        <button role="tab" data-t="board" aria-selected="false">Classement</button>
        <button role="tab" data-t="memo" aria-selected="false">Aide-mémoire</button>
      </nav>
    </header>
    <div id="parkbar" class="park" hidden></div>
    <main id="main"><div class="coach-loading">Chargement des modules ESET 3A…</div></main>
  </div>
  <aside id="chatpanel" aria-label="Discussion" hidden></aside>
  <button id="chatfab" class="btn" data-act="chatopen" hidden>Discussion</button>
</div>`;

  const $ = <T extends HTMLElement = HTMLElement>(s: string): T | null => {
    if (s.startsWith('#') && !/[\s>+~:\[\],()]/.test(s)) {
      const id = s.slice(1);
      const escId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(id)
          : id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
      return root.querySelector('#' + escId) as T | null;
    }
    return root.querySelector(s) as T | null;
  };

  // Loaded datasets (base static + dynamic Supabase overlay)
  let BASE_ANN: any[] = [];
  let BASE_DS: any[] = [];
  let BASE_ALLQ: any[] = [];
  let BASE_MEMO_ALL: Record<string, any[]> = {};

  let ANN: any[] = [];
  let DS: any[] = [];
  let THM: any[] = [];
  let ALLQ: any[] = [];
  let MEMO_ALL: Record<string, any[]> = {};
  let bannerSrc = '/coach-data/promo-banner.jpg';
  let dataLoaded = false;
  let unsubModules: (() => void) | null = null;

  // Navigation & subject state
  let view = 'home';
  let chatCh = 'g';
  let chatCtx = '';
  const CHATS: Record<string, { name: string; coll: string }> = { g: { name: 'Général', coll: 'chat' } };
  let SUB = 'c';
  let QS: any[] = [];
  let TOPICS: Array<[string, string]> = CFG.c.topics;
  let NAME: Record<string, string> = Object.fromEntries(TOPICS);
  let QUOTA: Record<string, number> = CFG.c.quota;

  let parked: any = null;
  let tab = 'sim';
  let run: any = null;
  let topic = 'all';
  let count: number | 'all' = 10;
  let missed: any[] = [];
  let revFilter = 'all';
  let memoOpen = 'es';
  let confirmReset = false;

  // DS & Gauss-Jordan stepper state
  let dsRun: any = null;
  let dsTimer: number | null = null;
  let thm: any = null;

  // Profile & localStorage store
  let memOnly = false;
  const store: { cur: string | null; subj?: string; profiles: Record<string, any> } = (() => {
    try {
      localStorage.setItem(SK + '.t', '1');
      localStorage.removeItem(SK + '.t');
      const r = localStorage.getItem(SK);
      if (r) {
        const o = JSON.parse(r);
        if (o && o.profiles) return o;
      }
    } catch {
      memOnly = true;
    }
    return { cur: null, profiles: {} };
  })();

  const UIDV = getOrCreateStudentUid();
  let cloudOK = false;
  let cloudBusy = false;
  let cloudDirty = false;
  let cloudTimer: number | null = null;
  let boardRows: BoardRow[] | null = null;
  let boardErr: string | null = null;
  let unsubBoard: (() => void) | null = null;
  let boardTimer: number | null = null;
  let syncing = false;
  let syncErr: string | null = null;
  let synced = false;
  let triedSync = false;

  let chatRows: ChatRow[] | null = null;
  let chatUnsub: (() => void) | null = null;
  let chatDraft = '';
  let chatErr = '';
  let chatLast = 0;
  let chatOpen = false;
  let chatSeen: Record<string, number> = {};
  const unread: Record<string, number> = {};
  const unreadRows: Record<string, ChatRow[]> = {};
  const unreadUnsubs: Array<() => void> = [];
  let unreadOn = false;

  try {
    chatSeen = JSON.parse(localStorage.getItem(SEENK) || '{}') || {};
  } catch {
    chatSeen = {};
  }

  let COLORMAP: Record<string, string> = {};
  const KNOWN: Record<string, string> = {};

  const nameKey = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
  const P = () => (store.cur ? store.profiles[store.cur] : null);
  const mySims = () => (P()?.sims || []).filter((m: any) => (m.s || 'c') === SUB);
  const stat = (id: string | number) => (P()?.q?.[id] as [number, number, number | null, number]) || [0, 0, null, 0];
  const EMP = () => SUB !== 'c';
  const THC = () => THCH_MAP[SUB] || [];
  const hasAnnales = (subKey: string) =>
    DS.some((x) => x.s === subKey && !!x.ann) || ANN.some((a) => (a.s || 'e') === subKey);
  const dsList = (ann: boolean) => DS.filter((x) => x.s === SUB && !x.th && !!x.ann === !!ann);

  function save() {
    try {
      localStorage.setItem(SK, JSON.stringify(store));
    } catch {
      memOnly = true;
    }
    cloudPush();
  }

  function rec(id: string | number, ok: boolean) {
    const p = P();
    if (!p) return;
    const s = stat(id);
    p.q[id] = [s[0] + 1, s[1] + (ok ? 1 : 0), ok ? 1 : 0, Date.now()];
    save();
  }

  function weight(q: any) {
    const s = stat(q.id);
    return s[0] === 0 ? 3 : s[2] === 0 ? 5 : 1;
  }

  function wpick(pool: any[], n: number) {
    const a = pool.map((q) => ({ q, k: Math.pow(Math.random(), 1 / weight(q)) }));
    a.sort((x, y) => y.k - x.k);
    return a.slice(0, n).map((x) => x.q);
  }

  function isRight(q: any, a: any): boolean {
    if (a === null || a === undefined) return false;
    if (q.opts) return a === q.ans;
    if (q.t === 'str') return norm(a) === norm(q.sol);
    const v = toNum(a);
    return !isNaN(v) && Math.abs(v - q.sol) <= (q.tol || 0) + 1e-9;
  }

  function qHead(q: any): string {
    if (q.s === 'c') return '<h2>Qu\'affiche ce programme ?</h2><pre class="code">' + hl(q.code) + '</pre>';
    if (q.h) return '<div class="qh2">' + q.h + '</div>';
    return '<p class="ask">' + esc(q.ask) + '</p>' + (q.body ? '<pre class="code plain">' + esc(q.body) + '</pre>' : '');
  }

  function solLine(q: any, mine: any, ok: boolean): string {
    if (q.opts) return '';
    return (
      '<p class="solline">' +
      (mine === null || mine === undefined ? 'Sans réponse. ' : 'Ta réponse : <b>' + esc(mine) + '</b>. ') +
      (ok ? '' : 'Bonne réponse : <b>' + esc(q.solTxt) + (q.unit ? ' ' + esc(q.unit) : '') + '</b>.') +
      '</p>'
    );
  }

  function setSub(k: string) {
    SUB = CFG[k] ? k : 'c';
    QS = ALLQ.filter((q) => q.s === SUB);
    TOPICS = CFG[SUB].topics;
    NAME = Object.fromEntries(TOPICS);
    QUOTA = CFG[SUB].quota;
    topic = 'all';
    memoOpen = TOPICS[0][0];
    revFilter = 'all';
    dsRun = null;
    thm = null;
    resetShared();
  }

  /* ---------- thème ---------- */
  function curTheme(): string {
    try {
      return localStorage.getItem(THK) || 'auto';
    } catch {
      return 'auto';
    }
  }
  function applyTheme() {
    const m = curTheme();
    const r = document.documentElement;
    if (m === 'light' || m === 'dark') {
      r.setAttribute('data-theme', m);
      r.classList.toggle('dark', m === 'dark');
    } else {
      r.removeAttribute('data-theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      r.classList.toggle('dark', prefersDark);
    }
  }
  function setTheme(m: string) {
    try {
      localStorage.setItem(THK, m);
    } catch {
      // ignore
    }
    applyTheme();
  }
  applyTheme();
  function themeBtns(): string {
    return (
      '<span class="thb" role="group" aria-label="Affichage">' +
      [
        ['light', '☀', 'Clair'],
        ['dark', '☾', 'Sombre'],
        ['auto', 'A', 'Auto'],
      ]
        .map(
          (x) =>
            '<button data-th="' +
            x[0] +
            '" title="' +
            x[2] +
            '" aria-label="' +
            x[2] +
            '" aria-pressed="' +
            (curTheme() === x[0]) +
            '">' +
            x[1] +
            '</button>'
        )
        .join('') +
      '</span>'
    );
  }

  /* ---------- statistiques & conseil ---------- */
  function topicStats() {
    const r: Record<string, { tries: number; right: number; seen: number; total: number; missed: number }> = {};
    TOPICS.forEach(([k]) => {
      r[k] = { tries: 0, right: 0, seen: 0, total: 0, missed: 0 };
    });
    QS.forEach((q) => {
      const s = stat(q.id);
      const t = r[q.topic];
      if (!t) return;
      t.total++;
      t.tries += s[0];
      t.right += s[1];
      if (s[0]) t.seen++;
      if (s[2] === 0) t.missed++;
    });
    return r;
  }

  function conceptStats() {
    const m: Record<string, { concept: string; topic: string; tries: number; right: number }> = {};
    QS.forEach((q) => {
      const s = stat(q.id);
      if (!s[0]) return;
      const c = m[q.concept] || (m[q.concept] = { concept: q.concept, topic: q.topic, tries: 0, right: 0 });
      c.tries += s[0];
      c.right += s[1];
    });
    return Object.values(m)
      .filter((c) => c.right / c.tries < 0.75)
      .sort((a, b) => b.tries - b.right - (a.tries - a.right) || a.right / a.tries - b.right / b.tries)
      .slice(0, 5);
  }

  function totals() {
    const ts = topicStats();
    let tries = 0;
    let right = 0;
    TOPICS.forEach(([k]) => {
      tries += ts[k].tries;
      right += ts[k].right;
    });
    return { ts, tries, right };
  }

  function estimate(): number | null {
    const { ts, tries, right } = totals();
    if (tries < 10) return null;
    let e = 0;
    TOPICS.forEach(([k]) => {
      const t = ts[k];
      e += (QUOTA[k] || 0) * (t.tries >= 2 ? t.right / t.tries : right / tries);
    });
    return Math.round(e);
  }

  function advice() {
    const { ts, tries } = totals();
    const rated = TOPICS.filter(([k]) => ts[k].tries >= 3)
      .map(([k]) => ({ k, rate: pct(ts[k].right, ts[k].tries) }))
      .sort((a, b) => a.rate - b.rate);
    const untouched = TOPICS.filter(([k]) => ts[k].tries === 0).map(([k]) => k);
    const missedCount = QS.filter((q) => stat(q.id)[2] === 0).length;
    return {
      tries,
      weak: rated.length && rated[0].rate < 80 ? rated[0] : null,
      untouched,
      missed: missedCount,
      solid: rated.length > 0 && rated[0].rate >= 80,
    };
  }

  function adviceCard(): string {
    const a = advice();
    let h = '<div class="card advice"><div class="tag">Mon conseil</div><h2>Quoi travailler maintenant</h2>';
    if (!a.tries) {
      return h + '<p>Fais une première simulation ou quelques questions par thème : le coach pourra alors te dire où tu en es.</p></div>';
    }
    if (a.weak) {
      h +=
        '<p><b>' +
        NAME[a.weak.k] +
        '</b> est ton point faible : ' +
        a.weak.rate +
        " % de réussite. Relis la fiche de l'aide-mémoire, puis refais 10 questions. On te repropose en premier celles que tu as ratées.</p>";
    } else if (a.solid) {
      h += '<p>Tu es solide sur les thèmes déjà travaillés (80 % ou plus). Refais une simulation complète pour confirmer, en conditions de DS.</p>';
    } else {
      h += '<p>Continue : il faut quelques réponses de plus par thème pour que le coach repère tes faiblesses.</p>';
    }
    if (a.untouched.length) h += '<p>Pas encore touché : ' + a.untouched.map((k) => NAME[k]).join(', ') + '.</p>';
    h += '<div class="foot">';
    if (a.weak)
      h +=
        '<button class="btn" data-act="train:' +
        a.weak.k +
        '">10 questions : ' +
        NAME[a.weak.k] +
        '</button><button class="btn ghost" data-act="memo:' +
        a.weak.k +
        '">Fiche ' +
        NAME[a.weak.k] +
        '</button>';
    if (a.missed)
      h += '<button class="btn ghost" data-act="missed">Refaire mes ' + a.missed + ' ratée' + (a.missed > 1 ? 's' : '') + '</button>';
    return h + '</div></div>';
  }

  /* ---------- Supabase cloud sync ---------- */
  function mergeStores(a: any) {
    if (!a || !a.profiles) return;
    Object.keys(a.profiles).forEach((k) => {
      const r = a.profiles[k];
      const l = store.profiles[k];
      if (!l) {
        store.profiles[k] = r;
        return;
      }
      Object.keys(r.q || {}).forEach((id) => {
        const x = r.q[id];
        const y = l.q[id];
        if (!y || x[0] > y[0] || (x[0] === y[0] && x[3] > y[3])) l.q[id] = x;
      });
      const seen: Record<number, number> = {};
      (l.sims || []).forEach((m: any) => {
        seen[m.ts] = 1;
      });
      (r.sims || []).forEach((m: any) => {
        if (!seen[m.ts]) l.sims.push(m);
      });
      l.sims.sort((m: any, n: any) => m.ts - n.ts);
      if (l.share === undefined && r.share !== undefined) l.share = r.share;
    });
    if (!store.cur && a.cur && store.profiles[a.cur]) store.cur = a.cur;
  }

  function cloudPush() {
    if (!cloudOK || !UIDV) return;
    cloudDirty = true;
    if (cloudTimer) window.clearTimeout(cloudTimer);
    cloudTimer = window.setTimeout(() => {
      void cloudFlush();
    }, 1200);
  }

  async function cloudFlush() {
    if (cloudBusy || !cloudDirty) return;
    cloudBusy = true;
    cloudDirty = false;
    const p = P();
    await saveCloudProfile(UIDV, p ? p.name : '', { cur: store.cur, profiles: store.profiles });
    cloudBusy = false;
    if (cloudDirty) void cloudFlush();
  }

  async function cloudLoad() {
    const res = await loadCloudProfile(UIDV);
    if (res.ok) {
      if (res.data) mergeStores(res.data);
      cloudOK = true;
      try {
        localStorage.setItem(SK, JSON.stringify(store));
      } catch {
        // ignore
      }
      cloudDirty = true;
      void cloudFlush();
    }
  }

  /* ---------- couleurs, surnoms, classement ---------- */
  const isSofia = (r: { n?: string }) => {
    const k = nameKey(r.n || '');
    return k === 'sofia' || k === 'sofia sekssaoui';
  };
  function noteUser(id?: string, n?: string) {
    if (id && !KNOWN[id]) KNOWN[id] = n || '';
  }
  function buildColors(rows?: Array<{ id?: string; n?: string }>) {
    if (rows) rows.forEach((r) => noteUser(r.id, r.n));
    COLORMAP = {};
    let n = 0;
    Object.keys(KNOWN)
      .sort()
      .forEach((id) => {
        if (isSofia({ n: KNOWN[id] })) return;
        COLORMAP[id] = PALETTE[n % PALETTE.length];
        n++;
      });
  }
  function userColor(r: { id?: string; u?: string; n?: string }): string {
    const id = r.id || r.u || '';
    return isSofia(r) || (id && KNOWN[id] && isSofia({ n: KNOWN[id] }))
      ? '#ec4899'
      : COLORMAP[id] || PALETTE[hashStr(id || 'x') % PALETTE.length];
  }
  function quipFor(row: BoardRow, rank: number, n: number): string {
    const h = hashStr((row.id || row.n || 'x') + 'q');
    const G = SUB !== 'c';
    const pool =
      rank === 0
        ? G
          ? QPOOL_G.top
          : QTOP
        : rank === n - 1 && n > 1
          ? G
            ? QPOOL_G.last
            : QLAST
          : row.best >= 16
            ? G
              ? QPOOL_G.hi
              : QHI
            : row.best >= 11
              ? G
                ? QPOOL_G.mid
                : QMID
              : G
                ? QPOOL_G.low
                : QLOW;
    return pool[h % pool.length];
  }
  function punFor(row: BoardRow): string {
    const h = hashStr(row.id || row.n || 'x');
    return row.weak && PUNS[row.weak] ? PUNS[row.weak][h % PUNS[row.weak].length] : STRONG[h % STRONG.length];
  }
  function weakOf(): { k: string; rate: number } | null {
    if (EMP()) {
      const sims = mySims().filter((m: any) => m.ex);
      const ch: Record<string, { e: number; m: number }> = {};
      sims.forEach((m: any) => {
        (m.q || []).forEach((r: any) => {
          const t = r[0];
          if (!t) return;
          ch[t] = ch[t] || { e: 0, m: 0 };
          ch[t].e += r[2];
          ch[t].m += r[3];
        });
      });
      const rated = THC()
        .map((c) => {
          const o = ch[c[0]];
          return o && o.m > 0 ? { k: c[0], rate: Math.round((o.e / o.m) * 100) } : null;
        })
        .filter((x): x is { k: string; rate: number } => Boolean(x))
        .sort((a, b) => a.rate - b.rate);
      return rated.length && rated[0].rate < 80 ? rated[0] : null;
    }
    const { ts } = totals();
    const r = TOPICS.filter(([k]) => ts[k].tries >= 3)
      .map(([k]) => ({ k, rate: pct(ts[k].right, ts[k].tries) }))
      .sort((a, b) => a.rate - b.rate);
    return r.length && r[0].rate < 80 ? r[0] : null;
  }

  async function syncBoard() {
    const p = P();
    if (!p || p.share !== true || !mySims().length || syncing) return;
    syncing = true;
    syncErr = null;
    const ms = mySims();
    const sc = ms.map((x: any) => x.score);
    const w = weakOf();
    const res = await upsertBoardEntry(CFG[SUB].board, UIDV, {
      n: p.name,
      best: Math.max(...sc),
      avg: Math.round((sc.reduce((a: number, b: number) => a + b, 0) / sc.length) * 10) / 10,
      sims: sc.length,
      weak: w ? w.k : '',
      wr: w ? w.rate : 0,
      ts: Date.now(),
    });
    if (res.ok) synced = true;
    else syncErr = res.missingTable ? 'schema' : res.code || 'err';
    syncing = false;
  }

  function syncMsg(): string {
    const p = P();
    if (!p || p.share !== true) return '';
    if (syncErr === 'schema')
      return "Le classement Supabase sera actif dès que le schéma SQL aura été synchronisé (push GitHub Actions).";
    if (syncErr) return "Impossible d'enregistrer ton score au classement pour le moment.";
    return synced ? 'Ton score est enregistré au classement.' : 'Envoi au classement…';
  }

  function resetShared() {
    if (unsubBoard) {
      unsubBoard();
      unsubBoard = null;
    }
    boardRows = null;
    boardErr = null;
    synced = false;
    triedSync = false;
    syncErr = null;
    if (boardTimer) window.clearTimeout(boardTimer);
  }

  function subBoard() {
    if (unsubBoard) return;
    unsubBoard = subscribeBoardEntries(
      CFG[SUB].board,
      (rows) => {
        boardRows = rows;
        boardErr = null;
        if (boardTimer) window.clearTimeout(boardTimer);
        if (tab === 'board' && store.cur && !run) viewBoard();
      },
      (code) => {
        boardErr = code;
        if (boardTimer) window.clearTimeout(boardTimer);
        if (tab === 'board' && store.cur && !run) viewBoard();
      }
    );
    boardTimer = window.setTimeout(() => {
      if (boardRows === null) {
        boardErr = 'slow';
        if (tab === 'board' && store.cur && !run) viewBoard();
      }
    }, 10000);
  }

  /* ---------- discussion de la classe ---------- */
  function saveSeen() {
    try {
      localStorage.setItem(SEENK, JSON.stringify(chatSeen));
    } catch {
      // ignore
    }
  }
  function panelVisible(): boolean {
    return chatOpen || (window.matchMedia && window.matchMedia('(min-width:1100px)').matches);
  }
  function updateBadges() {
    let tot = 0;
    Object.keys(CHATS).forEach((k) => {
      tot += unread[k] || 0;
    });
    root.querySelectorAll<HTMLElement>('#chatpanel .chip[data-ch]').forEach((c) => {
      const n = unread[c.dataset.ch || ''] || 0;
      let b = c.querySelector('.bdg');
      if ((n && c.dataset.ch !== chatCh) || (n && !panelVisible())) {
        if (!b) {
          b = document.createElement('span');
          b.className = 'bdg';
          c.appendChild(b);
        }
        b.textContent = '+' + n;
      } else if (b) b.remove();
    });
    const f = $('#chatfab');
    if (f) {
      let b = f.querySelector('.bdg');
      if (tot) {
        if (!b) {
          b = document.createElement('span');
          b.className = 'bdg';
          f.appendChild(b);
        }
        b.textContent = '+' + tot;
      } else if (b) b.remove();
    }
    try {
      document.title = (tot ? '(' + tot + ') ' : '') + document.title.replace(/^\(\d+\) /, '');
    } catch {
      // ignore
    }
  }
  function recount() {
    Object.keys(CHATS).forEach((k) => {
      const rows = unreadRows[k];
      if (!rows) return;
      if (chatSeen[k] === undefined) {
        chatSeen[k] = rows.reduce((a, r) => Math.max(a, r.ts || 0), 0);
        saveSeen();
      }
      unread[k] = rows.filter((r) => typeof r.t === 'string' && (r.ts || 0) > chatSeen[k] && r.u !== UIDV).length;
    });
    updateBadges();
  }
  function markSeen() {
    if (!panelVisible() || !chatRows || !chatRows.length) {
      recount();
      return;
    }
    const m = Math.max(...chatRows.map((r) => r.ts || 0));
    if (m > (chatSeen[chatCh] || 0)) {
      chatSeen[chatCh] = m;
      saveSeen();
    }
    recount();
  }
  function chatList(): string {
    if (chatRows === null) {
      if (chatErr === 'schema')
        return '<p class="fine">Discussion prête dès que la migration Supabase (<code>coach_chat</code>) est appliquée.</p>';
      return '<p class="fine">' + (chatErr ? 'Impossible de charger la discussion pour le moment.' : 'Chargement de la discussion…') + '</p>';
    }
    if (!chatRows.length) return '<p class="fine">Aucun message. Lance la discussion.</p>';
    return (
      '<ul class="chat">' +
      chatRows
        .filter((r) => typeof r.t === 'string')
        .map((r) => {
          const d = new Date(r.ts || 0);
          const tm =
            d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
            ' ' +
            d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return (
            '<li style="--uc:' +
            userColor({ id: r.u, n: r.n }) +
            '"><span class="who2" style="color:var(--uc)">' +
            esc(r.n || 'Anonyme') +
            '</span><span class="tm">' +
            esc(tm) +
            '</span><br>' +
            esc(r.t) +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }
  function paintChat() {
    const el = $('#chatlist');
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.innerHTML = chatList();
    if (near) el.scrollTop = el.scrollHeight;
    markSeen();
  }
  function renderPanel() {
    const p = $('#chatpanel');
    const fab = $('#chatfab');
    if (!p || !fab) return;
    const on = !!store.cur;
    p.hidden = !on;
    fab.hidden = !on || chatOpen;
    document.body.classList.toggle('hasside', on);
    if (!on) return;
    p.classList.toggle('open', chatOpen);
    const keep = $('#chatin') ? document.activeElement === $('#chatin') : false;
    p.innerHTML =
      '<div class="cp-head"><b>Discussion</b><button class="link cp-close" data-act="chatclose">Fermer</button></div>' +
      (Object.keys(CHATS).length < 2
        ? ''
        : '<div class="chips cp-chips">' +
          Object.keys(CHATS)
            .map((k) => '<button class="chip" data-ch="' + k + '" aria-pressed="' + (k === chatCh) + '">' + esc(CHATS[k].name) + '</button>')
            .join('') +
          '</div>') +
      '<div id="chatlist" class="cp-list">' +
      chatList() +
      '</div>' +
      '<form id="chatf" class="cf"><input id="chatin" type="text" maxlength="280" placeholder="Écris un message…" autocomplete="off" value="' +
      esc(chatDraft) +
      '"><button class="btn" type="submit">Envoyer</button></form>' +
      (chatErr === 'send' ? '<p class="fine" style="margin:6px 0 0">Message non envoyé. Réessaie.</p>' : '') +
      '<p class="fine" style="margin:8px 0 0">Le prénom est affiché à côté de chaque message. Synchronisé en direct via Supabase.</p>';
    const l = $('#chatlist');
    if (l) l.scrollTop = l.scrollHeight;
    if (keep) {
      const i = $<HTMLInputElement>('#chatin');
      if (i) i.focus();
    }
    markSeen();
    updateBadges();
  }
  function subChat() {
    if (chatUnsub) return;
    const ch = chatCh;
    chatUnsub = subscribeChatMessages(
      CHATS[ch].coll,
      300,
      (rows) => {
        if (ch !== chatCh) return;
        chatRows = rows;
        chatRows.forEach((r) => noteUser(r.u, r.n));
        buildColors();
        chatErr = '';
        paintChat();
      },
      (code) => {
        if (ch !== chatCh) return;
        chatErr = code;
        paintChat();
      }
    );
  }
  function setChatCh(k: string) {
    if (!CHATS[k]) return;
    if (k !== chatCh || !chatUnsub) {
      if (chatUnsub) {
        chatUnsub();
        chatUnsub = null;
      }
      chatRows = null;
      chatErr = '';
      chatCh = k;
      subChat();
    }
    renderPanel();
  }
  function watchUnread() {
    if (unreadOn) return;
    unreadOn = true;
    Object.keys(CHATS).forEach((k) => {
      const u = subscribeChatMessages(
        CHATS[k].coll,
        50,
        (rows) => {
          unreadRows[k] = rows;
          rows.forEach((r) => noteUser(r.u, r.n));
          buildColors();
          if (k === chatCh) markSeen();
          else recount();
        },
        () => {}
      );
      unreadUnsubs.push(u);
    });
  }
  async function sendChat() {
    const t = chatDraft.trim();
    const p = P();
    if (!t || !p || Date.now() - chatLast < 1500) return;
    chatLast = Date.now();
    chatErr = '';
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const res = await postChatMessage(CHATS[chatCh].coll, {
      id,
      u: UIDV,
      n: p.name,
      t: t.slice(0, 280),
      ts: Date.now(),
    });
    if (res.ok) {
      chatDraft = '';
      const i = $<HTMLInputElement>('#chatin');
      if (i) i.value = '';
    } else {
      chatErr = res.missingTable ? 'schema' : 'send';
      renderPanel();
    }
  }

  /* ---------- classement ---------- */
  function viewBoard() {
    if (view === 'home') return;
    const p = P();
    if (!p) return;
    subBoard();
    if (p.share === true && !synced && !syncing && !triedSync) {
      triedSync = true;
      void syncBoard().then(() => {
        if (tab === 'board' && !run) viewBoard();
      });
    }
    let h =
      '<div class="stack"><div class="card intro"><div class="tag">Classement de la classe</div><h2>Qui est en tête ?</h2>' +
      '<p>Classé sur le meilleur score en simulation (sur 20), puis sur la moyenne. À côté de chaque prénom, un surnom qui dit sur quoi la personne bute le plus.</p>' +
      '<p class="fine" style="margin:0 0 12px">Ce qui est partagé : ton prénom, ton meilleur score, ta moyenne et ton thème le plus difficile. Rien d\'autre.</p>';
    h +=
      p.share === true
        ? '<div class="foot" style="justify-content:flex-start;margin-top:0"><span class="pill ok">Tu apparais au classement</span><button class="btn ghost" data-act="unshare">Me retirer</button></div>'
        : '<div class="foot" style="justify-content:flex-start;margin-top:0"><span class="pill none">Tu n\'apparais pas</span><button class="btn" data-act="share">Apparaître au classement</button></div>';
    if (p.share === true && !mySims().length) h += '<p class="fine">Termine une simulation ou un DS blanc pour entrer au classement.</p>';
    h += '</div>';

    if (boardErr && boardRows === null) {
      h +=
        '<div class="card"><p class="fine" style="margin:0">' +
        (boardErr === 'schema'
          ? 'Le classement temps réel Supabase (<code>coach_board</code>) s\'activera automatiquement dès le push sur GitHub.'
          : boardErr === 'slow'
            ? "Le classement met du temps à répondre. Il s'affichera dès que possible."
            : 'Impossible de charger le classement pour le moment.') +
        '</p></div>';
    } else if (boardRows === null) {
      h += '<div class="card"><p class="fine" style="margin:0">Chargement du classement…</p></div>';
    } else {
      const rows = boardRows
        .filter((r) => typeof r.best === 'number')
        .sort((a, b) => b.best - a.best || (b.avg || 0) - (a.avg || 0) || (b.sims || 0) - (a.sims || 0));
      if (!rows.length) {
        h += '<div class="card"><p class="fine" style="margin:0">Personne n\'est encore classé. Sois la première ou le premier : termine une simulation.</p></div>';
      } else {
        buildColors(rows);
        h += '<ol class="lbl">';
        rows.forEach((r, i) => {
          const me = r.id === UIDV;
          const wk = r.weak && NAME[r.weak];
          h +=
            '<li class="lb' +
            (me ? ' me' : '') +
            (i === 0 ? ' top1' : '') +
            '" style="--uc:' +
            userColor(r) +
            '"><span class="rk">' +
            (i + 1) +
            '</span><span class="av">' +
            (i === 0 ? CROWN : '') +
            esc((r.n || '?').trim().charAt(0).toUpperCase()) +
            '</span><div style="min-width:0"><span class="nm">' +
            esc(r.n || 'Anonyme') +
            '</span>' +
            (me ? ' <span class="pill ok">toi</span>' : '') +
            (i === 0 ? ' <span class="pill mid">en tête</span>' : '') +
            '<span class="pun">' +
            (wk ? 'Difficulté : ' + wk + ' · ' : '') +
            '<em>« ' +
            esc(punFor(r)) +
            ' »</em></span>' +
            (wk && r.wr !== undefined ? '<span class="sm">' + r.wr + ' % de réussite sur ce thème</span>' : '') +
            '<span class="sm"><em>' +
            esc(quipFor(r, i, rows.length)) +
            '</em></span></div><div class="sc">' +
            r.best +
            '<small>/20 · moy. ' +
            String(r.avg).replace('.', ',') +
            ' · ' +
            r.sims +
            ' simu.</small></div></li>';
        });
        h += '</ol>';
      }
    }
    const main = $('#main');
    if (main) main.innerHTML = h + '</div>';
  }

  /* ---------- moteur de questions (QCM + numérique) ---------- */
  function start(list: any[], feedback: 'now' | 'end', kind: 'sim' | 'train') {
    parked = null;
    parkUI();
    revFilter = 'all';
    run = {
      sub: SUB,
      list,
      i: 0,
      ans: Array(list.length).fill(null),
      sel: Array(list.length).fill(null),
      feedback,
      kind,
      saved: false,
    };
    draw();
    window.scrollTo({ top: 0 });
  }

  function qCard(q: any): string {
    const a = run.ans[run.i];
    const done = a !== null;
    const sel = run.sel[run.i];
    const now = run.feedback === 'now';
    let h = '<div class="card"><div class="tag">' + (NAME[q.topic] || q.topic) + '</div>' + qHead(q);
    if (q.stdin) h += '<div class="stdin"><b>Saisie au clavier :</b>' + esc(q.stdin.replace(/\n$/, '')) + '⏎</div>';
    if (!q.opts) {
      const ok = done && isRight(q, a);
      h +=
        '<div class="numrow' +
        (done && now ? (ok ? ' right' : ' wrong') : '') +
        '"><input id="numin" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
        (q.t === 'str' ? 'Ta réponse (ex. 1011)' : 'Ta réponse') +
        '" value="' +
        esc(done ? a : sel || '') +
        '"' +
        (done ? ' disabled' : '') +
        '>' +
        (q.unit ? '<span class="u">' + esc(q.unit) + '</span>' : '') +
        '</div>';
      if (done && now)
        h +=
          '<div class="why ' +
          (ok ? 'ok' : 'ko') +
          '"><b>' +
          (ok ? 'Bien vu' : 'Bonne réponse : ' + esc(q.solTxt) + (q.unit ? ' ' + esc(q.unit) : '')) +
          '</b>' +
          esc(q.why) +
          '</div>';
      return h + '</div>';
    }
    h += '<ul class="opts">';
    q.opts.forEach((o: string, k: number) => {
      let cls = 'opt';
      let mark = '';
      if (done && now) {
        if (k === q.ans) {
          cls += ' right';
          mark = '✓ juste';
        } else if (k === a) {
          cls += ' wrong';
          mark = '✗ ta réponse';
        }
      } else if ((done && k === a) || (!done && k === sel)) cls += ' picked';
      h +=
        '<li><button class="' +
        cls +
        '" data-o="' +
        k +
        '"' +
        (done ? ' disabled' : '') +
        '><span class="l">' +
        L[k] +
        '</span><pre>' +
        (q.oh ? o : esc(o)) +
        '</pre><span class="mark">' +
        mark +
        '</span></button></li>';
    });
    h += '</ul>';
    if (done && now) {
      const ok = a === q.ans;
      h += '<div class="why ' + (ok ? 'ok' : 'ko') + '"><b>' + (ok ? 'Bien vu' : 'Réponse : ' + L[q.ans]) + '</b>' + esc(q.why) + '</div>';
    }
    return h + '</div>';
  }

  function result(): string {
    const list = run.list;
    const ok = list.map((q: any, k: number) => isRight(q, run.ans[k]));
    const sc = ok.filter(Boolean).length;
    const n = list.length;
    missed = list.filter((_: any, k: number) => !ok[k]);
    const by: Record<string, [number, number]> = {};
    list.forEach((q: any, k: number) => {
      by[q.topic] = by[q.topic] || [0, 0];
      by[q.topic][1]++;
      if (ok[k]) by[q.topic][0]++;
    });
    if (run.kind === 'sim' && !run.saved) {
      run.saved = true;
      P().sims.push({ ts: Date.now(), score: sc, n, by, s: SUB });
      if (P().sims.length > 120) P().sims.shift();
      save();
    }
    if (!run.syncStarted) {
      run.syncStarted = true;
      void syncBoard().then(() => {
        const el = $('#syncnote');
        if (el) el.textContent = syncMsg();
      });
    }
    let h = '<div class="card"><div class="tag">' + (run.kind === 'sim' ? 'Simulation DS' : 'Entraînement') + ' terminé</div>';
    h += '<p class="score">' + sc + '<small> / ' + n + '</small></p>';
    h +=
      '<p class="sub">' +
      (sc === n ? 'Sans faute. ' : missed.length + ' erreur' + (missed.length > 1 ? 's' : '') + '. ') +
      'Toutes les questions sont corrigées et expliquées plus bas, réussies comme ratées.' +
      (memOnly ? ' Ton navigateur bloque la mémorisation : cette séance ne sera pas gardée.' : ' Résultat enregistré dans ton suivi.') +
      '</p><div class="rows">';
    TOPICS.forEach(([k, nm]) => {
      if (!by[k]) return;
      const [a, b] = by[k];
      const r = a / b;
      h +=
        '<div class="row"><span>' +
        nm +
        '</span><div class="track"><i class="' +
        (r < 0.5 ? 'bad' : r < 0.8 ? 'mid' : '') +
        '" style="width:' +
        r * 100 +
        '%"></i></div><span class="v">' +
        a +
        '/' +
        b +
        '</span></div>';
    });
    h +=
      '</div><p class="fine" id="syncnote">' +
      esc(syncMsg()) +
      '</p><div class="foot"><button class="btn" data-act="again">' +
      (run.kind === 'sim' ? 'Nouveau tirage' : 'Terminer') +
      '</button>';
    if (missed.length)
      h += '<button class="btn ghost" data-act="redo">Refaire les ' + missed.length + ' ratée' + (missed.length > 1 ? 's' : '') + '</button>';
    h += '<button class="btn ghost" data-act="goto:suivi">Voir mon suivi</button></div></div>';
    h += '<div style="margin-top:16px">' + adviceCard() + '</div>';
    h +=
      '<div class="rev"><div class="revhead"><h3>Correction détaillée</h3><div class="chips">' +
      '<button class="chip" data-f="all" aria-pressed="' +
      (revFilter === 'all') +
      '">Toutes<small>' +
      n +
      '</small></button>' +
      '<button class="chip" data-f="ko" aria-pressed="' +
      (revFilter === 'ko') +
      '">Erreurs<small>' +
      missed.length +
      '</small></button></div></div>';
    let shown = 0;
    list.forEach((q: any, k: number) => {
      if (revFilter === 'ko' && ok[k]) return;
      shown++;
      const mine = run.ans[k];
      const st = mine === null ? ['none', 'Sans réponse'] : ok[k] ? ['ok', 'Réussie'] : ['ko', 'Ratée'];
      h +=
        '<div class="card"><div class="revtop"><span class="tag">Question ' +
        (k + 1) +
        ' · ' +
        (NAME[q.topic] || q.topic) +
        '</span><span class="pill ' +
        st[0] +
        '">' +
        st[1] +
        '</span></div><div style="margin-top:10px">' +
        qHead(q) +
        '</div>';
      if (q.stdin) h += '<div class="stdin"><b>Saisie :</b>' + esc(q.stdin.replace(/\n$/, '')) + '⏎</div>';
      if (q.opts) {
        h += '<ul class="opts">';
        q.opts.forEach((o: string, j: number) => {
          let cls = 'opt';
          let mark = '';
          if (j === q.ans) {
            cls += ' right';
            mark = mine === j ? '✓ ta réponse, juste' : '✓ bonne réponse';
          } else if (j === mine) {
            cls += ' wrong';
            mark = '✗ ta réponse';
          }
          h += '<li><div class="' + cls + '"><span class="l">' + L[j] + '</span><pre>' + (q.oh ? o : esc(o)) + '</pre><span class="mark">' + mark + '</span></div></li>';
        });
        h +=
          '</ul><div class="why ' +
          (ok[k] ? 'ok' : 'ko') +
          '"><b>' +
          (ok[k] ? "Pourquoi c'est juste" : 'Pourquoi ' + L[q.ans] + ' et pas ' + (mine === null ? 'une autre' : L[mine])) +
          '</b>' +
          esc(q.why) +
          '</div></div>';
      } else {
        h += solLine(q, mine, ok[k]) + '<div class="why ' + (ok[k] ? 'ok' : 'ko') + '"><b>' + (ok[k] ? "Pourquoi c'est juste" : 'Explication') + '</b>' + esc(q.why) + '</div></div>';
      }
    });
    if (!shown) h += '<p class="sub">Aucune erreur, rien à corriger.</p>';
    return h + '</div>';
  }

  function draw() {
    const m = $('#main');
    if (!m) return;
    if (run.i >= run.list.length) {
      m.innerHTML = result();
      window.scrollTo({ top: 0 });
      return;
    }
    const q = run.list[run.i];
    const n = run.list.length;
    const done = run.ans[run.i] !== null;
    const answered = run.ans.filter((x: any) => x !== null).length;
    let h = '<div class="bar"><span>' + (run.i + 1) + ' / ' + n + '</span><div class="track"><i style="width:' + (answered / n) * 100 + '%"></i></div>';
    if (run.feedback === 'now') {
      const sc = run.ans.reduce((t: number, a: any, k: number) => t + (isRight(run.list[k], a) ? 1 : 0), 0);
      h += '<span>' + sc + ' juste' + (sc > 1 ? 's' : '') + '</span>';
    }
    h += '</div>' + qCard(q);
    h += '<div class="foot"><button class="btn ghost" id="prev"' + (run.i === 0 ? ' disabled' : '') + '>Précédente</button>';
    if (done) h += '<button class="btn" id="next">' + (run.i === n - 1 ? 'Voir le résultat' : 'Suivante') + '</button></div>';
    else
      h +=
        '<button class="btn" id="val"' +
        (run.sel[run.i] === null ? ' disabled' : '') +
        '>Valider' +
        (run.feedback === 'end' && run.i === n - 1 ? ' et terminer' : '') +
        '</button></div>';
    m.innerHTML = h;
    const ni = $<HTMLInputElement>('#numin');
    if (ni && !ni.disabled) ni.focus({ preventScroll: true });
  }

  /* ---------- vues standards ---------- */
  function gate() {
    const names = Object.values(store.profiles).map((p: any) => p.name);
    let h =
      '<div class="card intro"><div class="tag">Avant de commencer</div><h2>Comment tu t\'appelles ?</h2>' +
      '<p>Ton prénom sert à garder tes résultats et à te conseiller sur ce que tu dois travailler. Chaque personne a son propre suivi.</p>' +
      '<form id="gate"><div class="field"><input id="name" type="text" maxlength="24" autocomplete="off" placeholder="Ton prénom" aria-label="Ton prénom"><button class="btn" type="submit">Commencer</button></div>' +
      '<label class="check"><input type="checkbox" id="share" checked><span>Apparaître au classement de la classe (prénom, meilleur score, thème difficile). Tu peux te retirer à tout moment.</span></label></form>';
    if (names.length) {
      h +=
        '<p class="label" style="margin-top:6px">Déjà utilisés sur cet appareil</p><div class="chips">' +
        Object.keys(store.profiles)
          .map((k) => '<button class="chip" data-who="' + esc(k) + '">' + esc(store.profiles[k].name) + '</button>')
          .join('') +
        '</div>';
    }
    h +=
      '<p class="fine">' +
      (memOnly
        ? "Ton navigateur bloque l'enregistrement : le suivi ne sera pas gardé après la fermeture de la page."
        : 'Le suivi est enregistré dans ce navigateur et synchronisé via Supabase.') +
      '</p></div>';
    const main = $('#main');
    if (main) main.innerHTML = h;
    const i = $<HTMLInputElement>('#name');
    if (i) i.focus({ preventScroll: true });
  }

  function viewSim() {
    const unseen = QS.filter((q) => stat(q.id)[0] === 0).length;
    const rep = TOPICS.map(([k, nm]) => nm.toLowerCase() + ' (' + QUOTA[k] + ')').join(', ');
    const main = $('#main');
    if (!main) return;
    main.innerHTML =
      '<div class="card intro"><div class="tag">Simulation · ' +
      esc(CFG[SUB].name) +
      '</div><h2>' +
      CFG[SUB].simTitle +
      '</h2>' +
      '<p>Un tirage qui respecte la répartition du programme : ' +
      rep +
      '.</p>' +
      '<ul><li>Tu choisis une réponse (ou tu tapes ton résultat), tu peux encore la changer, puis tu cliques sur Valider : elle est alors verrouillée, comme le jour du DS.</li>' +
      "<li>Pas de correction pendant le test. À la fin : ta note, le détail par thème, un conseil, et l'explication de chaque question.</li>" +
      '<li>Le tirage favorise les questions que tu n\'as pas encore vues (' +
      unseen +
      ' sur ' +
      QS.length +
      ') et celles que tu as ratées.</li></ul>' +
      '<button class="btn" id="go">Commencer</button></div>';
  }

  function viewTrain() {
    const ts = topicStats();
    const pool = topic === 'all' ? QS : QS.filter((q) => q.topic === topic);
    const n = count === 'all' ? pool.length : Math.min(count, pool.length);
    let h =
      '<p class="label">Thème</p><div class="chips"><button class="chip" data-c="all" aria-pressed="' +
      (topic === 'all') +
      '">Tout<small>' +
      QS.length +
      '</small></button>';
    TOPICS.forEach(([k, nm]) => {
      h += '<button class="chip" data-c="' + k + '" aria-pressed="' + (topic === k) + '">' + nm + '<small>' + ts[k].total + '</small></button>';
    });
    h +=
      '</div><p class="label">Nombre de questions</p><div class="chips"><button class="chip" data-n="10" aria-pressed="' +
      (count === 10) +
      '">10</button><button class="chip" data-n="all" aria-pressed="' +
      (count === 'all') +
      '">Toutes</button></div>' +
      '<div class="card intro"><div class="tag">Entraînement</div><h2>' +
      n +
      ' questions' +
      (topic === 'all' ? '' : ' · ' + NAME[topic]) +
      '</h2>' +
      "<p>Tu choisis une réponse, tu peux la changer, puis tu cliques sur Valider : la correction s'affiche aussitôt. Les questions ratées ou jamais vues reviennent en premier.</p><button class=\"btn\" id=\"go\">Commencer</button></div>";
    const main = $('#main');
    if (main) main.innerHTML = h;
  }

  /* ---------- Aide-mémoire & Annales PDF ---------- */
  function viewMemo() {
    let h = '<div class="memo">';
    (MEMO_ALL[SUB] || []).forEach(([k, t, items]: [string, string, string[]]) => {
      h +=
        '<details' +
        (k === memoOpen ? ' open' : '') +
        ' id="m-' +
        k +
        '"><summary>' +
        t +
        '</summary><ul>' +
        items.map((i) => '<li' + (i.indexOf('<div class="m') === 0 ? ' class="blk"' : '') + '>' + i + '</li>').join('') +
        '</ul></details>';
    });
    h +=
      '</div>' +
      (SUB === 'c'
        ? '<p class="note">Les fonctions fournies sont à la fin du polycopié de cours, autorisé demain.</p>'
        : '<p class="note">Ces fiches rappellent l\'essentiel issu du cours Moodle : elles ne remplacent pas ton polycopié.</p>');
    const main = $('#main');
    if (main) main.innerHTML = h;
  }

  async function dlPdf(key: string) {
    const id = key.slice(1);
    const kind = key.charAt(0);
    const a = ANN.find((x) => x.id === id);
    if (!a) return;
    const note = $('#dl-' + key);
    const url = kind === 'c' ? a.curl : a.surl;
    const filename = kind === 'c' ? a.cfile : a.file;
    if (!url) return;
    if (note) note.textContent = 'Téléchargement…';
    const ok = await downloadPdfFile(url, filename);
    if (note) note.textContent = ok ? 'Enregistré.' : 'Téléchargement impossible pour le moment.';
  }

  function togglePdf(key: string) {
    const id = key.slice(1);
    const kind = key.charAt(0);
    const a = ANN.find((x) => x.id === id);
    if (!a) return;
    const box = $('#vw-' + key);
    const btn = root.querySelector('[data-view-pdf="' + key + '"]');
    if (!box) return;
    if (!box.hidden) {
      box.hidden = true;
      box.innerHTML = '';
      if (btn) btn.textContent = 'Visualiser';
      return;
    }
    const pg: string[] = kind === 'c' ? a.cpages : a.spages;
    box.innerHTML = pg
      .map((u, i) => '<img loading="lazy" src="' + u + '" alt="' + (kind === 'c' ? 'Correction' : 'Sujet') + ' ' + esc(a.title) + ', page ' + (i + 1) + '">')
      .join('');
    box.hidden = false;
    if (btn) btn.textContent = 'Masquer';
  }

  function pdfAnnalesCards(subKey: string): string {
    const list = ANN.filter((a) => (a.s || 'e') === subKey).slice().reverse();
    if (!list.length) return '';
    return list
      .map((a) => {
        const blk = (k: string, label: string) => {
          const key = k + a.id;
          return (
            '<div class="pdfrow"><b>' +
            label +
            '</b><div class="acts"><button class="btn ghost" data-view-pdf="' +
            key +
            '">Visualiser</button><button class="btn" data-pdf="' +
            key +
            '">Télécharger (PDF)</button></div><p class="fine" id="dl-' +
            key +
            '" style="margin:2px 0 0"></p><div class="viewer" id="vw-' +
            key +
            '" hidden></div></div>'
          );
        };
        return (
          '<div class="card"><h2>' +
          esc(a.title) +
          '</h2><span class="meta">' +
          esc(a.meta || 'DS du ' + a.date) +
          '</span>' +
          (a.surl ? blk('s', 'Sujet (PDF officiel)') : '') +
          (a.curl ? blk('c', 'Correction (après chaque exercice : énoncé résumé, puis correction)') : '') +
          (a.todo ? '<p class="todo">' + esc(a.todo) + '</p>' : '') +
          '</div>'
        );
      })
      .join('');
  }

  function viewElen() {
    const h =
      '<div class="ann"><div class="card"><div class="tag">ELEN numérique · annales</div><h2>Les DS des années précédentes</h2>' +
      "<p class=\"fine\" style=\"margin:6px 0 0\">Sujets des DS de Logique / Électronique numérique 3A E&amp;T, EII. Les corrections ne sont pas officielles, vérifie-les avec ton cours et ta feuille. Les schémas à dessiner (graphes d'états, chronogrammes) ne sont pas tous corrigés.</p></div>" +
      pdfAnnalesCards('e') +
      '</div>';
    const main = $('#main');
    if (main) main.innerHTML = h;
  }

  /* ---------- DS blancs, matrices, grilles, éditeurs SVG, RISC-V, Shell ---------- */
  function dsFmt(sec: number): string {
    sec = Math.max(0, sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const x = sec % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
  }
  function dsTick() {
    const el = $('#dstimer');
    if (!el || !dsRun) return;
    const left = dsRun.dur * 60 - Math.floor((Date.now() - dsRun.start) / 1000);
    el.textContent = left > 0 ? dsFmt(left) : 'Temps écoulé';
  }
  function dsSujet() {
    return dsRun ? DS.find((x) => x.id === dsRun.id) : null;
  }
  function dsCell(k: string, g: string, r: number, c: number) {
    dsRun.cells = dsRun.cells || {};
    return dsRun.cells[k + ':' + g + ':' + r + ':' + c];
  }
  function dsGrid(k: string, g: string, n: number, m: number): Array<Array<number | null>> {
    const M: Array<Array<number | null>> = [];
    for (let i = 0; i < n; i++) {
      const row: Array<number | null> = [];
      for (let j = 0; j < m; j++) row.push(pn(dsCell(k, g, i, j)));
      M.push(row);
    }
    return M;
  }
  function diagCheck(u: any, k: string) {
    const n = u.n;
    const A = u.A.map((r: any[]) => r.map(pn));
    const res: any = { v: dsRun.sel[k], cols: [], pinv: false, frac: 0 };
    if (!u.diag) {
      res.frac = res.v === 1 ? 1 : 0;
      return res;
    }
    if (res.v !== 0) return res;
    const D = dsGrid(k, 'D', n, n);
    const P = dsGrid(k, 'P', n, n);
    const Q = dsGrid(k, 'Q', n, n);
    const inv = allNum(P) && Math.abs(detN(P)) > 1e-9;
    let ok = 0;
    for (let j = 0; j < n; j++) {
      let good = false;
      if (allNum(P) && allNum(D)) {
        const col = P.map((r) => r[j]);
        const d = D[j][j];
        const nz = col.some((x) => Math.abs(x) > 1e-9);
        const Ap = A.map((r: number[]) => r.reduce((t, x, i) => t + x * col[i], 0));
        const offd = D[j].every((x, i) => i === j || Math.abs(x) < 1e-9);
        good = nz && offd && Ap.every((x: number, i: number) => Math.abs(x - d * col[i]) < 1e-6);
      }
      res.cols.push(good);
      if (good) ok++;
    }
    let dp = ok / n;
    if (!inv) dp *= 0.5;
    if (allNum(P) && allNum(Q) && inv) {
      res.pinv = matMul(P, Q).every((r, i) => r.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-6));
    }
    res.frac = 0.3 + 0.5 * dp + 0.2 * (res.pinv ? 1 : 0);
    return res;
  }

  function gNorm(u: any, v: unknown): string {
    let s = String(v == null ? '' : v)
      .trim()
      .toLowerCase()
      .replace(/[\s_]/g, '')
      .replace(/[−–—]/g, '-');
    if (u.norm === 'bit' || u.norm === 'bits') return s;
    s = s.replace(/^0x/, '').replace(/^0+(?=.)/, '');
    return s;
  }
  function gridCounts(u: any, k: string) {
    let ok = 0;
    let n = 0;
    for (let i = 0; i < u.n; i++) {
      for (let j = 0; j < u.m; j++) {
        if (u.ans[i][j] === null) continue;
        n++;
        if (gNorm(u, dsCell(k, 'G', i, j)) === gNorm(u, u.ans[i][j])) ok++;
      }
    }
    return { ok, n };
  }
  function gridFrac(u: any, k: string) {
    const c = gridCounts(u, k);
    return c.n ? c.ok / c.n : 0;
  }

  // Interactive SVG editor state bridge
  function edU(k: string) {
    const a = String(k).split('.');
    return dsSujet().ex[+a[0]].subs[+a[1]];
  }
  function edGet(u: any, k: string) {
    dsRun.ed = dsRun.ed || {};
    if (!dsRun.ed[k]) {
      dsRun.ed[k] = isSubjectKind(u.kind)
        ? subInit(u)
        : u.kind === 'fsm'
          ? fsmInit(u)
          : u.kind === 'circ'
            ? circInit(u)
            : chronoInit(u);
    }
    return dsRun.ed[k];
  }
  function edWidget(u: any, k: string, s: any) {
    if (isSubjectKind(u.kind)) return subWidget(u, k, s);
    return u.kind === 'fsm' ? fsmWidget(u, k, s) : u.kind === 'circ' ? circWidget(u, k, s) : chronoWidget(u, k, s);
  }
  function edRender(k: string) {
    const w = $('#ed-' + k);
    if (!w) return;
    const u = edU(k);
    w.innerHTML = edWidget(u, k, edGet(u, k));
  }
  function edDraw(k: string) {
    const u = edU(k);
    const s = edGet(u, k);
    const sv = $('#edsvg-' + k);
    if (!sv) return;
    sv.innerHTML = u.kind === 'fsm' ? fsmInner(u, s, k, {}) : u.kind === 'circ' ? circInner(u, s, k, {}) : chronoInner(u, s, k, {});
  }
  function edPt(sv: SVGSVGElement, e: PointerEvent) {
    const r = sv.getBoundingClientRect();
    const vb = sv.viewBox.baseVal;
    return { x: ((e.clientX - r.left) * vb.width) / r.width, y: ((e.clientY - r.top) * vb.height) / r.height };
  }
  function edFrac(u: any, k: string) {
    const s = edGet(u, k);
    if (isSubjectKind(u.kind)) return subFrac(u, s);
    return u.kind === 'fsm' ? fsmFrac(u, s) : u.kind === 'circ' ? circFrac(u, s) : chronoFrac(u, s);
  }

  let _drag: any = null;
  let _pend: any = null;

  const EDX: Record<string, any> = {
    fsm: {
      act(u: any, k: string, s: any, a: string, arg: string) {
        if (a === 'addst') {
          const p = fsmFree(u, s);
          const id = 's' + s.nid++;
          const names = s.st.map((x: any) => x.name);
          let i = s.st.length;
          while (names.indexOf('S' + i) >= 0) i++;
          s.st.push({ id, name: 'S' + i, out: '', init: s.st.length === 0, x: p.x, y: p.y });
          s.sel = { t: 's', id };
          s.mode = 'sel';
          s.src = null;
        } else if (a === 'addtr') {
          if (s.st.length === 0) return;
          s.mode = s.mode === 'trans' ? 'sel' : 'trans';
          s.src = null;
          s.sel = null;
        } else if (a === 'init') {
          s.st.forEach((x: any) => {
            x.init = x.id === arg;
          });
        } else if (a === 'del') {
          if (s.sel) {
            if (s.sel.t === 's') {
              s.tr = s.tr.filter((t: any) => t.from !== s.sel.id && t.to !== s.sel.id);
              s.st = s.st.filter((x: any) => x.id !== s.sel.id);
            } else s.tr = s.tr.filter((t: any) => t.id !== s.sel.id);
            s.sel = null;
          }
        } else if (a === 'clear') {
          s.st = [];
          s.tr = [];
          s.sel = null;
          s.mode = 'sel';
          s.src = null;
        }
        edRender(k);
      },
      inp(_u: any, k: string, s: any, f: string, v: string) {
        const sel = s.sel;
        if (!sel) return;
        if (sel.t === 's') {
          const a = s.st.find((x: any) => x.id === sel.id);
          if (!a) return;
          if (f === 'name') a.name = v;
          else if (f === 'sout') a.out = v;
        } else {
          const t = s.tr.find((x: any) => x.id === sel.id);
          if (!t) return;
          if (f === 'cond') t.cond = v;
          else if (f === 'tout') t.out = v;
        }
        edDraw(k);
      },
      down(e: PointerEvent, sv: SVGSVGElement, k: string, u: any, s: any) {
        const target = e.target as Element;
        const p0 = edPt(sv, e);
        const st = target.closest('.edst') as HTMLElement | null;
        const tr = target.closest('.edtr') as HTMLElement | null;
        if (st) {
          const a = s.st.find((x: any) => x.id === st.dataset.sid);
          if (!a) return;
          const dx = p0.x - a.x;
          const dy = p0.y - a.y;
          _drag = {
            sv,
            p0,
            moved: false,
            move(p: { x: number; y: number }) {
              a.x = Math.max(FR, Math.min(600 - FR, p.x - dx));
              a.y = Math.max(FR, Math.min((u.h || 360) - FR, p.y - dy));
              edDraw(k);
            },
            tap() {
              if (s.mode === 'trans') {
                if (!s.src) s.src = a.id;
                else {
                  const t = { id: 't' + s.nid++, from: s.src, to: a.id, cond: '', out: '' };
                  s.tr.push(t);
                  s.mode = 'sel';
                  s.src = null;
                  s.sel = { t: 't', id: t.id };
                }
              } else s.sel = { t: 's', id: a.id };
              edRender(k);
            },
          };
          e.preventDefault();
          return;
        }
        if (tr) {
          _drag = {
            sv,
            p0,
            moved: false,
            move() {},
            tap() {
              if (s.mode === 'trans') return;
              s.sel = { t: 't', id: tr.dataset.tid };
              edRender(k);
            },
          };
          e.preventDefault();
          return;
        }
        _drag = {
          sv,
          p0,
          moved: false,
          move() {},
          tap() {
            if (s.mode === 'trans') return;
            if (s.sel && s.sel.t === 's') {
              const a = s.st.find((x: any) => x.id === s.sel.id);
              if (a) {
                a.x = Math.max(FR, Math.min(600 - FR, p0.x));
                a.y = Math.max(FR, Math.min((u.h || 360) - FR, p0.y));
                edRender(k);
                return;
              }
            }
            s.sel = null;
            edRender(k);
          },
        };
        e.preventDefault();
      },
    },
    circ: {
      act(u: any, k: string, s: any, a: string, arg: string) {
        if (a === 'add') {
          const p = circFree(u, s, arg);
          const id = 'n' + s.nid++;
          const n: any = { id, t: arg, x: p.x, y: p.y, name: '', n: 2 };
          if (arg === 'in' || arg === 'out') {
            const lst = (arg === 'in' ? u.inputs : u.outputs) || [];
            const used = s.nodes.filter((x: any) => x.t === arg).map((x: any) => x.name);
            n.name = lst.filter((x: string) => used.indexOf(x) < 0)[0] || lst[0] || '?';
          }
          s.nodes.push(n);
          s.sel = { t: 'n', id };
          s.arm = null;
        } else if (a === 'del') {
          if (s.sel) {
            if (s.sel.t === 'n') circDelNode(s, s.sel.id);
            else s.wires = s.wires.filter((w: any) => w.id !== s.sel.id);
            s.sel = null;
          }
        } else if (a === 'fan') {
          const n = s.nodes.find((x: any) => s.sel && x.id === s.sel.id);
          if (n) {
            const m = Math.max(2, Math.min(4, (n.n || 2) + +arg));
            if (m < (n.n || 2))
              s.wires = s.wires.filter((w: any) => {
                const q = w.b.split('.');
                return !(q[0] === n.id && +q[1].slice(1) >= m);
              });
            n.n = m;
          }
        } else if (a === 'clear') {
          s.nodes = [];
          s.wires = [];
          s.sel = null;
          s.arm = null;
        } else if (a === 'disarm') {
          s.arm = null;
        }
        edRender(k);
      },
      chg(_u: any, k: string, s: any, f: string, v: string) {
        const n = s.nodes.find((x: any) => s.sel && x.id === s.sel.id);
        if (n && f === 'name') {
          n.name = v;
          edDraw(k);
        }
      },
      down(e: PointerEvent, sv: SVGSVGElement, k: string, u: any, s: any) {
        const target = e.target as Element;
        const p0 = edPt(sv, e);
        const pin = target.closest('.edpin') as HTMLElement | null;
        const nd = target.closest('.ednode') as HTMLElement | null;
        const wr = target.closest('.edwire') as HTMLElement | null;
        if (pin) {
          _drag = {
            sv,
            p0,
            moved: false,
            move() {},
            tap() {
              const key = pin.dataset.pin!;
              const dir = pin.dataset.dir!;
              if (!s.arm) s.arm = { pin: key, dir };
              else if (s.arm.pin === key) s.arm = null;
              else if (s.arm.dir === dir) s.arm = { pin: key, dir };
              else {
                const a = dir === 'i' ? s.arm.pin : key;
                const b = dir === 'i' ? key : s.arm.pin;
                if (a.split('.')[0] !== b.split('.')[0]) {
                  s.wires = s.wires.filter((w: any) => w.b !== b);
                  s.wires.push({ id: 'w' + s.nid++, a, b });
                }
                s.arm = null;
              }
              s.sel = null;
              edRender(k);
            },
          };
          e.preventDefault();
          return;
        }
        if (nd) {
          const n = s.nodes.find((x: any) => x.id === nd.dataset.nid);
          if (!n) return;
          const dx = p0.x - n.x;
          const dy = p0.y - n.y;
          const W = u.w || 640;
          const H = u.h || 340;
          _drag = {
            sv,
            p0,
            moved: false,
            move(p: { x: number; y: number }) {
              n.x = Math.max(8, Math.min(W - 90, p.x - dx));
              n.y = Math.max(4, Math.min(H - circBox(n).h - 4, p.y - dy));
              edDraw(k);
            },
            tap() {
              s.sel = { t: 'n', id: n.id };
              s.arm = null;
              edRender(k);
            },
          };
          e.preventDefault();
          return;
        }
        if (wr) {
          _drag = {
            sv,
            p0,
            moved: false,
            move() {},
            tap() {
              s.sel = { t: 'w', id: wr.dataset.wid };
              s.arm = null;
              edRender(k);
            },
          };
          e.preventDefault();
          return;
        }
        _drag = {
          sv,
          p0,
          moved: false,
          move() {},
          tap() {
            if (s.arm) {
              s.arm = null;
              edRender(k);
              return;
            }
            const n = s.nodes.find((x: any) => s.sel && s.sel.t === 'n' && x.id === s.sel.id);
            const W = u.w || 640;
            const H = u.h || 340;
            if (n) {
              n.x = Math.max(8, Math.min(W - 90, p0.x - 20));
              n.y = Math.max(4, Math.min(H - circBox(n).h - 4, p0.y - circBox(n).h / 2));
              edRender(k);
              return;
            }
            s.sel = null;
            edRender(k);
          },
        };
        e.preventDefault();
      },
    },
    chrono: {
      act(u: any, k: string, s: any, a: string) {
        if (a === 'clear') {
          (u.ask || []).forEach((nm: string) => {
            s.v[nm] = s.v[nm].map(() => null);
          });
        } else if (a === 'fill0') {
          (u.ask || []).forEach((nm: string) => {
            s.v[nm] = s.v[nm].map((x: any) => (x == null ? 0 : x));
          });
        }
        edDraw(k);
      },
      down(e: PointerEvent, sv: SVGSVGElement, k: string, _u: any, s: any) {
        const c = (e.target as Element).closest('.edcell') as HTMLElement | null;
        if (!c) return;
        const a = (c.dataset.cc || '').split('|');
        const nm = a[0];
        const i = +a[1];
        _drag = {
          sv,
          p0: edPt(sv, e),
          moved: false,
          move() {},
          tap() {
            const v = s.v[nm][i];
            s.v[nm][i] = v == null ? 1 : v ? 0 : 1;
            edDraw(k);
          },
        };
        e.preventDefault();
      },
    },
  };

  function kindFrac(u: any, k: string): number {
    if (u.kind === 'grid') return gridFrac(u, k);
    if (u.kind === 'cmd') return cmdEval(u, dsRun.ans[k]).frac;
    if (u.kind === 'asm') {
      const r = asmEval(u, dsRun.ans[k]);
      return r.n && !r.err && !r.empty ? r.passed / r.n : 0;
    }
    if (u.kind === 'fsm' || u.kind === 'circ' || u.kind === 'chrono' || isSubjectKind(u.kind)) return edFrac(u, k);
    if (u.kind === 'num') {
      const got = pn(dsRun.ans[k]);
      const want = pn(u.ans);
      if (got === null || want === null) return 0;
      const tol = Math.max(1e-6, Math.abs(want) * 0.01);
      return Math.abs(got - want) <= tol ? 1 : 0;
    }
    if (u.kind === 'diag') return diagCheck(u, k).frac;
    if (u.kind === 'mat') {
      let ok = 0;
      const n = u.n * u.m;
      for (let i = 0; i < u.n; i++)
        for (let j = 0; j < u.m; j++) if (eqn(pn(dsCell(k, 'M', i, j)), pn(u.ans[i][j]))) ok++;
      return ok === n ? 1 : (ok / n) * 0.5;
    }
    if (u.kind === 'nums') {
      let ok = 0;
      let n = 0;
      u.items.forEach((it: any, i: number) => {
        if (it.ans !== null && it.ans !== undefined && it.ans !== '') {
          n++;
          if (eqn(pn(dsCell(k, 'N', 0, i)), pn(it.ans))) ok++;
        }
      });
      return n ? ok / n : 0;
    }
    return 0;
  }

  function gridHtml(k: string, g: string, name: string, n: number, m: number, corr: boolean, mark: ((i: number, j: number) => boolean) | null): string {
    let h = '<div class="mxrow"><span class="nm">' + name + ' =</span><span class="mxin" style="grid-template-columns:repeat(' + m + ',auto)">';
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++) {
        const v = dsCell(k, g, i, j) || '';
        let c = '';
        if (corr && mark) c = mark(i, j) ? 'good' : 'wrong';
        else if (v && pn(v) === null) c = 'bad';
        h +=
          '<input type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" aria-label="' +
          name.replace(/<[^>]*>/g, '') +
          ' ligne ' +
          (i + 1) +
          ' colonne ' +
          (j + 1) +
          '" data-dsc="' +
          k +
          ':' +
          g +
          ':' +
          i +
          ':' +
          j +
          '" class="' +
          c +
          '" value="' +
          esc(v) +
          '"' +
          (corr ? ' readonly' : '') +
          '>';
      }
    return h + '</span></div>';
  }

  function gridKind(u: any, k: string, corr: boolean, h: string): string {
    let mx = 1;
    for (let i = 0; i < u.n; i++)
      for (let j = 0; j < u.m; j++) {
        const a = u.ans[i][j];
        if (a !== null && String(a).length > mx) mx = String(a).length;
      }
    const w = Math.max(2.6, mx * 0.78 + 1.6);
    h += '<div class="gwrap"><table class="gtab"><tr><th>' + (u.corner || '') + '</th>' + u.cl.map((c: string) => '<th>' + c + '</th>').join('') + '</tr>';
    for (let i = 0; i < u.n; i++) {
      h += '<tr><th>' + u.rl[i] + '</th>';
      for (let j = 0; j < u.m; j++) {
        const a = u.ans[i][j];
        if (a === null) {
          h += '<td>' + ((u.fix && u.fix[i] && u.fix[i][j]) || '') + '</td>';
          continue;
        }
        const v = dsCell(k, 'G', i, j) || '';
        const c = corr ? (gNorm(u, v) === gNorm(u, a) ? 'good' : 'wrong') : '';
        h +=
          '<td><input type="text" inputmode="' +
          (u.norm === 'bit' || u.norm === 'bits' ? 'numeric' : 'text') +
          '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="' +
          String(u.rl[i]).replace(/<[^>]*>/g, '') +
          ' · ' +
          String(u.cl[j]).replace(/<[^>]*>/g, '') +
          '" data-dsg="' +
          k +
          ':G:' +
          i +
          ':' +
          j +
          '" class="' +
          c +
          '" style="width:' +
          w +
          'em" value="' +
          esc(v) +
          '"' +
          (corr ? ' readonly' : '') +
          '></td>';
      }
      h += '</tr>';
    }
    h += '</table></div>';
    if (!corr)
      h +=
        '<p class="fine" style="margin:0">' +
        (u.norm === 'bit' || u.norm === 'bits' ? 'Écris les bits (0 et 1), sans espace.' : 'Écris chaque valeur dans sa case.') +
        '</p>';
    else {
      const c = gridCounts(u, k);
      const f = c.n ? c.ok / c.n : 0;
      h +=
        '<p class="dsres">' +
        (f === 1
          ? 'Tout est juste'
          : c.ok + ' case' + (c.ok > 1 ? 's' : '') + ' juste' + (c.ok > 1 ? 's' : '') + ' sur ' + c.n + ' (les fausses sont en rouge)') +
        ' · ' +
        fpt(Math.round(u.pts * f * 100) / 100) +
        ' / ' +
        fpt(u.pts) +
        ' pt</p>';
      if (f < 1) {
        h +=
          '<details><summary class="fine">Voir les valeurs attendues</summary><div class="gwrap"><table class="gtab"><tr><th>' +
          (u.corner || '') +
          '</th>' +
          u.cl.map((col: string) => '<th>' + col + '</th>').join('') +
          '</tr>' +
          u.ans
            .map(
              (r: any[], i: number) =>
                '<tr><th>' +
                u.rl[i] +
                '</th>' +
                r.map((a, j) => '<td>' + (a === null ? (u.fix && u.fix[i] && u.fix[i][j]) || '' : esc(a)) + '</td>').join('') +
                '</tr>'
            )
            .join('') +
          '</table></div></details>';
      }
      h += '<div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
    }
    return h + '</div>';
  }

  function cmdKind(u: any, k: string, corr: boolean, h: string): string {
    const v = dsRun.ans[k] || '';
    if (!corr)
      return (
        h +
        '<textarea class="cmdta" data-dsa="' +
        k +
        '" rows="' +
        (u.rows || 2) +
        '" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="' +
        esc(u.ph || 'Tape ta réponse exactement comme dans un terminal…') +
        '">' +
        esc(v) +
        '</textarea>' +
        (u.hint ? '<p class="fine" style="margin:4px 0 0">' + u.hint + '</p>' : '') +
        '</div>'
      );
    const r = cmdEval(u, v);
    h += '<pre class="code plain" style="margin:6px 0">' + (r.empty ? '(pas de réponse)' : esc(v)) + '</pre>' + progChecks(r.items);
    h += '<p class="dsres">' + fpt(Math.round(u.pts * r.frac * 100) / 100) + ' / ' + fpt(u.pts) + ' pt</p><div class="dssol"><b>Correction.</b> ' + u.sol + '</div></div>';
    return h;
  }

  function asmKind(u: any, k: string, corr: boolean, h: string): string {
    const v = dsRun.ans[k] || '';
    if (u.pre) h += '<p class="fine" style="margin:4px 0">Déjà présent dans le programme :</p><pre class="code plain" style="margin:0 0 6px">' + esc(u.pre) + '</pre>';
    if (!corr) {
      h +=
        '<textarea class="cmdta asmta" data-dsa="' +
        k +
        '" rows="' +
        (u.rows || 7) +
        '" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="' +
        esc(u.ph || '# écris tes instructions ici, une par ligne') +
        '">' +
        esc(v) +
        '</textarea>' +
        '<div class="edtb" style="margin-top:6px"><button type="button" class="edb" data-asm="' +
        k +
        '">▶ Tester mon code</button></div><div id="asmres-' +
        k +
        '" aria-live="polite"></div>' +
        '<p class="fine" style="margin:4px 0 0">' +
        (u.dmode
          ? 'Écris seulement les directives (sans « .data »).'
          : 'Écris seulement les instructions (le programme est exécuté sur plusieurs jeux de test). Les commentaires commencent par #.') +
        '</p></div>';
      return h;
    }
    const r = asmEval(u, v);
    const f = r.n ? r.passed / r.n : 0;
    h +=
      '<pre class="code plain" style="margin:6px 0">' +
      (r.empty ? '(pas de réponse)' : esc(v)) +
      '</pre>' +
      asmReport(u, r) +
      '<p class="dsres">' +
      fpt(Math.round(u.pts * f * 100) / 100) +
      ' / ' +
      fpt(u.pts) +
      ' pt</p><div class="dssol"><b>Correction.</b> ' +
      u.sol +
      '</div></div>';
    return h;
  }

  function edKind(u: any, k: string, corr: boolean, h: string): string {
    const s = edGet(u, k);
    if (!corr) return h + '<div class="edw" id="ed-' + k + '" data-edk="' + k + '">' + edWidget(u, k, s) + '</div></div>';
    if (isSubjectKind(u.kind)) return subCorr(u, k, s, h) + '</div>';
    return (u.kind === 'fsm' ? fsmCorr(u, k, s, h) : u.kind === 'circ' ? circCorr(u, k, s, h) : chronoCorr(u, k, s, h)) + '</div>';
  }

  function dsKind(u: any, k: string, corr: boolean, ei: number, si: number, h: string): string {
    if (u.kind === 'grid') return gridKind(u, k, corr, h);
    if (u.kind === 'cmd') return cmdKind(u, k, corr, h);
    if (u.kind === 'asm') return asmKind(u, k, corr, h);
    if (u.kind === 'fsm' || u.kind === 'circ' || u.kind === 'chrono' || isSubjectKind(u.kind)) return edKind(u, k, corr, h);
    if (u.kind === 'num') {
      const v = dsRun.ans[k] || '';
      const isOk = kindFrac(u, k) === 1;
      let c = '';
      if (corr) c = isOk ? 'good' : 'wrong';
      else if (v && pn(v) === null) c = 'bad';
      h +=
        '<div class="dsnum"><label for="n-' +
        k +
        '"><b>' +
        u.label +
        '</b></label><input id="n-' +
        k +
        '" type="text" inputmode="text" autocomplete="off" spellcheck="false" data-dsn="' +
        k +
        '" class="' +
        c +
        '" value="' +
        esc(v) +
        '"' +
        (corr ? ' readonly' : '') +
        '></div>';
      if (!corr) h += '<p class="fine" style="margin:0">Un nombre (entier, décimal ou fraction comme 1/2).</p>';
      else
        h +=
          '<p class="dsres">' +
          (v ? (isOk ? 'Juste' : 'Faux') : 'Pas de réponse') +
          ' · ' +
          fpt(Math.round(u.pts * kindFrac(u, k) * 100) / 100) +
          ' / ' +
          fpt(u.pts) +
          ' pt</p><div class="dssol"><b>Correction.</b> ' +
          u.sol +
          '</div>';
      return h + '</div>';
    }
    if (u.kind === 'mat') {
      const mk = corr ? (i: number, j: number) => eqn(pn(dsCell(k, 'M', i, j)), pn(u.ans[i][j])) : null;
      h += gridHtml(k, 'M', u.label, u.n, u.m, corr, mk);
      if (!corr) h += '<p class="fine" style="margin:0">Une case par coefficient (entier ou fraction comme 1/2).</p>';
      else {
        const f = kindFrac(u, k);
        h +=
          '<p class="dsres">' +
          (f === 1 ? 'Matrice juste' : 'Certaines cases sont fausses (en rouge)') +
          ' · ' +
          fpt(Math.round(u.pts * f * 100) / 100) +
          ' / ' +
          fpt(u.pts) +
          ' pt</p>' +
          (f < 1
            ? '<details><summary class="fine">Voir la matrice attendue</summary>' + augTable(u.ans.map((r: any[]) => r.map(pn)), 0, false) + '</details>'
            : '') +
          '<div class="dssol"><b>Correction.</b> ' +
          u.sol +
          '</div>';
      }
      return h + '</div>';
    }
    if (u.kind === 'nums') {
      h += '<div class="dsnums">';
      u.items.forEach((it: any, i: number) => {
        if (it.ans === null || it.ans === undefined || it.ans === '') {
          h += '<span class="nl">' + it.label + '</span>';
          return;
        }
        const v = dsCell(k, 'N', 0, i) || '';
        let c = '';
        if (corr) c = eqn(pn(v), pn(it.ans)) ? 'good' : 'wrong';
        else if (v && pn(v) === null) c = 'bad';
        h +=
          (it.label ? '<span class="nl">' + it.label + '</span>' : '') +
          '<input type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="réponse ' +
          (i + 1) +
          '" data-dsc="' +
          k +
          ':N:0:' +
          i +
          '" class="' +
          c +
          '" value="' +
          esc(v) +
          '"' +
          (corr ? ' readonly' : '') +
          '>';
      });
      h += '</div>';
      if (!corr) h += '<p class="fine" style="margin:0">Des nombres (entiers, négatifs ou fractions comme 1/2).</p>';
      else {
        const bad = u.items.filter((it: any, i: number) => it.ans != null && it.ans !== '' && !eqn(pn(dsCell(k, 'N', 0, i)), pn(it.ans)));
        h +=
          '<p class="dsres">' +
          (bad.length
            ? 'Réponses attendues : ' + u.items.filter((it: any) => it.ans != null && it.ans !== '').map((it: any) => it.ans).join(' ; ')
            : 'Tout est juste') +
          ' · ' +
          fpt(Math.round(u.pts * kindFrac(u, k) * 100) / 100) +
          ' / ' +
          fpt(u.pts) +
          ' pt</p><div class="dssol"><b>Correction.</b> ' +
          u.sol +
          '</div>';
      }
      return h + '</div>';
    }
    if (u.kind === 'diag') {
      const n = u.n;
      const r = corr ? diagCheck(u, k) : null;
      ['Oui, diagonalisable dans ℝ', 'Non, pas diagonalisable dans ℝ'].forEach((o, oi) => {
        let c = 'dso';
        let ar = 'false';
        if (corr) {
          const truth = u.diag ? 0 : 1;
          if (oi === truth) c += ' good';
          else if (dsRun.sel[k] === oi) c += ' bad';
        } else if (dsRun.sel[k] === oi) ar = 'true';
        h +=
          '<button class="' +
          c +
          '" ' +
          (corr ? 'disabled ' : '') +
          'data-dsk="o:' +
          ei +
          ':' +
          si +
          ':' +
          oi +
          '" aria-pressed="' +
          ar +
          '"><b>' +
          String.fromCharCode(65 + oi) +
          '.</b> ' +
          o +
          '</button>';
      });
      if (dsRun.sel[k] === 0 || (corr && u.diag)) {
        h +=
          '<p class="fine" style="margin:8px 0 2px">Remplis les cases : D (valeurs propres sur la diagonale, 0 ailleurs), P (vecteurs propres en colonnes, dans le même ordre que D) et P<sup>−1</sup>. Fractions acceptées (ex. 1/2).</p>';
        const mk = (fn: (i: number, j: number) => boolean) => (corr && r && dsRun.sel[k] === 0 ? fn : null);
        h += gridHtml(k, 'D', 'D', n, n, corr, mk((i, j) => (i === j ? r.cols[j] : Math.abs(pn(dsCell(k, 'D', i, j)) || 0) < 1e-9)));
        h += gridHtml(k, 'P', 'P', n, n, corr, mk((_i, j) => r.cols[j]));
        h += gridHtml(k, 'Q', 'P<sup>−1</sup>', n, n, corr, mk(() => r.pinv));
      } else if (!corr && dsRun.sel[k] === 1) {
        h += '<p class="fine" style="margin:8px 0 0">Tu as répondu « non » : pas de matrice à remplir. Justifie sur ta feuille.</p>';
      }
      if (corr) {
        const fr = Math.round(u.pts * r.frac * 100) / 100;
        let msg: string;
        if (u.diag)
          msg =
            dsRun.sel[k] === 0
              ? 'Verdict juste. Colonnes de P valides : ' + r.cols.filter(Boolean).length + ' / ' + n + ' · P<sup>−1</sup> ' + (r.pinv ? 'juste' : 'à revoir')
              : dsRun.sel[k] === 1
                ? 'Cette matrice est diagonalisable : il fallait remplir D, P et P<sup>−1</sup>.'
                : 'Pas de réponse : 0 point.';
        else
          msg =
            dsRun.sel[k] === 1
              ? "Verdict juste : cette matrice n'est pas diagonalisable dans ℝ."
              : dsRun.sel[k] === 0
                ? "Cette matrice n'est pas diagonalisable dans ℝ."
                : 'Pas de réponse : 0 point.';
        h += '<p class="dsres">' + msg + ' · ' + fpt(fr) + ' / ' + fpt(u.pts) + ' pt</p><div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
      }
      return h + '</div>';
    }
    return h + '</div>';
  }

  /* ---------- Gauss-Jordan pas à pas (Maths) ---------- */
  function thmItem() {
    const t = THM.find((x) => x.id === thm.t);
    return { t, it: t.items[thm.i] };
  }
  function thmBase(): number[][] {
    const o = thmItem();
    const A = o.it.A.map((r: any[]) => r.map(pn));
    return o.t.aug ? A.map((r: number[], i: number) => r.concat(A.map((_: any, j: number) => (i === j ? 1 : 0)))) : A;
  }
  function thmCols() {
    return thmItem().it.A[0].length;
  }
  function newStep() {
    return { op: '+', i: '0', a: '', p: '0', b: '', q: '1', g: {} as Record<string, string>, chk: false };
  }
  function stepGrid(s: any): Array<Array<number | null>> {
    const B = thmBase();
    const n = B.length;
    const W = B[0].length;
    const M: Array<Array<number | null>> = [];
    for (let r = 0; r < n; r++) {
      const row: Array<number | null> = [];
      for (let c = 0; c < W; c++) row.push(pn(s.g[r + ':' + c]));
      M.push(row);
    }
    return M;
  }
  function prevOf(si: number): Array<Array<number | null>> {
    return si === 0 ? thmBase() : stepGrid(thm.steps[si - 1]);
  }
  function coef(v: string): number | null {
    const t = (v || '').trim();
    return t === '' ? 1 : pn(t);
  }
  function applyOp(Pmat: number[][], s: any) {
    const i = +s.i;
    const p = +s.p;
    const q = +s.q;
    const a = coef(s.a);
    const b = coef(s.b);
    const R = Pmat.map((r) => r.slice());
    if (s.op === 'sw') {
      if (i === q) return { err: "Choisis deux lignes différentes pour l'échange." };
      const tmp = R[i];
      R[i] = R[q];
      R[q] = tmp;
      return { R };
    }
    if (a === null || (s.op !== '1' && b === null)) return { err: "Un coefficient n'est pas un nombre lisible (entier ou fraction)." };
    const sg = s.op === '-' ? -1 : 1;
    const two = s.op !== '1';
    const ci = (p === i ? a : 0) + (two && q === i ? sg * (b as number) : 0);
    if (Math.abs(ci) < 1e-9)
      return {
        err: "La ligne L" + (i + 1) + " doit réapparaître à droite avec un coefficient non nul, sinon on perd son information (et la matrice n'est plus équivalente).",
      };
    R[i] = Pmat[0].map((_, c) => a * Pmat[p][c] + (two ? sg * (b as number) * Pmat[q][c] : 0));
    return { R };
  }
  function cf(v: string) {
    const t = (v || '?').trim();
    return /^[-\u2212]/.test(t) ? '(' + t.replace('-', '\u2212') + ')' : t;
  }
  function opText(s: any) {
    const Lsub = (k: string) => 'L<sub>' + (+k + 1) + '</sub>';
    const t = (c: string, l: string) => {
      const v = (c || '').trim();
      return (v === '' || v === '1' ? '' : cf(v) + '·') + Lsub(l);
    };
    if (s.op === 'sw') return Lsub(s.i) + ' ↔ ' + Lsub(s.q);
    return Lsub(s.i) + ' = ' + t(s.a, s.p) + (s.op === '1' ? '' : ' ' + (s.op === '-' ? '−' : '+') + ' ' + t(s.b, s.q));
  }
  function thmOpHtml(s: any, si: number, n: number): string {
    const sel = (f: string, v: string, list: Array<[string, string]>) =>
      '<select class="thmsel" data-ts="' +
      si +
      ':' +
      f +
      '" aria-label="' +
      f +
      '">' +
      list.map((o) => '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select>';
    const rows: Array<[string, string]> = [];
    for (let r = 0; r < n; r++) rows.push([String(r), 'L' + (r + 1)]);
    const inp = (f: string, v: string) =>
      '<input type="text" inputmode="text" autocomplete="off" spellcheck="false" class="thmf" style="width:3em" placeholder="1" aria-label="coefficient ' +
      f +
      '" data-tf="' +
      si +
      ':' +
      f +
      '" value="' +
      esc(v) +
      '">';
    let h = '<div class="thmop">' + sel('i', s.i, rows);
    const ops: Array<[string, string]> = [
      ['+', '+'],
      ['-', '−'],
      ['1', '(seul)'],
      ['sw', '↔ échange'],
    ];
    if (s.op === 'sw') h += '<span>↔</span>' + sel('q', s.q, rows) + sel('op', s.op, ops);
    else {
      h += '<span>=</span>' + inp('a', s.a) + '<span>·</span>' + sel('p', s.p, rows) + sel('op', s.op, ops);
      if (s.op !== '1') h += inp('b', s.b) + '<span>·</span>' + sel('q', s.q, rows);
    }
    return h + '</div><p class="fine" style="margin:0">Coefficient vide = 1. Pour multiplier une ligne seule (L1 = 1/2·L1), choisis « (seul) ».</p>';
  }
  function thmGridHtml(si: number, s: any, n: number, W: number, m: number, aug: boolean, marks: boolean[][] | null): string {
    let h =
      '<div class="mxrow"><span class="mxin thmg" style="grid-template-columns:repeat(' +
      m +
      ',auto)' +
      (aug ? ' 4px repeat(' + (W - m) + ',auto)' : '') +
      '">';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < W; c++) {
        if (aug && c === m) h += '<i class="vb"></i>';
        const v = s.g[r + ':' + c] || '';
        const cl = marks ? (marks[r][c] ? 'good' : 'wrong') : v && pn(v) === null ? 'bad' : '';
        h +=
          '<input type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="étape ' +
          (si + 1) +
          ' ligne ' +
          (r + 1) +
          ' colonne ' +
          (c + 1) +
          '" data-tg="' +
          si +
          ':' +
          r +
          ':' +
          c +
          '" class="' +
          cl +
          '" value="' +
          esc(v) +
          '">';
      }
    return h + '</span></div>';
  }
  function thmCheck(si: number): any {
    const s = thm.steps[si];
    const Pmat = prevOf(si);
    if (!allNum(Pmat)) return { msg: "Remplis d'abord la matrice de l'étape précédente.", kind: 'warn' };
    const r = applyOp(Pmat, s);
    if (r.err || !r.R) return { msg: r.err, kind: 'warn' };
    const G = stepGrid(s);
    const marks = G.map((row, i) => row.map((x, j) => x !== null && Math.abs(x - r.R![i][j]) < 1e-6));
    const ok = marks.every((row) => row.every(Boolean));
    return {
      ok,
      marks,
      exp: r.R,
      msg: ok
        ? 'Juste : ' + opText(s) + ' donne bien cette matrice.'
        : 'Il y a des erreurs de calcul (cases en rouge) : applique ' + opText(s) + ' à la matrice précédente.',
      kind: ok ? 'good' : 'bad',
    };
  }
  function thmFinish(): any {
    const o = thmItem();
    const last = thm.steps.length ? stepGrid(thm.steps[thm.steps.length - 1]) : thmBase();
    const n = last.length;
    if (!allNum(last)) return { kind: 'warn', msg: 'Remplis entièrement la dernière matrice avant de conclure.' };
    if (o.t.aug) {
      const Lm = last.map((r) => r.slice(0, n));
      const Rm = last.map((r) => r.slice(n));
      const isI = Lm.every((r, i) => r.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-6));
      const zero = Lm.some((r) => r.every((x) => Math.abs(x) < 1e-9));
      if (o.it.inv === null)
        return zero
          ? { kind: 'good', msg: "Juste : une ligne de la partie gauche est nulle, A n'est pas inversible." }
          : { kind: 'bad', msg: "Pas encore : continue les opérations. Si une ligne de la partie gauche devient nulle, A n'est pas inversible." };
      if (!isI)
        return {
          kind: 'bad',
          msg: zero
            ? "Une ligne de gauche est nulle : cela voudrait dire que A n'est pas inversible. Vérifie tes étapes précédentes (ici A est inversible)."
            : 'Pas encore : la partie gauche doit devenir la matrice identité I.',
        };
      const inv = o.it.inv.map((r: any[]) => r.map(pn));
      const okR = Rm.every((r, i) => r.every((x, j) => Math.abs(x - inv[i][j]) < 1e-6));
      return okR
        ? { kind: 'good', msg: 'Bravo : [A | I] est devenu [I | A⁻¹]. A⁻¹ = ' + augTable(Rm, 0, false) }
        : { kind: 'bad', msg: "La partie gauche vaut I mais la partie droite n'est pas A⁻¹ : une erreur de calcul s'est glissée dans les étapes." };
    }
    const rk = pn(thm.rank);
    const nz = last.filter((r) => r.some((x) => Math.abs(x) > 1e-9)).length;
    if (rk === null) return { kind: 'warn', msg: 'Écris le rang dans la case.' };
    if (!eqn(rk, o.it.rank))
      return {
        kind: 'bad',
        msg:
          "Ce n'est pas le bon rang." +
          (nz !== rk ? ' Le rang est le nombre de lignes non nulles de la matrice échelonnée.' : ' Vérifie tes étapes : une erreur de calcul est possible.'),
      };
    return { kind: 'good', msg: 'Juste : rang = ' + o.it.rank + '.' };
  }

  function viewThm() {
    if (!thm && dsRun && dsSujet() && dsSujet().th) {
      viewDS();
      return;
    }
    const main = $('#main');
    if (!main) return;
    if (!thm) {
      const CH = THC();
      const stepper: Record<string, string> = SUB === 'm' ? { inv: 'inv', esp: 'rk' } : {};
      let h =
        '<div class="dsb"><div class="card intro"><div class="tag">Par thème · ' +
        esc(CFG[SUB].name) +
        '</div><h2>Un chapitre à la fois</h2><p>' +
        (SUB === 'p'
          ? 'Chaque série est corrigée automatiquement : tu tapes des commandes ou du code assembleur (exécuté par un mini-simulateur RISC-V), ou tu choisis une proposition.'
          : 'Chaque série est corrigée automatiquement : tu fais les calculs sur ta feuille, puis tu entres seulement les résultats dans des cases (nombres, tableaux) ou tu choisis une proposition.') +
        ' Les séries ne sont pas chronométrées et ne comptent pas dans le classement.' +
        (SUB === 'e' ? ' Les chapitres suivent le cours (CM1 à CM7). Le « Quiz Moodle » de chaque chapitre propose 10 questions à choix du type de celles du Moodle du cours.' : '') +
        '</p></div>';
      CH.forEach((c) => {
        const sets = DS.filter((x) => x.s === SUB && x.th && x.chap === c[0]);
        h +=
          '<div class="card"><h2>' +
          esc(c[1]) +
          '</h2><span class="meta" style="font:500 12px var(--mono);color:var(--dim)">' +
          esc(c[2]) +
          '</span><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">';
        sets.forEach((sj) => {
          h += '<button class="btn ghost" data-dsk="start:' + sj.id + '">' + esc(sj.title) + '</button>';
        });
        const nq = QS.filter((q) => q.topic === c[0]).length;
        if (nq && SUB !== 'm') {
          const qLabel = SUB === 'e' ? 'Quiz Moodle' : 'Quiz rapide';
          h += '<button class="btn" data-act="train:' + c[0] + '">' + qLabel + ' · ' + nq + ' questions</button>';
        }
        const st = stepper[c[0]] ? THM.find((x) => x.id === stepper[c[0]]) : null;
        if (st) {
          h +=
            '</div><p class="fine" style="margin:12px 0 4px"><b>' +
            esc(st.title) +
            ' pas à pas</b> : ' +
            esc(st.desc) +
            '</p><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap">';
          st.items.forEach((it: any, i: number) => {
            h += '<button class="btn ghost" data-tk="start:' + st.id + ':' + i + '">Exercice ' + (i + 1) + ' (' + it.A.length + '×' + it.A[0].length + ')</button>';
          });
        }
        h += '</div></div>';
      });
      h += '<p class="note">Les exercices sont générés à partir de tes cours Moodle INSA Rennes et vérifiés par calcul.</p></div>';
      main.innerHTML = h;
      return;
    }
    const o = thmItem();
    const B = thmBase();
    const n = B.length;
    const W = B[0].length;
    const m = thmCols();
    const aug = o.t.aug;
    let h = '<div class="dsb"><div class="dsbar"><span>' + esc(o.t.title) + ' · exercice ' + (thm.i + 1) + '</span><button class="btn ghost" data-tk="back">Retour</button></div>';
    h +=
      '<div class="card"><div class="tag">Départ</div><p style="margin:4px 0">' +
      (aug
        ? 'Inverse A = ' + augTable(o.it.A.map((r: any[]) => r.map(pn)), 0, false) + ' en transformant [A | I] :'
        : 'Donne le rang de A = ' + augTable(o.it.A.map((r: any[]) => r.map(pn)), 0, false) + ' en échelonnant les lignes :') +
      '</p>' +
      augTable(B, m, aug) +
      '</div>';
    thm.steps.forEach((s: any, si: number) => {
      const res = s.chk ? thmCheck(si) : null;
      h +=
        '<div class="card thmstep" data-si="' +
        si +
        '"><div class="exh"><div class="tag">Étape ' +
        (si + 1) +
        '</div></div><p class="fine" style="margin:2px 0">Opération sur les lignes :</p>' +
        thmOpHtml(s, si, n) +
        '<p class="fine" style="margin:6px 0 0">Matrice obtenue :</p>' +
        thmGridHtml(si, s, n, W, m, aug, res && res.marks ? res.marks : null) +
        '<div class="acts" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn ghost" data-tk="chk:' +
        si +
        '">Vérifier cette étape</button></div>' +
        (res
          ? '<p class="dsres thm-' +
            res.kind +
            '">' +
            res.msg +
            '</p>' +
            (res.ok === false && res.exp ? '<details><summary class="fine">Voir la matrice attendue</summary>' + augTable(res.exp, m, aug) + '</details>' : '')
          : '') +
        '</div>';
    });
    h +=
      '<div class="card"><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-tk="add">+ Ajouter une étape</button>' +
      (thm.steps.length ? '<button class="btn ghost" data-tk="del">Retirer la dernière étape</button>' : '') +
      '</div></div>';
    h += '<div class="card"><div class="tag">Conclusion</div>';
    if (!aug)
      h +=
        '<div class="dsnum"><label for="thm-rk"><b>Rang(A) =</b></label><input id="thm-rk" type="text" inputmode="text" autocomplete="off" spellcheck="false" data-tr="1" value="' +
        esc(thm.rank || '') +
        '"></div>';
    h += '<button class="btn" data-tk="fin">' + (aug ? 'Vérifier ma conclusion' : 'Vérifier le rang') + '</button>';
    if (thm.fin) {
      const f = thmFinish();
      h += '<p class="dsres thm-' + f.kind + '">' + f.msg + '</p>';
    }
    h += '<details style="margin-top:10px"><summary class="fine">Voir une résolution possible (essaie d\'abord seul)</summary>' + o.it.sol + '</details>';
    h += '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn ghost" data-tk="next">Autre exercice</button></div></div></div>';
    const y = window.scrollY;
    main.innerHTML = h;
    window.scrollTo({ top: y });
  }

  function dsSubPts(u: any, k: string): number {
    if (u.kind) return Math.round(u.pts * kindFrac(u, k) * 100) / 100;
    if (u.opts) return dsRun.sel[k] === u.ans ? u.pts : 0;
    const g = dsRun.gr[k];
    return g ? u.pts * g : 0;
  }
  function dsQStats() {
    const out: any[] = [];
    dsSujet().ex.forEach((ex: any, ei: number) => {
      ex.subs.forEach((u: any, si: number) => {
        out.push([u.t || '', u.c || '', Math.round(dsSubPts(u, ei + '.' + si) * 100) / 100, u.pts]);
      });
    });
    return out;
  }
  function dsScore() {
    const sj = dsSujet();
    let tot = 0;
    const per: number[] = [];
    sj.ex.forEach((ex: any, ei: number) => {
      let e = 0;
      ex.subs.forEach((u: any, si: number) => {
        e += dsSubPts(u, ei + '.' + si);
      });
      per.push(e);
      tot += e;
    });
    return { tot, per };
  }
  function dsBest(id: string): number | null {
    const l = (P()?.sims || []).filter((m: any) => m.s === SUB && m.ex === id);
    return l.length ? Math.max(...l.map((m: any) => m.score)) : null;
  }

  function dsMenu() {
    const ann = tab === 'ann';
    let h = '';
    if (SUB === 'm' && ann) {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">Annale · Maths</div><h2>Le DS d\'algèbre de l\'an dernier</h2><p>Sujet officiel : DS « Mathématiques pour l\'ingénieur » du 29 septembre 2025, 1 h, sans documents ni calculatrice. Fais-le d\'abord sans regarder, puis compare avec la correction.</p></div>';
    } else if (SUB === 'p' && ann) {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">Annale · Prog syst</div><h2>Le DS du 28 janvier 2026</h2><p>DS de Programmation système 1 (3E-SET), 2 h, 33 questions, avec la fiche RISC-V et une feuille A4 manuscrite. <b>La partie Git (Q. 24 à 33, 5 points) n\'est plus au programme.</b></p></div>';
    } else if (SUB === 't' && ann) {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">Annales · TTSD (Moodle)</div><h2>Les DS officiels de Stéphane Méric</h2><p>Retrouve les vrais DS de TTSD issus du Moodle (2022 et 2023) en version <b>interactive corrigée</b> ci-dessous, ainsi que les <b>PDF originaux</b> à visualiser ou télécharger en bas de page.</p></div>';
    } else if (SUB === 'p') {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">DS blanc · Prog syst</div><h2>Un DS blanc, comme le jour J</h2>' +
        "<p>Chaque DS blanc suit l'annale : 2 h, 3 parties (Shell 3 pts, Makefile 3 pts, Assembleur 14 pts), 20 points.</p>" +
        "<ul><li>Les commandes sont à taper comme dans un terminal. Elles sont corrigées automatiquement : l'ordre des options et les écritures équivalentes sont acceptés.</li>" +
        '<li>En assembleur, tu écris de vrais programmes RISC-V : un mini-simulateur les exécute sur plusieurs jeux de test. Le bouton « Tester mon code » te permet d\'essayer avant de valider.</li>' +
        '<li>Ta note sur 20 est enregistrée dans Mon suivi et dans le classement.</li></ul></div>';
    } else if (SUB === 'm') {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">DS blanc · Maths</div><h2>Un DS blanc, comme le jour J</h2>' +
        "<p>Chaque DS blanc suit l'annale : 1 h, 4 exercices, 20 points, sans documents ni calculatrice. On rédige sur sa feuille et on justifie.</p>" +
        '<ul><li>Tu fais tous les calculs sur ta feuille. Dans l\'appli, tu entres seulement les résultats : nombres et matrices dans des cases, propositions à cocher.</li>' +
        '<li>Presque tout est corrigé automatiquement. Ta note sur 20 est enregistrée dans Mon suivi et dans le classement.</li></ul></div>';
    } else {
      h =
        '<div class="dsb"><div class="card intro"><div class="tag">DS blanc · ' +
        esc(CFG[SUB].name) +
        '</div><h2>Un DS blanc, comme le jour J</h2>' +
        '<p>Entraîne-toi en conditions d\'examen sur des sujets calibrés sur le programme Moodle de la matière (20 points, chronométré).</p>' +
        '<ul><li>Réponds aux QCM, saisies numériques, grilles ou éditeurs interactifs puis affiche la correction détaillée.</li>' +
        '<li>Ta note sur 20 est enregistrée dans Mon suivi et dans le classement de la promo.</li></ul></div>';
    }

    dsList(ann).forEach((sj) => {
      const b = dsBest(sj.id);
      h +=
        '<div class="card"><h2>' +
        esc(sj.title) +
        '</h2><span class="meta" style="font:500 12px var(--mono);color:var(--dim)">' +
        esc(sj.sub) +
        '</span><p class="fine" style="margin:8px 0 0">' +
        sj.ex.length +
        ' exercice' +
        (sj.ex.length > 1 ? 's' : '') +
        ' · 20 points · ' +
        sj.dur +
        ' min' +
        (b !== null ? ' · meilleure note ' + String(b).replace('.', ',') + '/20' : ' · pas encore fait') +
        '</p>' +
        (sj.note ? '<p class="fine" style="margin:8px 0 0">' + esc(sj.note) + '</p>' : '') +
        '<div class="acts" style="display:flex;gap:8px;margin-top:12px"><button class="btn" data-dsk="start:' +
        sj.id +
        '">' +
        (ann ? "Faire l'annale" : 'Commencer') +
        '</button></div></div>';
    });

    if (ann && SUB === 't') {
      const pdfs = pdfAnnalesCards('t');
      if (pdfs) {
        h += '<div class="ann" style="margin-top:6px"><p class="label" style="margin-bottom:0">Sujets PDF officiels (Moodle)</p>' + pdfs + '</div>';
      }
    }

    h +=
      '<p class="note" style="margin-top:0">' +
      (ann
        ? 'Les corrections interactives sont rédigées pour t\'entraîner : compare toujours avec ton cours.'
        : 'Ces sujets sont calibrés sur tes cours et annales Moodle INSA Rennes ; ils ne sont pas officiels.') +
      '</p></div>';
    const main = $('#main');
    if (main) main.innerHTML = h;
  }

  function dsQuestion(ex: any, ei: number, u: any, si: number, corr: boolean): string {
    const k = ei + '.' + si;
    let h =
      '<div class="dsq"><p class="qh">' +
      (ex.subs.length > 1 && String(u.q).indexOf('<b>Q.') !== 0 ? si + 1 + '. ' : '') +
      u.q +
      '<span class="pt">' +
      String(u.pts).replace('.', ',') +
      ' pt</span></p>';
    if (u.kind) return dsKind(u, k, corr, ei, si, h);
    if (u.opts) {
      u.opts.forEach((o: string, oi: number) => {
        let c = 'dso';
        let ar = 'false';
        if (corr) {
          if (oi === u.ans) c += ' good';
          else if (dsRun.sel[k] === oi) c += ' bad';
        } else if (dsRun.sel[k] === oi) ar = 'true';
        h +=
          '<button class="' +
          c +
          '" ' +
          (corr ? 'disabled ' : '') +
          'data-dsk="o:' +
          ei +
          ':' +
          si +
          ':' +
          oi +
          '" aria-pressed="' +
          ar +
          '"><b>' +
          String.fromCharCode(65 + oi) +
          '.</b> ' +
          o +
          '</button>';
      });
      if (corr && dsRun.sel[k] === undefined) h += '<p class="fine">Pas de réponse : 0 point.</p>';
    } else if (!corr) {
      h +=
        '<textarea data-dsa="' +
        k +
        '" placeholder="Écris ici ta réponse, ou fais-la sur ta feuille puis passe à la suite.">' +
        esc(dsRun.ans[k] || '') +
        '</textarea>';
    } else if (dsRun.ans[k]) {
      h += '<p class="fine" style="margin:4px 0">Ta réponse : ' + esc(dsRun.ans[k]) + '</p>';
    }
    if (corr) {
      h += '<div class="dssol"><b>Correction.</b> ' + u.sol + '</div>';
      if (!u.opts) {
        const g = dsRun.gr[k];
        h +=
          '<div class="gr"><span class="fine" style="align-self:center">Ta note :</span>' +
          [
            [1, 'Juste'],
            [0.5, 'À moitié'],
            [0, 'Faux'],
          ]
            .map((x) => '<button class="btn ghost" data-dsk="g:' + ei + ':' + si + ':' + x[0] + '" aria-pressed="' + (g === x[0]) + '">' + x[1] + '</button>')
            .join('') +
          '</div>';
      }
    }
    return h + '</div>';
  }

  function viewDS() {
    if (!dsRun || (EMP() && dsSujet() && (!!dsSujet().ann !== (tab === 'ann') || !!dsSujet().th !== (tab === 'train')))) {
      dsMenu();
      return;
    }
    const sj = dsSujet();
    const corr = dsRun.phase !== 'work';
    const done = dsRun.phase === 'done';
    let h = '<div class="dsb">';
    if (!corr) {
      h +=
        '<div class="dsbar"><span>' +
        esc(sj.title) +
        (sj.th ? '' : ' · temps restant <b id="dstimer"></b>') +
        '</span><button class="btn ghost" data-dsk="quit">Quitter</button></div>';
    } else {
      const sc = dsScore();
      h +=
        '<div class="dsbar"><span>' +
        esc(sj.title) +
        ' · ' +
        (done ? (sj.th ? 'bilan' : 'note enregistrée') : 'correction') +
        '</span><b>' +
        String(Math.round(sc.tot * 10) / 10).replace('.', ',') +
        ' / 20</b></div>';
    }
    if (sj.demo) h += '<div class="card"><div class="tag">À faire sur feuille · méthode et exemple appliqué</div>' + sj.demo + '</div>';
    sj.ex.forEach((ex: any, ei: number) => {
      h +=
        '<div class="card"><div class="exh"><div class="tag">Exercice ' +
        (ei + 1) +
        ' · ' +
        esc(ex.topic) +
        '</div><span class="meta" style="font:500 12px var(--mono);color:var(--dim)">' +
        String(ex.pts).replace('.', ',') +
        ' points</span></div><h2>' +
        esc(ex.title) +
        '</h2>' +
        (ex.intro ? '<p style="margin:4px 0">' + ex.intro + '</p>' : '');
      ex.subs.forEach((u: any, si: number) => {
        h += dsQuestion(ex, ei, u, si, corr);
      });
      h += '</div>';
    });
    if (!corr) {
      h +=
        '<div class="card"><p class="fine" style="margin:0 0 10px">Quand tu as fini (ou que le temps est écoulé), affiche la correction. Tu ne pourras plus changer tes réponses.</p><button class="btn" data-dsk="fin">Terminer et voir la correction</button></div>';
    } else if (!done) {
      h +=
        '<div class="card"><p class="fine" style="margin:0 0 10px">' +
        (sj.th
          ? 'Tout est corrigé automatiquement. Relis les corrections, puis ouvre ton bilan.'
          : 'Note chaque question à rédiger (juste, à moitié, faux) s\'il y en a, puis enregistre.') +
        '</p><button class="btn" data-dsk="save">' +
        (sj.th ? 'Voir mon bilan' : 'Enregistrer ma note') +
        '</button></div>';
    } else {
      const sc = dsScore();
      const w = sj.ex
        .map((ex: any, i: number) => ({ ex, r: sc.per[i] / ex.pts }))
        .sort((a: any, b: any) => a.r - b.r)[0];
      h +=
        '<div class="card"><div class="tag">Bilan</div><h2>' +
        String(Math.round(sc.tot * 10) / 10).replace('.', ',') +
        ' / 20</h2>' +
        sj.ex
          .map((ex: any, i: number) => {
            const r = Math.round((sc.per[i] / ex.pts) * 100);
            return (
              '<p style="margin:6px 0">' +
              esc(ex.topic) +
              ' : ' +
              String(Math.round(sc.per[i] * 10) / 10).replace('.', ',') +
              ' / ' +
              ex.pts +
              '<span class="bar2" aria-hidden="true" style="display:block"><i style="width:' +
              r +
              '%"></i></span></p>'
            );
          })
          .join('') +
        '<p>' +
        (w.r < 1
          ? 'À retravailler en priorité : <b>' + esc(w.ex.topic) + '</b> (' + esc(w.ex.title) + '). Refais les corrections à la main, sans regarder.'
          : 'Tout est juste : refais un autre sujet.') +
        '</p><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-dsk="menu">Choisir un autre sujet</button></div></div>';
    }
    h += '</div>';
    const y = window.scrollY;
    const main = $('#main');
    if (main) main.innerHTML = h;
    if (!corr) {
      dsTick();
      if (!dsTimer) dsTimer = window.setInterval(dsTick, 1000);
    }
    window.scrollTo({ top: y });
  }

  /* ---------- Mon suivi & courbe de progression ---------- */
  function progCard(): string {
    const sims = mySims()
      .filter((m: any) => m.n || m.ex)
      .slice(-12);
    if (!sims.length) return '';
    const W = 340;
    const H = 178;
    const Lpad = 34;
    const Rpad = 18;
    const Tpad = 20;
    const Bpad = 30;
    const n = sims.length;
    const pts = sims.map((m: any, i: number) => {
      const v = Math.round((m.score / (m.n || 20)) * 100);
      return {
        v,
        x: n > 1 ? Lpad + ((W - Lpad - Rpad) * i) / (n - 1) : (Lpad + W - Rpad) / 2,
        y: Tpad + (H - Tpad - Bpad) * (1 - v / 100),
        m,
        i,
      };
    });
    const dk = pts.map((p: any) => new Date(p.m.ts).toLocaleDateString('fr-FR'));
    const sameDay = dk.some((x: string, i: number) => dk.indexOf(x) !== i);
    let s =
      '<svg viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" role="img" aria-label="Évolution de tes notes de simulation" style="width:100%;height:auto;display:block;overflow:visible"><defs><linearGradient id="pgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>';
    [0, 25, 50, 75, 100].forEach((g) => {
      const y = Tpad + (H - Tpad - Bpad) * (1 - g / 100);
      const m = g % 50 === 0;
      s +=
        '<line x1="' +
        Lpad +
        '" x2="' +
        (W - Rpad) +
        '" y1="' +
        y +
        '" y2="' +
        y +
        '" stroke="var(--line)" stroke-width="' +
        (m ? 1 : 0.6) +
        '" ' +
        (m ? '' : 'stroke-dasharray="2 4" ') +
        'opacity="' +
        (m ? 1 : 0.7) +
        '"/>' +
        (m ? '<text x="' + (Lpad - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="9.5" fill="var(--dim)">' + g + '%</text>' : '');
    });
    if (n > 1) {
      let d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (let k = 0; k < n - 1; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const c = (b.x - a.x) * 0.42;
        d += ' C' + (a.x + c) + ' ' + a.y + ' ' + (b.x - c) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
      }
      const base = Tpad + (H - Tpad - Bpad);
      s +=
        '<path d="' +
        d +
        ' L' +
        pts[n - 1].x +
        ' ' +
        base +
        ' L' +
        pts[0].x +
        ' ' +
        base +
        ' Z" fill="url(#pgA)"/><path d="' +
        d +
        '" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".9s" fill="freeze"/></path>';
    }
    pts.forEach((p: any, i: number) => {
      const last = i === n - 1;
      if (last) s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="9" fill="var(--accent)" opacity=".18"/>';
      s +=
        '<circle cx="' +
        p.x +
        '" cy="' +
        p.y +
        '" r="' +
        (last ? 4.5 : 3) +
        '" fill="' +
        (last ? 'var(--accent)' : 'var(--surface, #fff)') +
        '" stroke="var(--accent)" stroke-width="2"/>';
      if (last || n <= 5)
        s +=
          '<text x="' +
          Math.min(p.x, W - Rpad - 4) +
          '" y="' +
          (p.y - (last ? 15 : 10)) +
          '" text-anchor="middle" font-size="' +
          (last ? 12 : 10) +
          '" font-weight="' +
          (last ? 700 : 500) +
          '" fill="' +
          (last ? 'var(--accent)' : 'var(--dim)') +
          '">' +
          p.v +
          '%</text>';
      if (n <= 8 || i % 2 === 0 || last) {
        const dt = new Date(p.m.ts);
        const d1 = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
        s += '<text x="' + p.x + '" y="' + (H - 14) + '" text-anchor="middle" font-size="9.5" fill="var(--dim)">' + d1 + '</text>';
        if (sameDay)
          s +=
            '<text x="' +
            p.x +
            '" y="' +
            (H - 3) +
            '" text-anchor="middle" font-size="8.5" fill="var(--dim)" opacity=".75">' +
            dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
            '</text>';
      }
    });
    s += '</svg>';
    const first = pts[0].v;
    const last = pts[n - 1].v;
    const d = last - first;
    const best = Math.max(...pts.map((p: any) => p.v));
    const msg =
      n > 1
        ? d > 0
          ? '<b style="color:var(--accent)">+' + d + ' points</b> depuis ton premier DS blanc.'
          : d < 0
            ? d + ' points depuis ton premier : continue, ça se remonte vite.'
            : 'Même niveau que ton premier essai.'
        : 'Un premier résultat : fais-en un deuxième pour voir la courbe.';
    return (
      '<div class="card" style="margin-bottom:14px"><div class="tag">Ta progression</div><p style="margin:4px 0 10px;font-size:14px">' +
      msg +
      '</p>' +
      s +
      '<p class="fine" style="margin:8px 0 0">Note de chaque simulation, en % de bonnes réponses' +
      (n > 1 ? ' · meilleur score ' + best + '%' : '') +
      '.</p></div>'
    );
  }

  function viewSuiviStd() {
    const { ts, tries, right } = totals();
    const sims = mySims();
    const est = estimate();
    let h = '<div class="stack">';
    const main = $('#main');
    if (!main) return;
    if (!tries) {
      h +=
        '<div class="card intro"><div class="tag">Mon suivi</div><h2>Rien à afficher pour l\'instant</h2><p>Dès que tu auras répondu à quelques questions de cette matière, tu verras ici ta réussite par thème, les notions à retravailler et l\'évolution de tes simulations.</p><button class="btn" data-act="goto:sim">Faire une simulation</button></div>';
      main.innerHTML = h + '</div>';
      return;
    }
    h +=
      '<div class="card"><dl class="stats"><div><dt>Réponses</dt><dd>' +
      tries +
      '</dd></div><div><dt>Réussite</dt><dd>' +
      pct(right, tries) +
      ' <small>%</small></dd></div><div><dt>Simulations</dt><dd>' +
      sims.length +
      (sims.length ? ' <small>meilleure ' + Math.max(...sims.map((s: any) => s.score)) + '/' + sims[0].n + '</small>' : '') +
      '</dd></div></dl>';
    if (est !== null)
      h += '<p class="est">Note estimée au DS : environ <b>' + est + ' / 20</b>, d\'après tes réponses. Indicatif : elle devient plus fiable avec plusieurs simulations.</p>';
    h += '</div>' + adviceCard();
    h += '<div class="card"><h2>Par thème</h2><div class="rows">';
    TOPICS.forEach(([k, nm]) => {
      const t = ts[k];
      const r = t.tries ? t.right / t.tries : 0;
      const lab = !t.tries ? ['none', 'pas commencé'] : r < 0.5 ? ['ko', 'à renforcer'] : r < 0.8 ? ['mid', 'en progrès'] : ['ok', 'solide'];
      h +=
        '<div class="row"><span>' +
        nm +
        '</span><div class="track"><i class="' +
        (r < 0.5 ? 'bad' : r < 0.8 ? 'mid' : '') +
        '" style="width:' +
        r * 100 +
        '%"></i></div><span class="v">' +
        (t.tries ? Math.round(r * 100) + ' %' : '–') +
        '</span></div><div class="note" style="margin:-4px 0 4px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="pill ' +
        lab[0] +
        '">' +
        lab[1] +
        '</span><span>' +
        t.seen +
        ' questions vues sur ' +
        t.total +
        '</span></div>';
    });
    h += '</div></div>';
    const cs = conceptStats();
    if (cs.length) {
      h += '<div class="card"><h2>Notions à retravailler</h2><div class="tl">';
      cs.forEach((c) => {
        h +=
          '<div class="item"><span><b>' +
          esc(c.concept) +
          '</b> <span class="pill none">' +
          NAME[c.topic] +
          '</span></span><button class="btn ghost" style="padding:6px 12px;font-size:13px" data-act="memo:' +
          c.topic +
          '">Voir la fiche</button><span class="sm">Réussie ' +
          c.right +
          ' fois sur ' +
          c.tries +
          '.</span></div>';
      });
      h += '</div></div>';
    }
    if (sims.length) {
      h += '<div class="card"><h2>Mes simulations</h2><ul class="hist">';
      sims
        .slice(-8)
        .reverse()
        .forEach((s: any, i: number, arr: any[]) => {
          const prev = arr[i + 1];
          const d = new Date(s.ts);
          const delta = prev ? s.score - prev.score : null;
          h +=
            '<li><span>' +
            d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
            ' · ' +
            d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
            '</span><span><b>' +
            s.score +
            ' / ' +
            s.n +
            '</b>' +
            (delta === null
              ? ''
              : ' <span class="pill ' + (delta > 0 ? 'ok' : delta < 0 ? 'ko' : 'none') + '">' + (delta > 0 ? '+' : '') + delta + '</span>') +
            '</span></li>';
        });
      h += '</ul></div>';
    }
    h +=
      '<div class="card"><h2>Mes données</h2><p class="fine" style="margin-top:0">' +
      (memOnly
        ? "Ton navigateur bloque l'enregistrement : rien n'est gardé après la fermeture."
        : 'Enregistré dans ce navigateur' + (cloudOK ? ' et synchronisé sur Supabase' : '') + ', au nom de ' + esc(P().name) + '.') +
      '</p><div class="foot" style="justify-content:flex-start">' +
      (confirmReset
        ? '<button class="btn danger" data-act="reset2">Oui, tout effacer</button><button class="btn ghost" data-act="reset0">Annuler</button>'
        : '<button class="btn ghost" data-act="reset1">Effacer ma progression</button>') +
      '</div></div></div>';
    main.innerHTML = h;
  }

  function viewSuiviM() {
    const sims = mySims().filter((m: any) => m.ex);
    let h = '<div class="stack">';
    const main = $('#main');
    if (!main) return;
    if (!sims.length) {
      h +=
        '<div class="card intro"><div class="tag">Mon suivi</div><h2>Rien à afficher pour l\'instant</h2><p>Dès que tu auras fait un DS blanc et affiché sa correction, tu verras ici ta réussite par chapitre, les notions à retravailler et l\'évolution de tes notes.</p><button class="btn" data-act="goto:sim">Faire un DS blanc</button></div></div>';
      main.innerHTML = h;
      return;
    }
    const sc = sims.map((m: any) => m.score);
    const avg = Math.round((sc.reduce((a: number, b: number) => a + b, 0) / sc.length) * 10) / 10;
    const ch: Record<string, { e: number; m: number; n: number }> = {};
    const cn: Record<string, { t: string; c: string; e: number; m: number; n: number }> = {};
    sims.forEach((m: any) => {
      (m.q || []).forEach((r: any) => {
        const t = r[0];
        const c = r[1];
        if (!t) return;
        ch[t] = ch[t] || { e: 0, m: 0, n: 0 };
        ch[t].e += r[2];
        ch[t].m += r[3];
        ch[t].n++;
        const key = t + '|' + c;
        cn[key] = cn[key] || { t, c, e: 0, m: 0, n: 0 };
        cn[key].e += r[2];
        cn[key].m += r[3];
        cn[key].n++;
      });
    });
    const pc = (o: { e: number; m: number }) => (o.m > 0 ? Math.round((o.e / o.m) * 100) : null);
    h +=
      '<div class="card"><dl class="stats"><div><dt>DS blancs</dt><dd>' +
      sims.length +
      '</dd></div><div><dt>Meilleure note</dt><dd>' +
      String(Math.max(...sc)).replace('.', ',') +
      ' <small>/ 20</small></dd></div><div><dt>Moyenne</dt><dd>' +
      String(avg).replace('.', ',') +
      ' <small>/ 20</small></dd></div></dl><p class="est">Note estimée au prochain DS : environ <b>' +
      String(Math.round(Math.min(20, sc.slice(-3).reduce((a: number, b: number) => a + b, 0) / Math.min(3, sc.length)) * 10) / 10).replace('.', ',') +
      ' / 20</b>, d\'après tes derniers DS blancs. Indicatif.</p></div>';
    const rated = THC()
      .map((c) => {
        const o = ch[c[0]];
        return o ? { k: c[0], nm: c[1], p: pc(o) } : null;
      })
      .filter((x): x is { k: string; nm: string; p: number } => Boolean(x && x.p !== null))
      .sort((a, b) => a.p - b.p);
    const none = THC().filter((c) => !ch[c[0]]);
    const adv =
      rated.length && rated[0].p < 80
        ? '<b>' + esc(rated[0].nm) + '</b> est ton point faible : ' + rated[0].p + ' % des points. Relis la fiche (avec les exemples résolus), puis refais un DS blanc.'
        : 'Tu es solide sur les chapitres déjà évalués (80 % ou plus). Refais un DS blanc complet pour confirmer, en conditions réelles.';
    h +=
      '<div class="card advice"><div class="tag">Mon conseil</div><h2>Quoi travailler maintenant</h2><p>' +
      adv +
      '</p>' +
      (rated.length && rated[0].p < 80 ? '<button class="btn" data-act="memo:' + rated[0].k + '">Voir la fiche</button> ' : '') +
      '<button class="btn ghost" data-act="goto:sim">Faire un DS blanc</button></div>';
    h += '<div class="card"><h2>Par thème</h2><div class="rows">';
    THC().forEach((c) => {
      const o = ch[c[0]];
      const p = o ? pc(o) : null;
      const lab = p === null ? ['none', 'pas encore évalué'] : p < 50 ? ['ko', 'à renforcer'] : p < 80 ? ['mid', 'en progrès'] : ['ok', 'solide'];
      h +=
        '<div class="row"><span>' +
        esc(c[1]) +
        '</span><div class="track"><i class="' +
        (p !== null && p < 50 ? 'bad' : p !== null && p < 80 ? 'mid' : '') +
        '" style="width:' +
        (p || 0) +
        '%"></i></div><span class="v">' +
        (p !== null ? p + ' %' : '–') +
        '</span></div><div class="note" style="margin:-4px 0 4px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="pill ' +
        lab[0] +
        '">' +
        lab[1] +
        '</span><span>' +
        (o ? o.n + ' questions dans tes DS blancs' : 'aucune question dans les DS faits') +
        '</span></div>';
    });
    h += '</div>' + (none.length ? '<p class="fine" style="margin:8px 0 0">Seuls les chapitres vus dans tes DS blancs sont mesurés.</p>' : '') + '</div>';
    const weak = Object.values(cn)
      .filter((o) => o.m > 0 && o.e / o.m < 0.8)
      .sort((a, b) => a.e / a.m - b.e / b.m)
      .slice(0, 6);
    if (weak.length) {
      h += '<div class="card"><h2>Notions à retravailler</h2><div class="tl">';
      weak.forEach((o) => {
        const nm = (THC().find((c) => c[0] === o.t) || [0, o.t])[1];
        h +=
          '<div class="item"><span><b>' +
          esc(o.c) +
          '</b> <span class="pill none">' +
          esc(nm) +
          '</span></span><button class="btn ghost" style="padding:6px 12px;font-size:13px" data-act="memo:' +
          o.t +
          '">Voir la fiche</button><span class="sm">' +
          String(Math.round(o.e * 10) / 10).replace('.', ',') +
          ' points gagnés sur ' +
          String(Math.round(o.m * 10) / 10).replace('.', ',') +
          '.</span></div>';
      });
      h += '</div></div>';
    }
    h += '<div class="card"><h2>Mes DS blancs</h2><ul class="hist">';
    sims
      .slice(-8)
      .reverse()
      .forEach((m: any, i: number, arr: any[]) => {
        const prev = arr[i + 1];
        const d = new Date(m.ts);
        const delta = prev ? m.score - prev.score : null;
        const sj = DS.find((x) => x.id === m.ex);
        h +=
          '<li><span>' +
          esc(sj ? sj.title : m.ex) +
          ' · ' +
          d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
          '</span><span><b>' +
          String(m.score).replace('.', ',') +
          ' / 20</b>' +
          (delta === null
            ? ''
            : ' <span class="pill ' + (delta > 0 ? 'ok' : delta < 0 ? 'ko' : 'none') + '">' + (delta > 0 ? '+' : '') + String(Math.round(delta * 10) / 10).replace('.', ',') + '</span>') +
          '</span></li>';
      });
    h += '</ul></div></div>';
    main.innerHTML = h;
  }

  function viewSuivi() {
    if (EMP()) viewSuiviM();
    else viewSuiviStd();
    const g = progCard();
    const main = $('#main');
    if (g && main) main.insertAdjacentHTML('afterbegin', g);
  }

  function subSummary(k: string) {
    const qs = ALLQ.filter((q) => q.s === k);
    let tries = 0;
    let right = 0;
    let seen = 0;
    qs.forEach((q) => {
      const t = stat(q.id);
      tries += t[0];
      right += t[1];
      if (t[0]) seen++;
    });
    const sims = (P()?.sims || []).filter((m: any) => (m.s || 'c') === k);
    return { n: qs.length, tries, right, seen, best: sims.length ? Math.max(...sims.map((m: any) => m.score)) : null, sims: sims.length };
  }

  function dsCardProgress(k: string): string {
    const ms = (P()?.sims || []).filter((x: any) => x.s === k && x.ex);
    if (!ms.length) return '<span class="meta">Pas encore de DS blanc fait</span>';
    const b = Math.max(...ms.map((x: any) => x.score));
    return (
      '<span class="meta">' +
      ms.length +
      ' DS blanc' +
      (ms.length > 1 ? 's' : '') +
      ' · meilleure note ' +
      String(b).replace('.', ',') +
      '/20</span><div class="bar2" aria-hidden="true"><i style="width:' +
      Math.round((b / 20) * 100) +
      '%"></i></div>'
    );
  }

  function viewHome() {
    let h = '<div class="hero ban"><img src="' + esc(bannerSrc) + '" alt="Promo ESET · INSA 3A"></div>';
    h += '<p class="label">Choisis une matière</p><div class="subjgrid">';

    const cnt = (sk: string) => ({
      ds: DS.filter((x) => x.s === sk && !x.th && !x.ann).length,
      th: DS.filter((x) => x.s === sk && x.th).length,
      q: ALLQ.filter((q) => (q.s || 'c') === sk).length,
      ann: DS.filter((x) => x.s === sk && x.ann).length + ANN.filter((a) => (a.s || 'e') === sk).length,
    });
    const rC = cnt('r');
    const aC = cnt('a');
    const tC = cnt('t');
    const gC = cnt('g');

    const cardsMeta: Record<string, { desc: string; detail: string; badge?: string }> = {
      m: { desc: 'Algèbre linéaire · annale corrigée', detail: '6 DS blancs de 1 h · Gauss-Jordan · aide-mémoire · classement' },
      e: { desc: "Logique, nombres, mémoires, bascules, compteurs, machines d'états", detail: '3 annales PDF · 6 DS blancs · éditeurs SVG · quiz Moodle' },
      p: { desc: 'Shell, Makefile, assembleur RISC-V', detail: 'annale corrigée · 6 DS blancs · simulateur RISC-V · aide-mémoire' },
      r: { desc: 'Calculateur UT/UC, ISA, pipeline 5 étages, caches', detail: `${rC.ds} DS blancs · ${rC.th} ateliers (Pipeline interactif) · ${rC.q} quiz`, badge: 'Moodle' },
      a: { desc: 'Réseaux, Bode, AOP, diodes, BJT, MOS/CMOS', detail: `${aC.ds} DS blancs · ${aC.th} ateliers (Bode & schémas SVG) · ${aC.q} quiz`, badge: 'Moodle' },
      t: { desc: 'Signaux, Fourier, filtrage, échantillonnage, TFTD', detail: `2 annales PDF + corrigés · ${tC.ds} DS · ${tC.th} ateliers (Spectre/Shannon) · ${tC.q} quiz`, badge: 'Moodle' },
      g: { desc: 'My English is French · grammaire pièges & TOEIC (10 thèmes)', detail: `${gC.ds} tests blancs · ${gC.th} ateliers (Cloze & Frenglish) · ${gC.q} quiz`, badge: 'Moodle' },
    };

    ['c', 'm', 'e', 'p', 'r', 'a', 't', 'g'].forEach((k) => {
      const c = CFG[k];
      if (k === 'c') {
        const m = subSummary(k);
        const r = m.tries ? Math.round((m.right / m.tries) * 100) : null;
        h +=
          '<button class="sc-card" data-go="c"><h3>' +
          esc(c.name) +
          '</h3><span class="meta">Entrées-sorties, tableaux, pointeurs, structures, énumérations</span>' +
          '<span class="meta">' +
          m.n +
          ' questions · ' +
          m.seen +
          ' vues' +
          (m.best !== null ? ' · meilleure simulation ' + m.best + '/20' : '') +
          '</span><div class="bar2" aria-hidden="true"><i style="width:' +
          (r === null ? 0 : r) +
          '%"></i></div><span class="meta">' +
          (r === null ? 'Pas encore commencé' : 'Réussite : ' + r + ' %') +
          '</span><span class="go">Ouvrir →</span></button>';
        return;
      }
      const meta = cardsMeta[k];
      h +=
        '<button class="sc-card" data-go="' +
        k +
        '">' +
        (meta.badge ? '<span class="moodle-pill">' + esc(meta.badge) + '</span>' : '') +
        '<h3>' +
        esc(c.name) +
        '</h3><span class="meta">' +
        esc(meta.desc) +
        '</span><span class="meta">' +
        esc(meta.detail) +
        '</span>' +
        dsCardProgress(k) +
        '<span class="go">Ouvrir →</span></button>';
    });

    h +=
      '</div><p class="note" style="margin-top:0"><b>Toutes les 8 matières ESET 3A sont disponibles</b> (générées et synchronisées avec tes cours Moodle INSA Rennes).</p>' +
      '<p class="note" style="margin-top:6px">La discussion de la promo est dans la colonne de droite (sur téléphone, le bouton « Discussion » en bas à droite).</p>';
    const main = $('#main');
    if (main) main.innerHTML = h;
  }

  function hdr() {
    const c = CFG[SUB];
    const subtxt = $('#subtxt');
    const tabsEl = $('#tabs');
    const subjEl = $('#subj');
    const homebtn = $('#homebtn');
    const h1 = $('#h1');
    if (!subtxt || !tabsEl || !subjEl || !homebtn || !h1) return;

    subtxt.textContent = QS.length + ' questions ' + c.intro + '. Il garde tes résultats, te dit quoi retravailler et classe la classe.';
    const home = view === 'home';
    const elen = view === 'elen';
    tabsEl.hidden = home || elen;
    subjEl.hidden = true;
    homebtn.hidden = home;
    h1.textContent = home ? 'Coach Partiels' : elen ? 'ELEN numérique' : SUB === 'c' ? 'Ton coach pour le DS1 de C' : 'Ton coach : ' + c.name;

    const ee = EMP();
    const showAnn = hasAnnales(SUB);
    root.querySelectorAll<HTMLButtonElement>('#tabs button').forEach((b) => {
      if (b.dataset.t === 'ann') b.hidden = !showAnn;
      if (b.dataset.t === 'sim') b.textContent = SUB === 'g' ? 'Test blanc' : ee ? 'DS blanc' : 'Simulation DS';
      if (b.dataset.t === 'train') b.textContent = 'Par thème';
    });

    if (SUB === 'p' && !home)
      subtxt.textContent =
        "L'annale du 28 janvier 2026 corrigée, des DS blancs au même format (2 h, Shell, Makefile, assembleur RISC-V), des séries par thème, un aide-mémoire, ton suivi et le classement.";
    else if (SUB === 'm' && !home)
      subtxt.textContent =
        "L'annale d'algèbre corrigée, des DS blancs au même format (1 h, 4 exercices), Gauss-Jordan pas à pas, un aide-mémoire, ton suivi et le classement.";
    else if (SUB === 'e' && !home)
      subtxt.textContent =
        'Les 3 annales en PDF avec corrections, 6 DS blancs (2 h) avec éditeurs interactifs (graphe d\'états, logigramme, chronogramme), quiz Moodle, aide-mémoire, suivi et classement.';
    else if (SUB === 't' && !home)
      subtxt.textContent =
        'Les 2 annales officielles Moodle (2022 & 2023) en PDF + corrigé interactif, 3 DS blancs de 1 h, 6 séries par thème, 20 quiz, aide-mémoire complet, suivi et classement.';
    else if (SUB === 'a' && !home)
      subtxt.textContent =
        "Basé sur le Poly 2026 (J.-N. Provost) : 3 DS blancs (réseaux, AOP, diodes, BJT, MOS/CMOS, étage différentiel), 6 séries par thème, 20 quiz, aide-mémoire, suivi et classement.";
    else if (SUB === 'r' && !home)
      subtxt.textContent =
        'Basé sur les CM1–CM4 Moodle (S. Derrien & T. Marty) : 3 DS blancs (UT/UC, ISA, pipeline, hiérarchie mémoire & caches), 4 séries par thème, 16 quiz, aide-mémoire, suivi et classement.';
    else if (SUB === 'g' && !home)
      subtxt.textContent =
        'Basé sur les supports Moodle (E. Dargay) : fiches My English is French + liste TOEIC officielle, 2 tests blancs, 4 séries par thème, 28 quiz, aide-mémoire et classement.';

    if (home) {
      subtxt.textContent =
        'Entraîne-toi matière par matière : le coach note tes exploits (et tes bourdes), te dit quoi réviser avant que ça pique, et classe toute la promo sans pitié.';
    }
    subjEl.innerHTML = Object.keys(CFG)
      .map((k) => '<button class="chip" role="tab" data-s="' + k + '" aria-pressed="' + (k === SUB) + '">' + esc(CFG[k].name) + '</button>')
      .join('');
  }

  function who() {
    const w = $('#who');
    if (!w) return;
    const p = P();
    w.innerHTML =
      (p ? (view === 'home' ? themeBtns() : '') + 'Salut <b>' + esc(p.name) + '</b> · <button class="link" data-act="chg">changer</button>' : themeBtns()) +
      ' <button class="admin-link" data-act="admin" title="Espace Admin (PIN 3500)">Admin</button>';
  }

  function parkUI() {
    const b = $('#parkbar');
    if (!b) return;
    if (parked && store.cur && !run) {
      b.hidden = false;
      b.innerHTML =
        '<span>' +
        (parked.kind === 'sim' ? 'Simulation DS' : 'Entraînement') +
        ' (' +
        esc(CFG[parked.sub || 'c'].name) +
        ') en cours : question ' +
        (parked.i + 1) +
        ' / ' +
        parked.list.length +
        '. Tes réponses sont gardées.</span><span><button class="btn" data-act="resume">Reprendre</button> <button class="btn ghost" data-act="drop">Abandonner</button></span>';
    } else {
      b.hidden = true;
      b.innerHTML = '';
    }
  }

  function syncPanel() {
    if (UIDV && store.cur) {
      noteUser(UIDV, P().name);
      buildColors();
    }
    watchUnread();
    const ctx = 'g';
    if (ctx !== chatCtx) {
      chatCtx = ctx;
      setChatCh(ctx);
    } else {
      subChat();
      renderPanel();
    }
  }

  function show() {
    if (!dataLoaded) return;
    run = null;
    confirmReset = false;
    hdr();
    if (
      parked &&
      store.cur &&
      view !== 'home' &&
      (parked.sub || 'c') === SUB &&
      ((tab === 'sim' && parked.kind === 'sim') || (tab === 'train' && parked.kind !== 'sim'))
    ) {
      view = 'subj';
      run = parked;
      parked = null;
      root.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.t === tab)));
      who();
      parkUI();
      draw();
      return;
    }
    root.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.t === tab && !!store.cur)));
    who();
    if (!store.cur) {
      gate();
      renderPanel();
      return;
    }
    if (view === 'home') {
      viewHome();
      parkUI();
      syncPanel();
      return;
    }
    if (view === 'elen') {
      viewElen();
      parkUI();
      syncPanel();
      return;
    }
    if (tab === 'ann' && SUB === 'e') viewElen();
    else if (EMP() && (tab === 'sim' || tab === 'ann')) viewDS();
    else if (EMP() && tab === 'train') viewThm();
    else if (tab === 'sim') viewSim();
    else if (tab === 'train') viewTrain();
    else if (tab === 'suivi') viewSuivi();
    else if (tab === 'board') viewBoard();
    else viewMemo();
    parkUI();
    syncPanel();
  }

  function login(name: string) {
    setSub(store.subj && CFG[store.subj] ? store.subj : 'c');
    const clean = name.trim();
    if (!clean) return;
    const k = nameKey(clean);
    const shEl = $<HTMLInputElement>('#share');
    const sh = shEl ? shEl.checked : true;
    if (!store.profiles[k]) store.profiles[k] = { name: clean, q: {}, sims: [], share: sh };
    else if (shEl) store.profiles[k].share = sh;
    parked = null;
    store.cur = k;
    view = 'home';
    save();
    tab = 'sim';
    show();
  }

  /* ---------- écouteurs d'événements (scopés avec AbortController) ---------- */
  root.addEventListener(
    'submit',
    (e) => {
      const target = e.target as HTMLFormElement | null;
      if (!target) return;
      if (target.id === 'gate') {
        e.preventDefault();
        const inp = $<HTMLInputElement>('#name');
        if (inp) login(inp.value);
      } else if (target.id === 'chatf') {
        e.preventDefault();
        void sendChat();
      }
    },
    { signal }
  );

  root.addEventListener(
    'input',
    (e) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!t) return;
      if (t.id === 'chatin') {
        chatDraft = t.value;
        return;
      }
      if (t.id === 'numin' && run) {
        const v = t.value.trim();
        run.sel[run.i] = v ? v : null;
        const b = $<HTMLButtonElement>('#val');
        if (b) b.disabled = !v;
        return;
      }
      if (t.dataset?.edi && dsRun && dsRun.phase === 'work') {
        const a = t.dataset.edi.split('|');
        const k = a[0];
        const u = edU(k);
        const s = edGet(u, k);
        if (EDX[u.kind]?.inp) EDX[u.kind].inp(u, k, s, a[1], t.value, t);
        return;
      }
      if (t.dataset?.dsa && dsRun && dsRun.phase === 'work') {
        dsRun.ans[t.dataset.dsa] = t.value;
        return;
      }
      if ((t.dataset?.dsc || t.dataset?.dsn) && dsRun && dsRun.phase === 'work') {
        const clean = t.value.replace(/[^0-9+\-−–\/.,\s]/g, '');
        if (clean !== t.value) {
          const p = Math.max(0, (t.selectionStart || 0) - (t.value.length - clean.length));
          t.value = clean;
          try {
            t.setSelectionRange(p, p);
          } catch {
            // ignore
          }
        }
        if (t.dataset.dsn) dsRun.ans[t.dataset.dsn] = t.value;
        else {
          dsRun.cells = dsRun.cells || {};
          dsRun.cells[t.dataset.dsc!] = t.value;
        }
        t.classList.toggle('bad', t.value.trim() !== '' && pn(t.value) === null);
        return;
      }
      if (t.dataset?.subin && dsRun && dsRun.phase === 'work') {
        const parts = t.dataset.subin.split('|');
        const k = parts[1];
        const idx = parts[2];
        const u = edU(k);
        const s = edGet(u, k);
        subInput(u, s, idx, t.value);
        return;
      }
      if (t.dataset?.dsg && dsRun && dsRun.phase === 'work') {
        const clean = t.value.replace(/[^0-9a-fA-FxX\/.,\s\-−–_]/g, '');
        if (clean !== t.value) {
          const p = Math.max(0, (t.selectionStart || 0) - (t.value.length - clean.length));
          t.value = clean;
          try {
            t.setSelectionRange(p, p);
          } catch {
            // ignore
          }
        }
        dsRun.cells = dsRun.cells || {};
        dsRun.cells[t.dataset.dsg] = t.value;
        return;
      }
      if (thm && (t.dataset?.tg || t.dataset?.tf || t.dataset?.tr)) {
        const clean = t.value.replace(/[^0-9+\-−–\/.,\s]/g, '');
        if (clean !== t.value) {
          const p = Math.max(0, (t.selectionStart || 0) - (t.value.length - clean.length));
          t.value = clean;
          try {
            t.setSelectionRange(p, p);
          } catch {
            // ignore
          }
        }
        t.classList.toggle('bad', t.value.trim() !== '' && pn(t.value) === null);
        if (t.dataset.tr) {
          thm.rank = t.value;
          return;
        }
        const parts = (t.dataset.tg || t.dataset.tf || '').split(':');
        const s = thm.steps[+parts[0]];
        if (t.dataset.tg) s.g[parts[1] + ':' + parts[2]] = t.value;
        else s[parts[1]] = t.value;
        if (s.chk) {
          s.chk = false;
          const card = t.closest('.thmstep');
          if (card) {
            card.querySelectorAll('input.good,input.wrong').forEach((x) => x.classList.remove('good', 'wrong'));
            card.querySelectorAll('.dsres,details').forEach((x) => x.remove());
          }
        }
      }
    },
    { signal }
  );

  root.addEventListener(
    'change',
    (e) => {
      const t = e.target as HTMLSelectElement | null;
      if (!t || !t.dataset) return;
      if (t.dataset.edc && dsRun && dsRun.phase === 'work') {
        const a = t.dataset.edc.split('|');
        const k = a[0];
        const u = edU(k);
        const s = edGet(u, k);
        if (EDX[u.kind]?.chg) EDX[u.kind].chg(u, k, s, a[1], t.value, t);
        return;
      }
      if (thm && t.dataset.ts) {
        const p = t.dataset.ts.split(':');
        const s = thm.steps[+p[0]];
        const old = s.i;
        s[p[1]] = t.value;
        if (p[1] === 'i') {
          if (s.p === old) s.p = t.value;
          if (s.q === t.value) s.q = String((+t.value + 1) % thmBase().length);
        }
        if (p[1] === 'op' && t.value === '1' && s.p !== s.i) s.p = s.i;
        if (s.op === 'sw' && s.i === s.q) s.q = String((+s.i + 1) % thmBase().length);
        s.chk = false;
        thm.fin = false;
        viewThm();
      }
    },
    { signal }
  );

  root.addEventListener(
    'keydown',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (e.key === 'Enter' && target && target.id === 'numin') {
        e.preventDefault();
        const b = $<HTMLButtonElement>('#val');
        if (b && !b.disabled) b.click();
      }
    },
    { signal }
  );

  // Pointer drag/tap for interactive SVG editors
  root.addEventListener(
    'pointerdown',
    (e) => {
      const sv = (e.target as Element).closest?.('svg.edsvg') as SVGSVGElement | null;
      _pend = null;
      if (!sv || !dsRun || dsRun.phase !== 'work' || sv.dataset.ro) return;
      const k = sv.dataset.edk!;
      const u = edU(k);
      const s = edGet(u, k);
      if (EDX[u.kind]?.down) EDX[u.kind].down(e, sv, k, u, s);
    },
    { signal }
  );

  document.addEventListener(
    'pointermove',
    (e) => {
      if (!_drag) return;
      const p = edPt(_drag.sv, e);
      if (!_drag.moved && Math.hypot(p.x - _drag.p0.x, p.y - _drag.p0.y) < 5) return;
      _drag.moved = true;
      _drag.move(p);
      e.preventDefault();
    },
    { passive: false, signal }
  );

  document.addEventListener(
    'pointerup',
    () => {
      if (!_drag) return;
      const d = _drag;
      _drag = null;
      if (d.moved) {
        if (d.end) d.end();
      } else _pend = d;
    },
    { signal }
  );

  document.addEventListener(
    'pointercancel',
    () => {
      if (_drag && _drag.moved && _drag.end) _drag.end();
      _drag = null;
    },
    { signal }
  );

  root.addEventListener(
    'click',
    (e) => {
      if (_pend) {
        const d = _pend;
        _pend = null;
        if ((e.target as Element).closest?.('svg.edsvg')) {
          d.tap();
          return;
        }
      }
      const targetEl = e.target as Element;

      // Subject-adapted interactive widgets (Bode, Signal, Pipeline, Cloze)
      const subEdBtn = targetEl.closest?.('[data-subed]') as HTMLElement | null;
      if (subEdBtn && dsRun && dsRun.phase === 'work') {
        const parts = (subEdBtn.dataset.subed || '').split('|');
        const k = parts[1];
        const act = parts[2];
        const arg = parts.slice(3).join('|');
        const u = edU(k);
        const s = edGet(u, k);
        if (subAct(u, s, act, arg)) edRender(k);
        return;
      }

      // SVG editor toolbar buttons
      const edBtnEl = targetEl.closest?.('[data-ed]') as HTMLElement | null;
      if (edBtnEl && dsRun && dsRun.phase === 'work') {
        const a = (edBtnEl.dataset.ed || '').split('|');
        const k = a[0];
        const u = edU(k);
        const s = edGet(u, k);
        if (EDX[u.kind]?.act) EDX[u.kind].act(u, k, s, a[1], a[2], edBtnEl);
        return;
      }

      // RISC-V "Tester mon code"
      const asmBtn = targetEl.closest?.('[data-asm]') as HTMLElement | null;
      if (asmBtn && dsRun) {
        const k = asmBtn.dataset.asm!;
        const u = edU(k);
        const r = asmEval(u, dsRun.ans[k]);
        const o = $('#asmres-' + k);
        if (o) o.innerHTML = asmReport(u, r);
        return;
      }

      // Gauss-Jordan stepper buttons
      const tkBtn = targetEl.closest?.('button[data-tk]') as HTMLButtonElement | null;
      if (tkBtn) {
        const a = (tkBtn.dataset.tk || '').split(':');
        const c = a[0];
        if (c === 'start') {
          thm = { t: a[1], i: +a[2], steps: [newStep()], fin: false, rank: '' };
          viewThm();
          window.scrollTo({ top: 0 });
          return;
        }
        if (!thm) return;
        if (c === 'back') {
          thm = null;
          viewThm();
          window.scrollTo({ top: 0 });
          return;
        }
        if (c === 'add') {
          thm.steps.push(newStep());
          thm.fin = false;
          viewThm();
          return;
        }
        if (c === 'del') {
          thm.steps.pop();
          if (!thm.steps.length) thm.steps.push(newStep());
          thm.fin = false;
          viewThm();
          return;
        }
        if (c === 'chk') {
          thm.steps[+a[1]].chk = true;
          viewThm();
          return;
        }
        if (c === 'fin') {
          thm.fin = true;
          viewThm();
          return;
        }
        if (c === 'next') {
          const o = THM.find((x) => x.id === thm.t);
          thm = { t: o.id, i: (thm.i + 1) % o.items.length, steps: [newStep()], fin: false, rank: '' };
          viewThm();
          window.scrollTo({ top: 0 });
          return;
        }
      }

      // DS blanc / annale buttons
      const dskBtn = targetEl.closest?.('button[data-dsk]') as HTMLButtonElement | null;
      if (dskBtn && store.cur) {
        const a = (dskBtn.dataset.dsk || '').split(':');
        const c = a[0];
        if (c === 'start') {
          const found = DS.find((x) => x.id === a[1]);
          dsRun = { id: a[1], start: Date.now(), dur: found ? found.dur : 120, ans: {}, sel: {}, gr: {}, phase: 'work' };
          viewDS();
          window.scrollTo({ top: 0 });
          return;
        }
        if (!dsRun) return;
        if (c === 'o') {
          const k = a[1] + '.' + a[2];
          if (dsRun.phase === 'work') {
            dsRun.sel[k] = +a[3];
            viewDS();
          }
          return;
        }
        if (c === 'g') {
          if (dsRun.phase === 'corr') {
            dsRun.gr[a[1] + '.' + a[2]] = +a[3];
            viewDS();
          }
          return;
        }
        if (c === 'fin') {
          dsRun.phase = 'corr';
          viewDS();
          window.scrollTo({ top: 0 });
          return;
        }
        if (c === 'quit' || c === 'menu') {
          dsRun = null;
          if (tab === 'train') viewThm();
          else viewDS();
          window.scrollTo({ top: 0 });
          return;
        }
        if (c === 'save') {
          if (dsRun.saved) return;
          dsRun.saved = true;
          dsRun.phase = 'done';
          const sc = Math.round(dsScore().tot * 10) / 10;
          if (!(dsSujet() && dsSujet().th)) {
            P().sims.push({ ts: Date.now(), score: sc, n: 20, by: 'ds', s: SUB, ex: dsRun.id, q: dsQStats() });
            if (P().sims.length > 120) P().sims.shift();
            save();
            if (P().share === true) void syncBoard();
          }
          viewDS();
          window.scrollTo({ top: 0 });
          return;
        }
      }

      // General buttons
      const t = targetEl.closest?.('button') as HTMLButtonElement | null;
      if (!t) return;

      if (t.parentElement && t.parentElement.id === 'tabs') {
        if (!store.cur) return;
        if (run && run.i < run.list.length) parked = run;
        tab = t.dataset.t || 'sim';
        dsRun = null;
        thm = null;
        show();
        return;
      }
      if (t.dataset.go) {
        if (!store.cur) return;
        if (run && run.i < run.list.length) parked = run;
        setSub(t.dataset.go);
        store.subj = SUB;
        save();
        view = 'subj';
        tab = 'sim';
        show();
        window.scrollTo({ top: 0 });
        return;
      }
      if (t.dataset.view) {
        if (!store.cur) return;
        if (run && run.i < run.list.length) parked = run;
        view = t.dataset.view;
        show();
        window.scrollTo({ top: 0 });
        return;
      }
      if (t.dataset.pdf) {
        void dlPdf(t.dataset.pdf);
        return;
      }
      if (t.dataset.viewPdf) {
        togglePdf(t.dataset.viewPdf);
        return;
      }
      if (t.dataset.ch) {
        setChatCh(t.dataset.ch);
        return;
      }
      if (t.dataset.th) {
        setTheme(t.dataset.th);
        show();
        return;
      }
      if (t.dataset.s) {
        if (!store.cur || t.dataset.s === SUB) return;
        if (run && run.i < run.list.length) parked = run;
        setSub(t.dataset.s);
        store.subj = SUB;
        view = 'subj';
        save();
        show();
        window.scrollTo({ top: 0 });
        return;
      }
      if (t.dataset.who) {
        parked = null;
        store.cur = t.dataset.who;
        view = 'home';
        save();
        tab = 'sim';
        show();
        return;
      }
      if (t.dataset.c) {
        topic = t.dataset.c;
        viewTrain();
        return;
      }
      if (t.dataset.n) {
        count = t.dataset.n === 'all' ? 'all' : 10;
        viewTrain();
        return;
      }
      if (t.dataset.f && run) {
        revFilter = t.dataset.f;
        const y = window.scrollY;
        const main = $('#main');
        if (main) main.innerHTML = result();
        window.scrollTo({ top: y });
        return;
      }
      if (t.dataset.o !== undefined && run) {
        if (run.ans[run.i] === null) {
          run.sel[run.i] = +t.dataset.o;
          draw();
        }
        return;
      }

      const act = t.dataset.act || '';
      const [a, arg] = act.split(':');
      switch (a) {
        case 'admin':
          onOpenAdmin();
          return;
        case 'chg':
          parked = null;
          store.cur = null;
          save();
          view = 'home';
          show();
          return;
        case 'home':
          if (run && run.i < run.list.length) parked = run;
          view = 'home';
          dsRun = null;
          thm = null;
          show();
          window.scrollTo({ top: 0 });
          return;
        case 'chatopen':
          chatOpen = true;
          renderPanel();
          markSeen();
          $<HTMLInputElement>('#chatin')?.focus();
          return;
        case 'chatclose':
          chatOpen = false;
          renderPanel();
          return;
        case 'resume':
          if (parked) {
            if ((parked.sub || 'c') !== SUB) setSub(parked.sub || 'c');
            view = 'subj';
            tab = parked.kind === 'sim' ? 'sim' : 'train';
            show();
          }
          return;
        case 'drop':
          parked = null;
          parkUI();
          return;
        case 'goto':
          tab = arg;
          dsRun = null;
          thm = null;
          show();
          window.scrollTo({ top: 0 });
          return;
        case 'memo':
          tab = 'memo';
          memoOpen = arg;
          dsRun = null;
          thm = null;
          show();
          setTimeout(() => {
            $('#m-' + arg)?.scrollIntoView({ block: 'start' });
          }, 0);
          return;
        case 'train': {
          const pool = QS.filter((q) => q.topic === arg);
          if (!pool.length) return;
          tab = 'train';
          topic = arg;
          start(wpick(pool, Math.min(10, pool.length)), 'now', 'train');
          return;
        }
        case 'missed': {
          const pool = QS.filter((q) => stat(q.id)[2] === 0);
          if (pool.length) start(shuffle(pool).slice(0, 20), 'now', 'train');
          return;
        }
        case 'again':
          tab = run && run.kind === 'sim' ? 'sim' : 'train';
          show();
          window.scrollTo({ top: 0 });
          return;
        case 'redo':
          start(shuffle(missed), 'now', 'train');
          return;
        case 'share':
          P().share = true;
          save();
          void syncBoard().then(() => {
            if (tab === 'board' && !run) viewBoard();
          });
          viewBoard();
          return;
        case 'unshare':
          P().share = false;
          save();
          Object.keys(CFG).forEach((k) => {
            void deleteBoardEntry(CFG[k].board, UIDV);
          });
          synced = false;
          viewBoard();
          return;
        case 'reset1':
          confirmReset = true;
          viewSuivi();
          return;
        case 'reset0':
          confirmReset = false;
          viewSuivi();
          return;
        case 'reset2':
          P().q = {};
          P().sims = [];
          save();
          if (P().share === true) {
            Object.keys(CFG).forEach((k) => {
              void deleteBoardEntry(CFG[k].board, UIDV);
            });
            synced = false;
            triedSync = false;
          }
          confirmReset = false;
          viewSuivi();
          return;
      }

      switch (t.id) {
        case 'go':
          if (tab === 'sim') {
            let list: any[] = [];
            TOPICS.forEach(([k]) => {
              list = list.concat(wpick(QS.filter((q) => q.topic === k), QUOTA[k] || 2));
            });
            start(shuffle(list), 'end', 'sim');
          } else {
            const pool = topic === 'all' ? QS : QS.filter((q) => q.topic === topic);
            start(wpick(pool, count === 'all' ? pool.length : count), 'now', 'train');
          }
          break;
        case 'val': {
          const q = run.list[run.i];
          run.ans[run.i] = run.sel[run.i];
          rec(q.id, isRight(q, run.ans[run.i]));
          if (run.feedback === 'end') {
            run.i++;
            window.scrollTo({ top: 0 });
          }
          draw();
          break;
        }
        case 'next':
          run.i++;
          draw();
          window.scrollTo({ top: 0 });
          break;
        case 'prev':
          run.i--;
          draw();
          break;
      }
    },
    { signal }
  );

  // Boot & dynamic Supabase modules merge (coach_modules)
  function applyDynamicModules(rows: CoachModuleRow[]) {
    ALLQ = BASE_ALLQ.slice();
    DS = BASE_DS.map((d) => ({ ...d, ex: (d.ex || []).map((ex: any) => ({ ...ex, subs: (ex.subs || []).slice() })) }));
    ANN = BASE_ANN.slice();
    MEMO_ALL = {};
    Object.keys(BASE_MEMO_ALL).forEach((k) => {
      MEMO_ALL[k] = (BASE_MEMO_ALL[k] || []).map((item: any) =>
        Array.isArray(item) ? [item[0], item[1], Array.isArray(item[2]) ? item[2].slice() : item[2]] : { ...item }
      );
    });

    const seenQIds = new Set(ALLQ.map((q) => String(q.id)));

    for (const row of rows) {
      const sk = row.subject_key;
      if (!CFG[sk]) continue;

      if ((row.module_type === 'ds' || row.module_type === 'theme' || row.module_type === 'annale') && row.payload) {
        const payload = row.payload;
        if (row.operation === 'enrich' && row.target_id) {
          const target = DS.find((d) => d.id === row.target_id && d.s === sk);
          if (target && Array.isArray(payload.ex)) {
            target.ex = target.ex.concat(payload.ex);
            // Re-scale total points cleanly to 20
            const rawSum = target.ex.reduce(
              (acc: number, ex: any) => acc + (ex.subs || []).reduce((s: number, u: any) => s + (Number(u.pts) || 1), 0),
              0
            );
            if (rawSum > 0) {
              const scale = 20 / rawSum;
              target.ex.forEach((ex: any) => {
                let exPts = 0;
                (ex.subs || []).forEach((u: any) => {
                  u.pts = Math.max(0.5, Math.round((Number(u.pts) || 1) * scale * 4) / 4);
                  exPts += u.pts;
                });
                ex.pts = Math.round(exPts * 100) / 100;
              });
            }
            continue;
          }
        }
        if (!DS.some((d) => d.id === payload.id)) {
          DS.push(payload);
        }
      } else if (row.module_type === 'quiz' && Array.isArray(row.payload)) {
        for (const q of row.payload) {
          if (q && !seenQIds.has(String(q.id))) {
            seenQIds.add(String(q.id));
            ALLQ.push(q);
          }
        }
      } else if (row.module_type === 'memo' && Array.isArray(row.payload) && row.payload.length >= 3) {
        const list = (MEMO_ALL[sk] = MEMO_ALL[sk] || []);
        const [mid, mtitle, mpts] = row.payload;
        if (row.operation === 'enrich' && row.target_id) {
          const existing = list.find((it: any) => Array.isArray(it) && it[0] === row.target_id);
          if (existing && Array.isArray(existing[2]) && Array.isArray(mpts)) {
            existing[2] = existing[2].concat(mpts);
            continue;
          }
        }
        if (!list.some((it: any) => Array.isArray(it) && it[0] === mid)) {
          list.push([mid, mtitle, Array.isArray(mpts) ? mpts : []]);
        }
      } else if (row.module_type === 'pdf_annale' && row.payload) {
        if (!ANN.some((a) => a.id === row.payload.id)) {
          ANN.push(row.payload);
        }
      }
    }

    QS = ALLQ.filter((q) => (q.s || 'c') === SUB);
  }

  function getCatalogContext(): ExistingCatalogContext {
    const dsBySubject: ExistingCatalogContext['dsBySubject'] = {};
    const memoBySubject: ExistingCatalogContext['memoBySubject'] = {};
    Object.keys(CFG).forEach((k) => {
      dsBySubject[k] = DS.filter((d) => d.s === k).map((d) => ({
        id: d.id,
        title: d.title,
        chap: d.chap,
        th: Boolean(d.th),
        ann: Boolean(d.ann),
      }));
      memoBySubject[k] = (MEMO_ALL[k] || []).map((m: any) => ({
        id: Array.isArray(m) ? String(m[0]) : String(m.id || ''),
        title: Array.isArray(m) ? String(m[1]) : String(m.t || ''),
      }));
    });
    return { dsBySubject, memoBySubject };
  }

  async function refreshModules() {
    if (!dataLoaded) return;
    const modRes = await fetchCoachModules();
    if (signal.aborted) return;
    applyDynamicModules(modRes.rows);
    if (store.cur && !run && !dsRun && !thm) {
      if (view === 'home') viewHome();
      else show();
    }
  }

  async function refreshBanner() {
    const custom = await fetchHomeBannerOverride();
    bannerSrc = custom || '/coach-data/promo-banner.jpg';
    if (dataLoaded && view === 'home' && store.cur) viewHome();
  }

  void (async () => {
    try {
      const [allqRes, dsRes, thmRes, memoRes, annRes, customBanner, modRes] = await Promise.all([
        fetch('/coach-data/allq.json').then((r) => r.json()),
        fetch('/coach-data/ds.json').then((r) => r.json()),
        fetch('/coach-data/thm.json').then((r) => r.json()),
        fetch('/coach-data/memo.json').then((r) => r.json()),
        fetch('/coach-data/annales.json').then((r) => r.json()),
        fetchHomeBannerOverride(),
        fetchCoachModules(),
      ]);
      if (signal.aborted) return;
      BASE_ALLQ = allqRes;
      BASE_DS = dsRes;
      THM = thmRes;
      BASE_MEMO_ALL = memoRes;
      BASE_ANN = annRes;
      applyDynamicModules(modRes.rows);
      if (customBanner) bannerSrc = customBanner;
      dataLoaded = true;
      setSub(store.subj && CFG[store.subj] ? store.subj : 'c');
      show();

      unsubModules = subscribeCoachModules(() => {
        void refreshModules();
      });

      // Hydrate cloud profile in background
      await cloudLoad();
      if (signal.aborted) return;
      Object.keys(store.profiles).forEach((k) => {
        if (store.profiles[k].share === undefined) store.profiles[k].share = true;
      });
      save();
      if (store.cur) {
        void syncBoard().then(() => {
          if (tab === 'board' && !run && !signal.aborted) viewBoard();
        });
      }
      if (!store.cur) {
        const nameInp = $<HTMLInputElement>('#name');
        if (!nameInp || !nameInp.value) gate();
      } else if (!run && !dsRun && !thm) {
        if (tab === 'board') viewBoard();
        else show();
      }
    } catch {
      const main = $('#main');
      if (main) main.innerHTML = '<div class="card"><p class="fine">Impossible de charger les données du coach. Recharge la page.</p></div>';
    }
  })();

  return {
    refreshBanner,
    refreshModules,
    getCatalogContext,
    destroy() {
      ac.abort();
      if (dsTimer) window.clearInterval(dsTimer);
      if (cloudTimer) window.clearTimeout(cloudTimer);
      if (boardTimer) window.clearTimeout(boardTimer);
      if (unsubBoard) unsubBoard();
      if (chatUnsub) chatUnsub();
      if (unsubModules) unsubModules();
      unreadUnsubs.forEach((u) => u());
      document.body.classList.remove('hasside');
    },
  };
}
