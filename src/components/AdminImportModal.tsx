import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileJson,
  FolderPlus,
  GitMerge,
  Lock,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  appendQuestionsToSectionDsInSupabase,
  deleteQuizInSupabase,
  insertQuizToSupabase,
  updateQuizInSupabase,
} from '../lib/supabase';
import type { QuizRow } from '../types/quiz';
import { getDifficultyStars, normalizeDifficultySafe, normalizeSectionDs } from '../utils/quizEngine';
import { normalizeQuestionList } from '../utils/quizNormalizer';
import { CodeBlock, RichContent, SafeSvgBlock } from './RichContent';

const ADMIN_PIN = '3500';

const SAMPLE_MULTI_TYPE_JSON = JSON.stringify(
  [
    {
      type: 'qcm',
      themes: ['Allocation dynamique', 'Pointeurs'],
      difficulte: 1,
      question: 'Quelle fonction libère correctement un bloc alloué par `malloc` ?',
      code: 'int *p = malloc(10 * sizeof(int));\n// ... utilisation ...\nfree(p);\np = NULL;',
      lang: 'c',
      options: ['free(p)', 'delete p', 'release(p)', 'clear(p)'],
      reponse_index: 0,
      explication:
        'En C, toute allocation dynamique (`malloc`, `calloc`, `realloc`) se libère via `free(p)`.',
    },
    {
      type: 'calcul',
      themes: ['Filtres analogiques', 'Bode & Décibels'],
      difficulte: 2,
      question:
        'Pour $R = 2\\,\\text{k}\\Omega$ et $C = 100\\,\\text{nF}$, calculez $f_c = \\frac{1}{2\\pi R C}$ en Hz.',
      svg: '<svg viewBox="0 0 240 70"><line x1="10" y1="24" x2="60" y2="24" stroke="currentColor" stroke-width="2"/><rect x="60" y="14" width="54" height="20" fill="none" stroke="currentColor" stroke-width="2"/><text x="87" y="28" text-anchor="middle" font-size="11" fill="currentColor">R</text><line x1="114" y1="24" x2="220" y2="24" stroke="currentColor" stroke-width="2"/><line x1="156" y1="24" x2="156" y2="40" stroke="currentColor" stroke-width="2"/><line x1="142" y1="40" x2="170" y2="40" stroke="var(--accent)" stroke-width="2.5"/><line x1="142" y1="48" x2="170" y2="48" stroke="var(--accent)" stroke-width="2.5"/><line x1="156" y1="48" x2="156" y2="62" stroke="currentColor" stroke-width="2"/></svg>',
      reponse_numerique: 795.8,
      unite: 'Hz',
      explication:
        '$$f_c = \\frac{1}{2\\pi \\times 2000 \\times 100\\times 10^{-9}} \\approx 795{,}8\\,\\text{Hz}$$',
    },
    {
      type: 'ordre',
      themes: ['Architecture CPU', 'Cycle instruction'],
      difficulte: 3,
      question: "Ordonnez les 3 étapes de base d'une instruction CPU :",
      ordre_correct: ['Fetch (lecture)', 'Decode (décodage)', 'Execute (exécution)'],
      explication: 'Le cycle fondamental de von Neumann est toujours Fetch → Decode → Execute.',
    },
  ],
  null,
  2
);

type ImportMode = 'merge' | 'new';

interface AdminImportModalProps {
  open: boolean;
  existingSubjects: string[];
  allQuizzes: QuizRow[];
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

export function AdminImportModal({
  open,
  existingSubjects,
  allQuizzes,
  onClose,
  onImported,
}: AdminImportModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [importMode, setImportMode] = useState<ImportMode>(() =>
    allQuizzes.length > 0 ? 'merge' : 'new'
  );
  const [editingRow, setEditingRow] = useState<QuizRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [matiere, setMatiere] = useState('Programmation C');
  const [sectionDs, setSectionDs] = useState('DS 1');
  const [jsonText, setJsonText] = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const existingSectionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allQuizzes) {
      if (row.matiere === matiere.trim()) {
        const sec = normalizeSectionDs(row.section_ds);
        counts.set(sec, (counts.get(sec) ?? 0) + row.questions.length);
      }
    }
    return Array.from(counts.entries())
      .map(([sec, count]) => ({ section_ds: sec, count }))
      .sort((a, b) => a.section_ds.localeCompare(b.section_ds, 'fr', { numeric: true }));
  }, [allQuizzes, matiere]);

  const targetSectionExistingCount = useMemo(() => {
    const match = existingSectionsWithCounts.find(
      (s) => s.section_ds === normalizeSectionDs(sectionDs)
    );
    return match?.count ?? 0;
  }, [existingSectionsWithCounts, sectionDs]);

  const validation = useMemo(() => {
    if (!jsonText.trim()) return null;
    return normalizeQuestionList(jsonText, 'import');
  }, [jsonText]);

  const difficultyBreakdown = useMemo(() => {
    if (!validation?.ok) return null;
    const counts = { 1: 0, 2: 0, 3: 0 };
    for (const q of validation.questions) {
      counts[normalizeDifficultySafe(q.difficulte)] += 1;
    }
    return counts;
  }, [validation]);

  if (!open) return null;

  const effectiveMode: ImportMode =
    allQuizzes.length === 0 && !editingRow ? 'new' : importMode;

  const resetForm = () => {
    setEditingRow(null);
    setJsonText('');
    setLoadedFileName(null);
  };

  const handleSelectSubject = (nextMatiere: string) => {
    setMatiere(nextMatiere);
    const matchingSecs = allQuizzes
      .filter((r) => r.matiere === nextMatiere)
      .map((r) => normalizeSectionDs(r.section_ds))
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    if (effectiveMode === 'merge' && matchingSecs.length > 0 && !matchingSecs.includes(sectionDs)) {
      setSectionDs(matchingSecs[0]);
    }
  };

  const handleStartEdit = (row: QuizRow) => {
    setEditingRow(row);
    setConfirmDeleteId(null);
    setLoadedFileName(null);
    setMatiere(row.matiere);
    setSectionDs(row.section_ds || 'DS 1');
    setJsonText(JSON.stringify(row.questions, null, 2));
    setStatusMsg(null);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setUnlocked(true);
      setPinError(null);
      setPinInput('');
      setImportMode(allQuizzes.length > 0 ? 'merge' : 'new');
      if (existingSubjects.length > 0 && !existingSubjects.includes(matiere)) {
        handleSelectSubject(existingSubjects[0]);
      }
    } else {
      setPinError('Code PIN incorrect. Accès réservé.');
    }
  };

  const readJsonFile = (file: File) => {
    const looksLikeJson =
      file.name.toLowerCase().endsWith('.json') ||
      file.type === 'application/json' ||
      file.type === 'text/json';

    if (!looksLikeJson) {
      setStatusMsg({
        kind: 'error',
        text: `Le fichier « ${file.name} » n'est pas un fichier .json valide.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setJsonText(content);
      setLoadedFileName(file.name);
      setStatusMsg(null);
    };
    reader.onerror = () => {
      setStatusMsg({
        kind: 'error',
        text: `Impossible de lire le fichier « ${file.name} ».`,
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readJsonFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readJsonFile(file);
    }
  };

  const handleSubmitSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!matiere.trim() || !sectionDs.trim()) {
      setStatusMsg({
        kind: 'error',
        text: 'Veuillez renseigner la matière et la section DS.',
      });
      return;
    }

    const parsed = normalizeQuestionList(jsonText, `imp-${Date.now().toString(36)}`);
    if (!parsed.ok) {
      setStatusMsg({
        kind: 'error',
        text: parsed.errors[0] || 'Format JSON invalide.',
      });
      return;
    }

    setSubmitting(true);

    const cleanMatiere = matiere.trim();
    const cleanSection = normalizeSectionDs(sectionDs);

    let result;
    if (editingRow) {
      result = await updateQuizInSupabase(editingRow.id, {
        matiere: cleanMatiere,
        section_ds: cleanSection,
        chapitre: editingRow.chapitre || cleanSection,
        questions: parsed.questions,
      });
    } else if (effectiveMode === 'merge') {
      result = await appendQuestionsToSectionDsInSupabase({
        matiere: cleanMatiere,
        section_ds: cleanSection,
        questions: parsed.questions,
      });
    } else {
      result = await insertQuizToSupabase({
        matiere: cleanMatiere,
        section_ds: cleanSection,
        chapitre: cleanSection,
        questions: parsed.questions,
      });
    }

    setSubmitting(false);

    if (result.ok) {
      setStatusMsg({
        kind: 'success',
        text: editingRow
          ? `Quiz mis à jour dans Supabase (${cleanMatiere} · ${cleanSection}) — synchronisé pour tous les étudiants.`
          : effectiveMode === 'merge'
            ? `${parsed.questions.length} question(s) ajoutée(s) à ${cleanMatiere} · ${cleanSection} (${result.totalQuestionsAfterMerge ?? parsed.questions.length} au total dans Supabase).`
            : `${parsed.questions.length} question(s) publiée(s) dans Supabase (${cleanMatiere} · ${cleanSection}) — visible par tous les étudiants.`,
      });
      resetForm();
      await onImported();
    } else {
      setStatusMsg({
        kind: 'error',
        text: result.error || "Échec de l'enregistrement dans Supabase.",
      });
    }
  };

  const handleDeleteSupabaseRow = async (row: QuizRow) => {
    setDeletingId(row.id);
    setStatusMsg(null);
    const result = await deleteQuizInSupabase(row.id);
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (result.ok) {
      if (editingRow?.id === row.id) resetForm();
      setStatusMsg({
        kind: 'success',
        text: `Lot supprimé de Supabase (${row.matiere} · ${row.section_ds}).`,
      });
      await onImported();
    } else {
      setStatusMsg({
        kind: 'error',
        text: result.error || 'Échec de la suppression dans Supabase.',
      });
    }
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
        className="max-h-[92dvh] w-full sm:max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-[var(--accent)]" />
            <h2 id="admin-modal-title" className="text-[17px] font-semibold text-[var(--text)]">
              Espace Admin — Supabase
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Fermer l'espace admin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ==================== PIN GATE ==================== */}
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="p-6">
            <p className="text-[14.5px] text-[var(--dim)]">
              Entrez le code PIN administrateur pour publier, fusionner ou supprimer des quiz dans{' '}
              <code className="font-mono-code text-[var(--text)]">Supabase</code>. Toute modification
              est automatiquement diffusée à tous les étudiants.
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
                  className="min-h-[48px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 font-mono-code text-[18px] tracking-[0.25em] text-[var(--text)]"
                />
                <button
                  type="submit"
                  className="min-h-[48px] rounded-xl bg-[var(--accent)] px-5 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
                >
                  Déverrouiller
                </button>
              </div>
              {pinError && (
                <p
                  className="mt-2.5 flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--bad)]"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>
          </form>
        ) : (
          /* ==================== SUPABASE-DIRECT ADMIN WORKSPACE ==================== */
          <form onSubmit={handleSubmitSupabase} className="p-5 sm:p-6 space-y-4">
            {editingRow ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-[13px]">
                <span className="font-medium text-[var(--text)]">
                  Modification Supabase : <strong>{editingRow.matiere}</strong> ·{' '}
                  {editingRow.section_ds}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Annuler
                </button>
              </div>
            ) : (
              /* Import Mode Switcher: Merge into existing DS vs Create new DS */
              allQuizzes.length > 0 && (
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1.5"
                  role="radiogroup"
                  aria-label="Mode d'importation"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectiveMode === 'merge'}
                    onClick={() => {
                      setImportMode('merge');
                      setStatusMsg(null);
                    }}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                      effectiveMode === 'merge'
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'text-[var(--dim)] hover:text-[var(--text)]'
                    }`}
                  >
                    <GitMerge className="h-4 w-4 shrink-0" />
                    <span>Ajouter à une section DS existante</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectiveMode === 'new'}
                    onClick={() => {
                      setImportMode('new');
                      setStatusMsg(null);
                    }}
                    className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                      effectiveMode === 'new'
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'text-[var(--dim)] hover:text-[var(--text)]'
                    }`}
                  >
                    <FolderPlus className="h-4 w-4 shrink-0" />
                    <span>Créer une nouvelle section DS</span>
                  </button>
                </div>
              )
            )}

            {/* Matiere */}
            <div>
              <label
                htmlFor="import-matiere"
                className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
              >
                Matière
              </label>
              {effectiveMode === 'merge' && !editingRow && existingSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {existingSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={matiere === s}
                      onClick={() => handleSelectSubject(s)}
                      className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        matiere === s
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                          : 'border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] hover:text-[var(--text)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <input
                    id="import-matiere"
                    type="text"
                    required
                    value={matiere}
                    onChange={(e) => setMatiere(e.target.value)}
                    placeholder="Ex : Programmation C, Traitement du Signal..."
                    className="min-h-[46px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14.5px] text-[var(--text)]"
                  />
                  {existingSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {existingSubjects.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSelectSubject(s)}
                          className={`rounded-lg border px-2.5 py-1 text-[12px] transition-colors ${
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
                </>
              )}
            </div>

            {/* Section DS */}
            <div>
              <label
                htmlFor="import-section-ds"
                className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5"
              >
                {effectiveMode === 'merge' && !editingRow
                  ? 'Section DS cible (fusion sans écrasement)'
                  : 'Section DS (section_ds)'}
              </label>

              {effectiveMode === 'merge' && !editingRow && existingSectionsWithCounts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {existingSectionsWithCounts.map(({ section_ds: sec, count }) => {
                      const active = normalizeSectionDs(sectionDs) === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSectionDs(sec)}
                          className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                              : 'border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span>{sec}</span>
                          <span className="font-mono-code text-[12px] font-normal text-[var(--dim)] tabular-nums">
                            {count} q. existantes
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12.5px] text-[var(--dim)]">
                    Les nouvelles questions seront fusionnées à la suite des{' '}
                    <strong className="text-[var(--text)] tabular-nums">
                      {targetSectionExistingCount}
                    </strong>{' '}
                    questions déjà présentes dans{' '}
                    <strong className="text-[var(--text)]">
                      {matiere} · {normalizeSectionDs(sectionDs)}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <>
                  <input
                    id="import-section-ds"
                    type="text"
                    required
                    value={sectionDs}
                    onChange={(e) => setSectionDs(e.target.value)}
                    placeholder="Ex : DS 1, DS 2, DS 3, Partiel Final..."
                    className="min-h-[46px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14.5px] text-[var(--text)]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['DS 1', 'DS 2', 'DS 3'].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSectionDs(sec)}
                        className={`rounded-lg border px-2.5 py-1 text-[12px] font-mono-code transition-colors ${
                          sectionDs === sec
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                            : 'border-[var(--line)] text-[var(--dim)] hover:text-[var(--text)]'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Prominent Drag-and-Drop / File Selector Zone for .json */}
            <div>
              <p className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5">
                Importer un fichier .json
              </p>

              <input
                ref={fileInputRef}
                id="import-json-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Glisser-déposer ou sélectionner un fichier .json"
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                  isDraggingFile
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : loadedFileName
                      ? 'border-[var(--good)]/70 bg-[var(--good-soft)]/30 hover:border-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]'
                }`}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Upload className="h-5 w-5" />
                </div>

                {loadedFileName ? (
                  <div className="mt-2.5">
                    <p className="text-[14px] font-semibold text-[var(--text)]">
                      Fichier chargé :{' '}
                      <span className="font-mono-code text-[var(--accent)]">{loadedFileName}</span>
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dim)]">
                      Cliquez ou glissez un autre fichier <code className="font-mono-code">.json</code> pour remplacer
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <p className="text-[14px] font-semibold text-[var(--text)]">
                      Glissez-déposez un fichier <code className="font-mono-code">.json</code> ici
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dim)]">
                      ou cliquez pour parcourir vos fichiers (banque de questions)
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-semibold text-[var(--accent-ink)]">
                    <FileJson className="h-3.5 w-3.5" />
                    <span>Sélectionner un fichier .json</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Direct JSON Paste Editor */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="import-json"
                  className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)]"
                >
                  Ou coller le tableau JSON directement
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(SAMPLE_MULTI_TYPE_JSON);
                    setLoadedFileName(null);
                    setStatusMsg(null);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-[12px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  <span>Exemple JSON</span>
                </button>
              </div>

              <textarea
                id="import-json"
                rows={6}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  if (loadedFileName) setLoadedFileName(null);
                  setStatusMsg(null);
                }}
                placeholder='[ { "type": "qcm", "themes": ["Pointeurs"], "difficulte": 2, "question": "...", "options": [...], "reponse_index": 0, "explication": "..." } ]'
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 font-mono-code text-[12.5px] leading-[1.5] text-[var(--text)]"
              />

              <p className="mt-1.5 text-[12px] text-[var(--dim)]">
                Champs supportés : <code className="font-mono-code">&quot;themes&quot;</code>,{' '}
                <code className="font-mono-code">&quot;difficulte&quot;</code> (1, 2 ou 3 — défaut 2),{' '}
                <code className="font-mono-code">qcm</code>,{' '}
                <code className="font-mono-code">vrai_faux</code>,{' '}
                <code className="font-mono-code">calcul</code>,{' '}
                <code className="font-mono-code">ordre</code> + KaTeX, code et{' '}
                <code className="font-mono-code">&lt;svg&gt;</code>.
              </p>
            </div>

            {/* Live Validation & Preview */}
            {validation && (
              <div
                className={`rounded-xl border p-3.5 text-[13px] ${
                  validation.ok
                    ? 'border-[var(--good)]/50 bg-[var(--good-soft)]/40'
                    : 'border-[var(--bad)]/50 bg-[var(--bad-soft)]/50'
                }`}
              >
                {validation.ok ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-semibold text-[var(--good)]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          Format valide : {validation.questions.length} question
                          {validation.questions.length > 1 ? 's' : ''} prête
                          {validation.questions.length > 1 ? 's' : ''}
                          {effectiveMode === 'merge' && !editingRow
                            ? ` (total après fusion : ${targetSectionExistingCount + validation.questions.length})`
                            : ''}
                        </span>
                      </p>

                      {difficultyBreakdown && (
                        <span className="font-mono-code text-[11.5px] text-[var(--dim)] tabular-nums">
                          1⭐: {difficultyBreakdown[1]} · 2⭐⭐: {difficultyBreakdown[2]} · 3⭐⭐⭐:{' '}
                          {difficultyBreakdown[3]}
                        </span>
                      )}
                    </div>

                    {validation.questions[0] && (
                      <div className="mt-2.5 max-h-44 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">
                        <p className="font-mono-code text-[11px] uppercase text-[var(--warm)] mb-1">
                          Aperçu Q1 · {validation.questions[0].type} ·{' '}
                          {validation.questions[0].themes.join(' / ')} ·{' '}
                          {getDifficultyStars(
                            normalizeDifficultySafe(validation.questions[0].difficulte)
                          )}
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

            {/* Status Feedback */}
            {statusMsg && (
              <div
                role="status"
                className={`rounded-xl border p-3.5 text-[13.5px] ${
                  statusMsg.kind === 'success'
                    ? 'border-[var(--good)] bg-[var(--good-soft)] text-[var(--good)]'
                    : 'border-[var(--bad)] bg-[var(--bad-soft)] text-[var(--bad)]'
                }`}
              >
                <p className="font-medium">{statusMsg.text}</p>
              </div>
            )}

            {/* Single Authoritative Action: Direct to Supabase */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--line)]">
              <button
                type="submit"
                disabled={submitting || !validation?.ok}
                className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
              >
                <Database className="h-4 w-4 shrink-0" />
                <span>
                  {submitting
                    ? 'Publication vers Supabase...'
                    : editingRow
                      ? 'Enregistrer dans Supabase'
                      : effectiveMode === 'merge'
                        ? 'Fusionner dans Supabase'
                        : 'Publier dans Supabase'}
                </span>
              </button>
            </div>

            {/* Existing Quizzes in Supabase (Edit / Delete directly in Supabase) */}
            {allQuizzes.length > 0 && (
              <div className="border-t border-[var(--line)] pt-4">
                <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2">
                  Quiz publiés sur Supabase ({allQuizzes.length})
                </p>
                <ul className="m-0 p-0 list-none space-y-2">
                  {allQuizzes.map((row) => {
                    const confirming = confirmDeleteId === row.id;
                    const isDeleting = deletingId === row.id;
                    return (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px]"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-[var(--text)]">{row.matiere}</span>
                          <span className="text-[var(--dim)]">
                            {' '}
                            · {row.section_ds} ({row.questions.length} q.)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {confirming ? (
                            <>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteSupabaseRow(row)}
                                className="h-8 rounded-lg bg-[var(--bad)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                {isDeleting ? 'Suppression...' : 'Confirmer'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteId(null)}
                                className="h-8 rounded-lg border border-[var(--line)] px-2 text-[12px] text-[var(--dim)] hover:text-[var(--text)]"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(row)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                                aria-label={`Modifier le lot ${row.matiere} ${row.section_ds}`}
                                title="Modifier dans Supabase"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(row.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--bad)] hover:bg-[var(--bad-soft)]"
                                aria-label={`Supprimer le lot ${row.matiere} ${row.section_ds}`}
                                title="Supprimer de Supabase"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
