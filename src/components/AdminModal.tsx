import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Image as ImageIcon, Lock, RotateCcw, Save, Upload, X } from 'lucide-react';
import { uploadMediaToSupabase, upsertAppSettingInSupabase } from '../lib/supabase';

const ADMIN_PIN = '3500';

interface AdminModalProps {
  open: boolean;
  bannerUrl: string | null;
  onClose: () => void;
  onAppearanceChanged: () => Promise<void> | void;
}

export function AdminModal({ open, bannerUrl, onClose, onAppearanceChanged }: AdminModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [bannerDraft, setBannerDraft] = useState(bannerUrl ?? '');
  const [bannerBusy, setBannerBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null
  );

  const bannerFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setBannerDraft(bannerUrl ?? '');
    setStatusMsg(null);
  }, [open, bannerUrl]);

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

  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBannerBusy(true);
    setStatusMsg(null);
    const uploaded = await uploadMediaToSupabase(file, 'banner');
    if (!uploaded.ok || !uploaded.publicUrl) {
      setBannerBusy(false);
      setStatusMsg({
        kind: 'error',
        text: uploaded.error || "Impossible d'envoyer la bannière.",
      });
      return;
    }
    const saved = await upsertAppSettingInSupabase('home_banner_url', uploaded.publicUrl);
    setBannerBusy(false);
    if (saved.ok) {
      setBannerDraft(uploaded.publicUrl);
      setStatusMsg({ kind: 'success', text: 'Bannière enregistrée pour toute la promo.' });
      await onAppearanceChanged();
    } else {
      setStatusMsg({ kind: 'error', text: saved.error || 'Échec sauvegarde bannière.' });
    }
  };

  const handleSaveBannerUrl = async (nextUrl: string | null) => {
    setBannerBusy(true);
    setStatusMsg(null);
    const saved = await upsertAppSettingInSupabase('home_banner_url', nextUrl);
    setBannerBusy(false);
    if (saved.ok) {
      setBannerDraft(nextUrl ?? '');
      setStatusMsg({
        kind: 'success',
        text: nextUrl
          ? 'Bannière mise à jour pour tous les étudiants.'
          : 'Bannière réinitialisée vers la bannière officielle ESET 3A.',
      });
      await onAppearanceChanged();
    } else {
      setStatusMsg({ kind: 'error', text: saved.error || 'Erreur mise à jour bannière.' });
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
        className="max-h-[92dvh] w-full sm:max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-[var(--accent)]" />
            <h2 id="admin-modal-title" className="text-[17px] font-semibold text-[var(--text)]">
              Espace Admin — Apparence & Catalogue
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

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="p-6 pb-8">
            <p className="text-[14.5px] text-[var(--dim)]">
              Entre le code PIN pour personnaliser la bannière d’accueil diffusée à toute la promo.
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
          <div className="p-5 sm:p-6 pb-8 space-y-5">
            <div>
              <p className="flex items-center gap-1.5 font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2">
                <ImageIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Bannière d’accueil (promo ESET 3A)</span>
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

            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3.5 text-[13px] text-[var(--dim)]">
              <p className="flex items-center gap-1.5 font-semibold text-[var(--text)] m-0 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Mise à jour des cours & exercices (mode 100 % statique)</span>
              </p>
              <p className="m-0">
                Les 8 matières ESET 3A sont intégrées dans <code>public/coach-data/</code> (aucun
                serveur Node, aucune clé API). Pour ajouter un nouveau cours, TD ou annale Moodle,
                génère les modules dans Antigravity puis pousse sur GitHub pour redéployer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
