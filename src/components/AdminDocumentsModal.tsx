import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteCoachDocument,
  fetchCoachDocuments,
  saveCoachDocumentAndModules,
  uploadDocumentFile,
  type CoachDocumentRow,
} from '../coach/supabaseBackend';
import { uploadMediaToSupabase, upsertAppSettingInSupabase } from '../lib/supabase';
import { extractDocumentForGemini, type ExtractedDocument } from '../lib/documentExtract';
import {
  analyzeDocumentWithGemini,
  checkServerGeminiAvailable,
  getSavedGeminiKey,
  setSavedGeminiKey,
  SUBJECT_CATALOG,
  type ExistingCatalogContext,
  type IngestionPlan,
  type SubjectDescriptor,
} from '../lib/documentIngestion';

const ADMIN_PIN = '3500';

type AdminTab = 'documents' | 'appearance';

const INTERFACE_LABELS: Record<string, string> = {
  bode: 'Diagramme de Bode interactif',
  signal: 'Visualiseur Signal / Spectre TTSD',
  pipeline: 'Grille Pipeline RISC-V 5 étages',
  cloze: 'Textes à trous / Frenglish',
  fsm: 'Éditeur Machine d’états (Moore/Mealy)',
  circ: 'Éditeur Logigramme',
  chrono: 'Éditeur Chronogramme',
  asm: 'Simulateur Assembleur RISC-V',
  cmd: 'Évaluateur Shell / Makefile',
  mat: 'Matrices interactives',
  grid: 'Grille / Table interactive',
  nums: 'Calculs multi-champs',
  num: 'Calcul numérique',
  code_c: 'Quiz Code C coloré',
  quiz: 'Quiz rapide',
  qcm: 'QCM ciblé',
  memo: 'Aide-mémoire enrichi',
  pdf_annale: 'Annale PDF téléchargeable',
};

interface AdminDocumentsModalProps {
  open: boolean;
  bannerUrl: string | null;
  getCatalogContext: () => ExistingCatalogContext;
  onClose: () => void;
  onModulesChanged: () => Promise<void> | void;
  onAppearanceChanged: () => Promise<void> | void;
}

export function AdminDocumentsModal({
  open,
  bannerUrl,
  getCatalogContext,
  onClose,
  onModulesChanged,
  onAppearanceChanged,
}: AdminDocumentsModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('documents');

  // Document ingestion state
  const [docs, setDocs] = useState<CoachDocumentRow[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [serverAiReady, setServerAiReady] = useState<boolean | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState(() => getSavedGeminiKey());
  const [showKeyBox, setShowKeyBox] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedDocument | null>(null);
  const [userHint, setUserHint] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [stepMsg, setStepMsg] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [plan, setPlan] = useState<IngestionPlan | null>(null);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Appearance tab state
  const [bannerDraft, setBannerDraft] = useState(bannerUrl ?? '');
  const [bannerBusy, setBannerBusy] = useState(false);
  const [appearanceStatus, setAppearanceStatus] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    const res = await fetchCoachDocuments();
    setDocs(res.rows);
    setMissingTable(Boolean(res.missingTable));
  }, []);

  useEffect(() => {
    if (!open) return;
    setBannerDraft(bannerUrl ?? '');
    void loadDocuments();
    void checkServerGeminiAvailable().then((ok) => setServerAiReady(ok));
  }, [open, bannerUrl, loadDocuments]);

  if (!open) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setUnlocked(true);
      setPinError(null);
      setPinInput('');
      void loadDocuments();
    } else {
      setPinError('Code PIN incorrect. Accès réservé.');
    }
  };

  const handlePickFile = (file: File) => {
    setSelectedFile(file);
    setExtracted(null);
    setPlan(null);
    setStoredUrl(null);
    setStatusMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handlePickFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handlePickFile(f);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setStatusMsg(null);
    setPlan(null);

    try {
      setStepMsg('1/3 · Lecture et extraction du document…');
      const doc = await extractDocumentForGemini(selectedFile);
      setExtracted(doc);

      setStepMsg('2/3 · Sauvegarde du fichier source (Supabase Storage)…');
      const up = await uploadDocumentFile(selectedFile);
      const publicUrl = up.ok && up.publicUrl ? up.publicUrl : null;
      setStoredUrl(publicUrl);

      setStepMsg(
        '3/3 · Détection automatique de la matière & génération d’entraînements adaptés (Gemini)…'
      );
      const catalog = getCatalogContext();
      const generatedPlan = await analyzeDocumentWithGemini(doc, catalog, {
        userHint: userHint.trim() || undefined,
        apiKey: apiKeyDraft.trim() || undefined,
        storageUrl: publicUrl,
      });

      setPlan(generatedPlan);
      setStepMsg(null);
    } catch (err) {
      setStepMsg(null);
      const msg = err instanceof Error ? err.message : "Erreur pendant l'analyse du document.";
      setStatusMsg({ kind: 'error', text: msg });
      if (msg.toLowerCase().includes('clé api')) setShowKeyBox(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOverrideSubject = (nextKey: SubjectDescriptor['key']) => {
    if (!plan) return;
    const desc = SUBJECT_CATALOG.find((s) => s.key === nextKey);
    if (!desc) return;
    const defaultChap = desc.chapters[0][0];
    setPlan({
      ...plan,
      subject_key: nextKey,
      subject_name: desc.name,
      modules: plan.modules.map((m) => ({
        ...m,
        subject_key: nextKey,
        payload:
          m.module_type === 'ds' || m.module_type === 'theme' || m.module_type === 'annale'
            ? { ...m.payload, s: nextKey, chap: m.payload.th ? defaultChap : undefined }
            : m.module_type === 'quiz' && Array.isArray(m.payload)
              ? m.payload.map((q: Record<string, unknown>) => ({
                  ...q,
                  s: nextKey,
                  topic: defaultChap,
                }))
              : m.module_type === 'pdf_annale'
                ? { ...m.payload, s: nextKey }
                : m.payload,
      })),
    });
  };

  const handlePublishPlan = async () => {
    if (!plan || !extracted) return;
    setPublishing(true);
    setStatusMsg(null);

    const saved = await saveCoachDocumentAndModules(
      {
        filename: extracted.filename,
        mime_type: extracted.mimeType,
        file_size: extracted.fileSize,
        storage_url: storedUrl,
        subject_key: plan.subject_key,
        subject_name: plan.subject_name,
        doc_type: plan.doc_type,
        detected_topics: plan.detected_topics,
        action_summary: plan.action_summary,
        reasoning: plan.reasoning,
      },
      plan.modules
    );

    setPublishing(false);
    if (saved.ok) {
      setStatusMsg({
        kind: 'success',
        text: `Document « ${extracted.filename} » classé en ${plan.subject_name} : ${plan.modules.length} module(s) publié(s) en direct pour toute la promo.`,
      });
      setSelectedFile(null);
      setExtracted(null);
      setPlan(null);
      setUserHint('');
      await loadDocuments();
      await onModulesChanged();
    } else {
      setStatusMsg({
        kind: 'error',
        text: saved.missingTable
          ? 'Tables Supabase coach_documents / coach_modules pas encore migrées : pousse sur GitHub pour activer la synchronisation cloud.'
          : saved.error || "Échec de l'enregistrement dans Supabase.",
      });
    }
  };

  const handleDeleteDoc = async (doc: CoachDocumentRow) => {
    setDeletingId(doc.id);
    const res = await deleteCoachDocument(doc.id);
    setDeletingId(null);
    if (res.ok) {
      setStatusMsg({
        kind: 'success',
        text: `Document « ${doc.filename} » et ses entraînements associés supprimés.`,
      });
      await loadDocuments();
      await onModulesChanged();
    } else {
      setStatusMsg({ kind: 'error', text: res.error || 'Suppression impossible.' });
    }
  };

  // Appearance handlers
  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBannerBusy(true);
    setAppearanceStatus(null);
    const uploaded = await uploadMediaToSupabase(file, 'banner');
    if (!uploaded.ok || !uploaded.publicUrl) {
      setBannerBusy(false);
      setAppearanceStatus({
        kind: 'error',
        text: uploaded.error || "Impossible d'envoyer la bannière.",
      });
      return;
    }
    const saved = await upsertAppSettingInSupabase('home_banner_url', uploaded.publicUrl);
    setBannerBusy(false);
    if (saved.ok) {
      setBannerDraft(uploaded.publicUrl);
      setAppearanceStatus({ kind: 'success', text: 'Bannière enregistrée pour toute la promo.' });
      await onAppearanceChanged();
    } else {
      setAppearanceStatus({ kind: 'error', text: saved.error || 'Échec sauvegarde bannière.' });
    }
  };

  const handleSaveBannerUrl = async (nextUrl: string | null) => {
    setBannerBusy(true);
    setAppearanceStatus(null);
    const saved = await upsertAppSettingInSupabase('home_banner_url', nextUrl);
    setBannerBusy(false);
    if (saved.ok) {
      setBannerDraft(nextUrl ?? '');
      setAppearanceStatus({
        kind: 'success',
        text: nextUrl
          ? 'Bannière mise à jour pour tous les étudiants.'
          : 'Bannière réinitialisée vers la bannière officielle ESET 3A.',
      });
      await onAppearanceChanged();
    } else {
      setAppearanceStatus({ kind: 'error', text: saved.error || 'Erreur mise à jour bannière.' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full sm:max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-[var(--accent)]" />
              <h2 id="admin-modal-title" className="text-[17px] font-semibold text-[var(--text)]">
                Espace Admin — Documents & Entraînements
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

          {unlocked && (
            <div
              role="tablist"
              aria-label="Sections de l'espace admin"
              className="grid grid-cols-2 gap-1 px-5 pb-3"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'documents'}
                onClick={() => setActiveTab('documents')}
                className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                  activeTab === 'documents'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] hover:text-[var(--text)]'
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Documents & IA Moodle</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'appearance'}
                onClick={() => setActiveTab('appearance')}
                className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                  activeTab === 'appearance'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] hover:text-[var(--text)]'
                }`}
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span>Apparence & Bannière</span>
              </button>
            </div>
          )}
        </div>

        {/* PIN Gate */}
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="p-6 pb-8">
            <p className="text-[14.5px] text-[var(--dim)]">
              Entre le code PIN pour ajouter des cours, TD, TP ou annales Moodle : l’IA détecte
              automatiquement la matière et génère ou améliore des entraînements adaptés pour toute
              la promo.
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
        ) : activeTab === 'documents' ? (
          /* ==================== TAB 1: SMART DOCUMENT INGESTION ==================== */
          <div className="p-5 sm:p-6 pb-10 space-y-5">
            {/* Engine status strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[12.5px]">
              <div className="flex items-center gap-2 text-[var(--dim)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <span>
                  {serverAiReady
                    ? 'Moteur Gemini 4 serveur prêt (classification + génération auto)'
                    : apiKeyDraft.trim()
                      ? 'Clé Gemini locale configurée (prêt pour analyse directe)'
                      : 'Configure une clé Gemini (ou héberge dans AI Studio) pour analyser les docs'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyBox((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{showKeyBox ? 'Masquer clé' : 'Clé Gemini'}</span>
              </button>
            </div>

            {showKeyBox && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3.5 space-y-2">
                <label
                  htmlFor="gemini-key-input"
                  className="block font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]"
                >
                  Clé API Gemini (stockée uniquement sur cet appareil)
                </label>
                <div className="flex gap-2">
                  <input
                    id="gemini-key-input"
                    type="password"
                    value={apiKeyDraft}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                    placeholder="AIza..."
                    className="min-h-[42px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono-code text-[13px] text-[var(--text)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSavedGeminiKey(apiKeyDraft);
                      setShowKeyBox(false);
                      setStatusMsg({
                        kind: 'success',
                        text: apiKeyDraft.trim()
                          ? 'Clé Gemini enregistrée localement.'
                          : 'Clé Gemini locale effacée.',
                      });
                    }}
                    className="min-h-[42px] rounded-xl bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)]"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div>
              <p className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1.5">
                Ajouter un document de cours, TD, TP ou annale
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.odt,.xlsx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : selectedFile
                      ? 'border-[var(--good)]/70 bg-[var(--good-soft)]/25 hover:border-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]'
                }`}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Upload className="h-5 w-5" />
                </div>

                {selectedFile ? (
                  <div className="mt-2.5">
                    <p className="text-[14.5px] font-semibold text-[var(--text)]">
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dim)]">
                      {(selectedFile.size / 1024).toFixed(0)} Ko · Clique pour changer de document
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <p className="text-[14.5px] font-semibold text-[var(--text)]">
                      Glisse-dépose un cours, TD, annale ou photo de sujet
                    </p>
                    <p className="mt-1 text-[12.5px] text-[var(--dim)]">
                      PDF, DOCX, ODT, XLSX, PPTX, TXT, PNG/JPG · Détection auto de la matière &
                      génération d’interfaces adaptées (Bode, Spectre, Pipeline, Cloze, FSM, RISC-V…)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Hint + Analyze Button */}
            {selectedFile && !plan && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="doc-hint-input"
                    className="block font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] mb-1"
                  >
                    Consigne optionnelle (laisser vide = 100 % automatique)
                  </label>
                  <input
                    id="doc-hint-input"
                    type="text"
                    value={userHint}
                    onChange={(e) => setUserHint(e.target.value)}
                    placeholder="Ex : Crée un DS blanc sur les filtres actifs, ou complète le mémo du chapitre 3…"
                    className="min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14px] text-[var(--text)]"
                  />
                </div>

                <button
                  type="button"
                  disabled={analyzing}
                  onClick={() => void handleAnalyze()}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    {analyzing
                      ? stepMsg || 'Analyse du document en cours…'
                      : 'Analyser le document et générer les entraînements'}
                  </span>
                </button>
              </div>
            )}

            {/* Generated Plan Preview & Publish */}
            {plan && (
              <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)]/35 p-4 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono-code text-[11px] uppercase tracking-[0.07em] text-[var(--accent)]">
                      Matière détectée automatiquement ({Math.round(plan.confidence * 100)} %)
                    </p>
                    <h3 className="text-[16px] font-semibold text-[var(--text)] mt-0.5">
                      {plan.subject_name}{' '}
                      <span className="font-mono-code text-[12px] font-normal text-[var(--dim)] uppercase">
                        · {plan.doc_type}
                      </span>
                    </h3>
                  </div>

                  <select
                    aria-label="Corriger la matière détectée"
                    value={plan.subject_key}
                    onChange={(e) =>
                      handleOverrideSubject(e.target.value as SubjectDescriptor['key'])
                    }
                    className="min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[12.5px] font-medium text-[var(--text)]"
                  >
                    {SUBJECT_CATALOG.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[13.5px] text-[var(--dim)] m-0">{plan.reasoning}</p>
                <p className="text-[13.5px] font-medium text-[var(--text)] m-0">
                  {plan.action_summary}
                </p>

                {/* Interfaces badges */}
                {plan.interfaces_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {plan.interfaces_used.map((kind) => (
                      <span
                        key={kind}
                        className="rounded-full border border-[var(--accent)]/40 bg-[var(--surface)] px-2.5 py-0.5 font-mono-code text-[11.5px] font-medium text-[var(--accent)]"
                      >
                        {INTERFACE_LABELS[kind] || kind}
                      </span>
                    ))}
                  </div>
                )}

                {/* Planned modules list */}
                <ul className="m-0 p-0 list-none space-y-1.5">
                  {plan.modules.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[13px]"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                        <span className="font-medium text-[var(--text)] truncate">{m.title}</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono-code text-[11px] text-[var(--dim)]">
                        {m.operation === 'enrich' ? 'Amélioration' : 'Nouveau'} · {m.module_type}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={publishing || plan.modules.length === 0}
                    onClick={() => void handlePublishPlan()}
                    className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-[14px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      {publishing
                        ? 'Publication dans Supabase…'
                        : `Publier ces ${plan.modules.length} module(s) pour toute la promo`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlan(null);
                      setSelectedFile(null);
                    }}
                    className="min-h-[46px] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[13.5px] font-medium text-[var(--dim)] hover:text-[var(--text)]"
                  >
                    Annuler
                  </button>
                </div>
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
                <p className="font-medium m-0">{statusMsg.text}</p>
              </div>
            )}

            {/* Documents History */}
            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] m-0">
                  Documents pris en compte ({docs.length})
                </p>
                <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--dim)]">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>+ 17 cours Moodle pré-intégrés</span>
                </span>
              </div>

              {missingTable ? (
                <p className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-[13px] text-[var(--dim)] m-0">
                  La bibliothèque cloud (<code>coach_documents</code> & <code>coach_modules</code>)
                  s’activera automatiquement dès le push sur GitHub.
                </p>
              ) : docs.length === 0 ? (
                <p className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-[13px] text-[var(--dim)] m-0">
                  Aucun document supplémentaire ajouté pour l’instant. Dépose n’importe quel cours,
                  TD ou annale ci-dessus pour enrichir automatiquement la matière correspondante.
                </p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-2">
                  {docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                          <span className="font-semibold text-[var(--text)] truncate">
                            {doc.filename}
                          </span>
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono-code text-[11px] font-semibold text-[var(--accent)]">
                            {doc.subject_name}
                          </span>
                        </div>
                        {doc.action_summary && (
                          <p className="mt-1 text-[12.5px] text-[var(--dim)] m-0">
                            {doc.action_summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.storage_url && (
                          <a
                            href={doc.storage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] hover:text-[var(--accent)]"
                            title="Ouvrir le fichier source"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => void handleDeleteDoc(doc)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--bad)] hover:border-[var(--bad)] disabled:opacity-45"
                          title="Supprimer ce document et ses entraînements"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          /* ==================== TAB 2: APPEARANCE & BANNER ==================== */
          <div className="p-5 sm:p-6 pb-10 space-y-5">
            <div>
              <p className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2">
                Bannière d’accueil (promo ESET 3A)
              </p>

              <input
                ref={bannerFileRef}
                type="file"
                accept="image/*"
                onChange={handleUploadBannerFile}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={bannerBusy}
                  onClick={() => bannerFileRef.current?.click()}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer une image</span>
                </button>
                <button
                  type="button"
                  disabled={bannerBusy}
                  onClick={() => void handleSaveBannerUrl(null)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[13px] font-medium text-[var(--dim)] hover:text-[var(--text)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Bannière officielle par défaut</span>
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={bannerDraft}
                  onChange={(e) => setBannerDraft(e.target.value)}
                  placeholder="https://... (URL directe d'une bannière paysage)"
                  className="min-h-[42px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[13.5px] text-[var(--text)]"
                />
                <button
                  type="button"
                  disabled={bannerBusy || !bannerDraft.trim()}
                  onClick={() => void handleSaveBannerUrl(bannerDraft.trim())}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 text-[13px] font-semibold text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-45"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Appliquer</span>
                </button>
              </div>
            </div>

            {appearanceStatus && (
              <div
                role="status"
                className={`rounded-xl border p-3.5 text-[13.5px] ${
                  appearanceStatus.kind === 'success'
                    ? 'border-[var(--good)] bg-[var(--good-soft)] text-[var(--good)]'
                    : 'border-[var(--bad)] bg-[var(--bad-soft)] text-[var(--bad)]'
                }`}
              >
                <p className="font-medium m-0">{appearanceStatus.text}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
