import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  FileJson,
  HardDrive,
  Lock,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CREATE_QUIZZES_TABLE_SQL,
  deleteLocalQuiz,
  insertQuizToSupabase,
  saveLocalQuiz,
} from '../lib/supabase';
import type { QuizRow, SourceType } from '../types/quiz';
import { normalizeQuestionList } from '../utils/quizNormalizer';
import { CodeBlock, RichContent, SafeSvgBlock } from './RichContent';

const ADMIN_PIN = '3500';

const SAMPLE_MULTI_TYPE_JSON = JSON.stringify(
  [
    {
      type: 'qcm',
      concept: 'Pointeurs C',
      question: "Quelle fonction libère correctement un bloc alloué par `malloc` ?",
      code: 'int *p = malloc(10 * sizeof(int));\n// ... utilisation ...\nfree(p);\np = NULL;',
      lang: 'c',
      options: ['free(p)', 'delete p', 'release(p)', 'clear(p)'],
      answer: 'A',
      explication: 'En C, toute allocation dynamique (`malloc`, `calloc`, `realloc`) se libère via `free(p)`.',
    },
    {
      type: 'calcul',
      concept: 'Filtre RC · KaTeX + SVG',
      question:
        "Pour $R = 2\\,\\text{k}\\Omega$ et $C = 100\\,\\text{nF}$, calculez $f_c = \\frac{1}{2\\pi R C}$ en Hz.",
      svg: '<svg viewBox="0 0 240 70"><line x1="10" y1="24" x2="60" y2="24" stroke="currentColor" stroke-width="2"/><rect x="60" y="14" width="54" height="20" fill="none" stroke="currentColor" stroke-width="2"/><text x="87" y="28" text-anchor="middle" font-size="11" fill="currentColor">R</text><line x1="114" y1="24" x2="220" y2="24" stroke="currentColor" stroke-width="2"/><line x1="156" y1="24" x2="156" y2="40" stroke="currentColor" stroke-width="2"/><line x1="142" y1="40" x2="170" y2="40" stroke="var(--accent)" stroke-width="2.5"/><line x1="142" y1="48" x2="170" y2="48" stroke="var(--accent)" stroke-width="2.5"/><line x1="156" y1="48" x2="156" y2="62" stroke="currentColor" stroke-width="2"/></svg>',
      reponse_numerique: 795.8,
      unite: 'Hz',
      explication: '$$f_c = \\frac{1}{2\\pi \\times 2000 \\times 100\\times 10^{-9}} \\approx 795{,}8\\,\\text{Hz}$$',
    },
    {
      type: 'ordre',
      concept: 'Séquence d’exécution',
      question: "Ordonnez les 3 étapes de base d'une instruction CPU :",
      ordre_correct: ['Fetch (lecture)', 'Decode (décodage)', 'Execute (exécution)'],
      explication: 'Le cycle fondamental de von Neumann est toujours Fetch → Decode → Execute.',
    },
  ],
  null,
  2
);

interface AdminImportModalProps {
  open: boolean;
  existingSubjects: string[];
  localQuizzes: QuizRow[];
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

export function AdminImportModal({
  open,
  existingSubjects,
  localQuizzes,
  onClose,
  onImported,
}: AdminImportModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [matiere, setMatiere] = useState('Programmation C');
  const [chapitre, setChapitre] = useState('');
  const [typeSource, setTypeSource] = useState<SourceType>('Cours');
  const [jsonText, setJsonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'success' | 'error';
    text: string;
    showSqlHelper?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validation = useMemo(() => {
    if (!jsonText.trim()) return null;
    return normalizeQuestionList(jsonText, 'import');
  }, [jsonText]);

  if (!open) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setUnlocked(true);
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Code PIN incorrect. Accès réservé.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setJsonText(content);
      setStatusMsg(null);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleInsertSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!matiere.trim() || !chapitre.trim()) {
      setStatusMsg({
        kind: 'error',
        text: 'Veuillez renseigner la matière et le chapitre avant d’importer.',
      });
      return;
    }

    const parsed = normalizeQuestionList(jsonText, 'imp');
    if (!parsed.ok) {
      setStatusMsg({
        kind: 'error',
        text: parsed.errors[0] || 'Format JSON invalide.',
      });
      return;
    }

    setSubmitting(true);
    const result = await insertQuizToSupabase({
      matiere: matiere.trim(),
      chapitre: chapitre.trim(),
      type_source: typeSource,
      questions: parsed.questions,
    });
    setSubmitting(false);

    if (result.ok) {
      setStatusMsg({
        kind: 'success',
        text: `${parsed.questions.length} question(s) insérée(s) dans Supabase (${matiere.trim()} · ${chapitre.trim()}).`,
      });
      setJsonText('');
      setChapitre('');
      await onImported();
    } else {
      setStatusMsg({
        kind: 'error',
        text: result.error || 'Échec de l’insertion Supabase.',
        showSqlHelper: result.isMissingTable,
      });
    }
  };

  const handleSaveLocally = async () => {
    if (!matiere.trim() || !chapitre.trim()) {
      setStatusMsg({
        kind: 'error',
        text: 'Renseignez la matière et le chapitre pour sauvegarder localement.',
      });
      return;
    }
    const parsed = normalizeQuestionList(jsonText, 'loc');
    if (!parsed.ok) {
      setStatusMsg({ kind: 'error', text: parsed.errors[0] || 'Format JSON invalide.' });
      return;
    }
    saveLocalQuiz({
      matiere: matiere.trim(),
      chapitre: chapitre.trim(),
      type_source: typeSource,
      questions: parsed.questions,
    });
    setStatusMsg({
      kind: 'success',
      text: `${parsed.questions.length} question(s) enregistrée(s) localement dans le catalogue (${matiere.trim()} · ${chapitre.trim()}).`,
    });
    setJsonText('');
    setChapitre('');
    await onImported();
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(CREATE_QUIZZES_TABLE_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDeleteLocal = async (id: string) => {
    deleteLocalQuiz(id);
    await onImported();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full sm:max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-[var(--accent)]" />
            <h2 id="admin-modal-title" className="text-[17px] font-semibold text-[var(--text)]">
              Espace Import Rapide (Admin)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Fermer l'espace admin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ==================== PIN GATE ==================== */}
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="p-6">
            <p className="text-[14.5px] text-[var(--dim)]">
              Entrez le code PIN administrateur pour importer un fichier ou tableau JSON de questions dans la table Supabase <code className="font-mono-code text-[var(--text)]">quizzes</code>.
            </p>

            <div className="mt-4">
              <label
                htmlFor="admin-pin-input"
                className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
              >
                Code PIN (4 chiffres)
              </label>
              <div className="flex gap-2.5">
                <input
                  id="admin-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="••••"
                  className="min-h-[46px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 font-mono-code text-[18px] tracking-[0.25em] text-[var(--text)]"
                />
                <button
                  type="submit"
                  className="min-h-[46px] rounded-lg bg-[var(--accent)] px-5 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
                >
                  Déverrouiller
                </button>
              </div>
              {pinError && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--bad)]" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>
          </form>
        ) : (
          /* ==================== IMPORT WORKSPACE ==================== */
          <form onSubmit={handleInsertSupabase} className="p-5 sm:p-6 space-y-4">
            {/* Matiere + quick suggestions */}
            <div>
              <label
                htmlFor="import-matiere"
                className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
              >
                Matière
              </label>
              <input
                id="import-matiere"
                type="text"
                required
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                placeholder="Ex : Programmation C, Traitement du Signal..."
                className="min-h-[44px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14.5px] text-[var(--text)]"
              />
              {existingSubjects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {existingSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMatiere(s)}
                      className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                        matiere === s
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-medium'
                          : 'border-[var(--line)] text-[var(--dim)] hover:text-[var(--text)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chapitre + Type Source */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="import-chapitre"
                  className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
                >
                  Chapitre
                </label>
                <input
                  id="import-chapitre"
                  type="text"
                  required
                  value={chapitre}
                  onChange={(e) => setChapitre(e.target.value)}
                  placeholder="Ex : Pointeurs & malloc, Filtres RC..."
                  className="min-h-[44px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14.5px] text-[var(--text)]"
                />
              </div>

              <div>
                <span className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5">
                  Type source
                </span>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-1">
                  {(['Cours', 'Annales'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      aria-pressed={typeSource === src}
                      onClick={() => setTypeSource(src)}
                      className={`min-h-[34px] rounded-md text-[13px] font-medium transition-colors ${
                        typeSource === src
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'text-[var(--dim)] hover:text-[var(--text)]'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* JSON Input & Upload Controls */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="import-json"
                  className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)]"
                >
                  Tableau JSON des questions
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-[12px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Importer .json</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText(SAMPLE_MULTI_TYPE_JSON);
                      if (!chapitre) setChapitre('Série Mixte Importée');
                      setStatusMsg(null);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-[12px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    <span>Charger un exemple</span>
                  </button>
                </div>
              </div>

              <textarea
                id="import-json"
                rows={7}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setStatusMsg(null);
                }}
                placeholder='[ { "type": "qcm" | "vrai_faux" | "calcul" | "ordre", "question": "...", ... } ]'
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 font-mono-code text-[12.5px] leading-[1.5] text-[var(--text)]"
              />

              <p className="mt-1.5 text-[12px] text-[var(--dim)]">
                Types supportés : <code className="font-mono-code">qcm</code>,{' '}
                <code className="font-mono-code">vrai_faux</code>,{' '}
                <code className="font-mono-code">calcul</code> (<code className="font-mono-code">reponse_numerique</code> + <code className="font-mono-code">unite</code> ou <code className="font-mono-code">options</code>),{' '}
                <code className="font-mono-code">ordre</code> (<code className="font-mono-code">ordre_correct</code>). KaTeX, code (C/VHDL/ASM/Python) et <code className="font-mono-code">&lt;svg&gt;</code> actifs.
              </p>
            </div>

            {/* Live Validation & Preview */}
            {validation && (
              <div
                className={`rounded-lg border p-3.5 text-[13px] ${
                  validation.ok
                    ? 'border-[var(--good)]/50 bg-[var(--good-soft)]/40'
                    : 'border-[var(--bad)]/50 bg-[var(--bad-soft)]/50'
                }`}
              >
                {validation.ok ? (
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-[var(--good)]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Format valide : {validation.questions.length} question
                        {validation.questions.length > 1 ? 's' : ''} prête
                        {validation.questions.length > 1 ? 's' : ''} à l’insertion
                      </span>
                    </p>
                    {/* Render preview of first question */}
                    {validation.questions[0] && (
                      <div className="mt-2.5 max-h-44 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">
                        <p className="font-mono-code text-[11px] uppercase text-[var(--warm)] mb-1">
                          Aperçu Q1 · {validation.questions[0].type}
                        </p>
                        <RichContent text={validation.questions[0].ask} />
                        {validation.questions[0].svg && (
                          <SafeSvgBlock svg={validation.questions[0].svg} />
                        )}
                        {validation.questions[0].code && (
                          <CodeBlock
                            code={validation.questions[0].code}
                            lang={validation.questions[0].lang}
                            className="mt-2"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-[var(--bad)]">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Erreurs de validation JSON :</span>
                    </p>
                    <ul className="m-0 pl-5 list-disc space-y-0.5">
                      {validation.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Status Feedback & Optional SQL Helper */}
            {statusMsg && (
              <div
                role="status"
                className={`rounded-lg border p-3.5 text-[13.5px] ${
                  statusMsg.kind === 'success'
                    ? 'border-[var(--good)] bg-[var(--good-soft)] text-[var(--good)]'
                    : 'border-[var(--bad)] bg-[var(--bad-soft)] text-[var(--bad)]'
                }`}
              >
                <p className="font-medium">{statusMsg.text}</p>

                {statusMsg.showSqlHelper && (
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--text)]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-semibold">
                        La table <code className="font-mono-code">public.quizzes</code> n&apos;existe pas encore sur Supabase — SQL à exécuter :
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex h-7 items-center gap-1 rounded border border-[var(--line)] px-2 text-[11.5px] font-mono-code hover:border-[var(--accent)]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedSql ? 'Copié' : 'Copier SQL'}</span>
                      </button>
                    </div>
                    <pre className="m-0 overflow-x-auto rounded bg-[var(--surface-2)] p-2.5 font-mono-code text-[11.5px] leading-[1.45]">
                      {CREATE_QUIZZES_TABLE_SQL}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--line)]">
              <button
                type="submit"
                disabled={submitting || !validation?.ok}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
              >
                <Database className="h-4 w-4 shrink-0" />
                <span>{submitting ? 'Envoi vers Supabase...' : 'Insérer dans Supabase'}</span>
              </button>

              <button
                type="button"
                disabled={!validation?.ok}
                onClick={handleSaveLocally}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-[13.5px] font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-45"
              >
                <HardDrive className="h-4 w-4 shrink-0" />
                <span>Enregistrer en local</span>
              </button>
            </div>

            {/* Locally Saved Imported Batches */}
            {localQuizzes.length > 0 && (
              <div className="border-t border-[var(--line)] pt-4">
                <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2">
                  Lots enregistrés localement ({localQuizzes.length})
                </p>
                <ul className="m-0 p-0 list-none space-y-2">
                  {localQuizzes.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px]"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-[var(--text)]">{row.matiere}</span>
                        <span className="text-[var(--dim)]">
                          {' '}
                          · {row.chapitre} · {row.type_source} ({row.questions.length} q.)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocal(row.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--bad)] hover:bg-[var(--bad-soft)]"
                        aria-label={`Supprimer le lot local ${row.chapitre}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
