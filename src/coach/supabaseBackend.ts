import { supabase } from '../lib/supabase';

const UID_KEY = 'coach-partiels-uid.v1';

export interface BoardRow {
  id: string;
  uid?: string;
  board?: string;
  n: string;
  best: number;
  avg: number;
  sims: number;
  weak?: string;
  wr?: number;
  ts?: number;
}

export interface ChatRow {
  id: string;
  channel?: string;
  u: string;
  n: string;
  t: string;
  ts: number;
}

export function getOrCreateStudentUid(): string {
  try {
    const existing = localStorage.getItem(UID_KEY);
    if (existing && existing.trim()) return existing.trim();
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
        : `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(UID_KEY, generated);
    return generated;
  } catch {
    return `u_${Date.now().toString(36)}`;
  }
}

export function isMissingTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

export async function fetchHomeBannerOverride(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'home_banner_url')
      .maybeSingle();
    if (error || !data) return null;
    const val = typeof data.value === 'string' ? data.value.trim() : '';
    return val || null;
  } catch {
    return null;
  }
}

export async function loadCloudProfile(uid: string): Promise<{
  ok: boolean;
  data: unknown | null;
  missingTable?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('coach_profiles')
      .select('data')
      .eq('uid', uid)
      .maybeSingle();
    if (error) {
      return { ok: false, data: null, missingTable: isMissingTableError(error) };
    }
    return { ok: true, data: data?.data ?? null };
  } catch {
    return { ok: false, data: null };
  }
}

export async function saveCloudProfile(
  uid: string,
  profileName: string,
  payload: unknown
): Promise<{ ok: boolean; missingTable?: boolean }> {
  try {
    const { error } = await supabase.from('coach_profiles').upsert(
      {
        uid,
        profile_name: profileName,
        data: payload,
      },
      { onConflict: 'uid' }
    );
    if (error) {
      return { ok: false, missingTable: isMissingTableError(error) };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function upsertBoardEntry(
  board: string,
  uid: string,
  entry: Omit<BoardRow, 'id' | 'board' | 'uid'>
): Promise<{ ok: boolean; code?: string; missingTable?: boolean }> {
  const id = `${board}:${uid}`;
  try {
    const { error } = await supabase.from('coach_board').upsert(
      {
        id,
        board,
        uid,
        n: entry.n,
        best: entry.best,
        avg: entry.avg,
        sims: entry.sims,
        weak: entry.weak || '',
        wr: entry.wr ?? 0,
        ts: entry.ts ?? Date.now(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      return { ok: false, code: error.code, missingTable: isMissingTableError(error) };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 'network' };
  }
}

export async function deleteBoardEntry(board: string, uid: string): Promise<void> {
  try {
    await supabase.from('coach_board').delete().eq('id', `${board}:${uid}`);
  } catch {
    // ignore offline delete error
  }
}

export function subscribeBoardEntries(
  board: string,
  onRows: (rows: BoardRow[]) => void,
  onError: (code: string) => void
): () => void {
  let active = true;

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_board')
        .select('id, uid, board, n, best, avg, sims, weak, wr, ts')
        .eq('board', board)
        .order('best', { ascending: false })
        .limit(100);
      if (!active) return;
      if (error) {
        onError(isMissingTableError(error) ? 'schema' : error.code || 'err');
        return;
      }
      const rows: BoardRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.uid || r.id),
        uid: String(r.uid || r.id),
        board: String(r.board || board),
        n: String(r.n || 'Anonyme'),
        best: Number(r.best) || 0,
        avg: Number(r.avg) || 0,
        sims: Number(r.sims) || 0,
        weak: typeof r.weak === 'string' ? r.weak : '',
        wr: Number(r.wr) || 0,
        ts: Number(r.ts) || 0,
      }));
      onRows(rows);
    } catch {
      if (active) onError('network');
    }
  };

  void load();

  const channel = supabase
    .channel(`coach-board-${board}-${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'coach_board', filter: `board=eq.${board}` },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export function subscribeChatMessages(
  channelName: string,
  limitCount: number,
  onRows: (rows: ChatRow[]) => void,
  onError: (code: string) => void
): () => void {
  let active = true;

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_chat')
        .select('id, channel, u, n, t, ts')
        .eq('channel', channelName)
        .order('ts', { ascending: false })
        .limit(limitCount);
      if (!active) return;
      if (error) {
        onError(isMissingTableError(error) ? 'schema' : error.code || 'load');
        return;
      }
      const rows: ChatRow[] = ((data ?? []) as Array<Record<string, unknown>>)
        .map((r) => ({
          id: String(r.id),
          channel: String(r.channel || channelName),
          u: String(r.u || ''),
          n: String(r.n || 'Anonyme'),
          t: String(r.t || ''),
          ts: Number(r.ts) || 0,
        }))
        .reverse();
      onRows(rows);
    } catch {
      if (active) onError('load');
    }
  };

  void load();

  const channel = supabase
    .channel(`coach-chat-${channelName}-${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'coach_chat', filter: `channel=eq.${channelName}` },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function postChatMessage(
  channelName: string,
  row: { id: string; u: string; n: string; t: string; ts: number }
): Promise<{ ok: boolean; missingTable?: boolean }> {
  try {
    const { error } = await supabase.from('coach_chat').insert({
      id: row.id,
      channel: channelName,
      u: row.u,
      n: row.n,
      t: row.t,
      ts: row.ts,
    });
    if (error) {
      return { ok: false, missingTable: isMissingTableError(error) };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function downloadPdfFile(url: string, filename: string): Promise<boolean> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return false;
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * Dynamic Document Ingestion & Generated Modules (coach_documents / coach_modules)
 * ============================================================================ */

export interface CoachDocumentRow {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  storage_url: string | null;
  subject_key: string;
  subject_name: string;
  doc_type: string;
  detected_topics: string[];
  action_summary: string;
  reasoning: string;
  created_at: string;
}

export interface CoachModuleRow {
  id: string;
  document_id: string | null;
  subject_key: string;
  module_type: 'ds' | 'theme' | 'annale' | 'quiz' | 'memo' | 'pdf_annale';
  target_id: string | null;
  operation: 'create' | 'enrich';
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  created_at?: string;
}

export async function uploadDocumentFile(
  file: File
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const base = file.name
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 48);
    const storagePath = `docs/${Date.now()}-${base}.${ext}`;
    const { error } = await supabase.storage.from('app-media').upload(storagePath, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from('app-media').getPublicUrl(storagePath);
    return { ok: true, publicUrl: data.publicUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur upload Storage' };
  }
}

export async function fetchCoachDocuments(): Promise<{
  rows: CoachDocumentRow[];
  missingTable?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('coach_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      return { rows: [], missingTable: isMissingTableError(error) };
    }
    const rows: CoachDocumentRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      filename: String(r.filename || ''),
      mime_type: String(r.mime_type || ''),
      file_size: Number(r.file_size) || 0,
      storage_url: typeof r.storage_url === 'string' ? r.storage_url : null,
      subject_key: String(r.subject_key || 'c'),
      subject_name: String(r.subject_name || ''),
      doc_type: String(r.doc_type || 'cours'),
      detected_topics: Array.isArray(r.detected_topics) ? r.detected_topics.map(String) : [],
      action_summary: String(r.action_summary || ''),
      reasoning: String(r.reasoning || ''),
      created_at: String(r.created_at || ''),
    }));
    return { rows };
  } catch {
    return { rows: [] };
  }
}

export async function fetchCoachModules(): Promise<{
  rows: CoachModuleRow[];
  missingTable?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('coach_modules')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(400);
    if (error) {
      return { rows: [], missingTable: isMissingTableError(error) };
    }
    const rows: CoachModuleRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      document_id: typeof r.document_id === 'string' ? r.document_id : null,
      subject_key: String(r.subject_key || 'c'),
      module_type: (r.module_type as CoachModuleRow['module_type']) || 'theme',
      target_id: typeof r.target_id === 'string' ? r.target_id : null,
      operation: r.operation === 'enrich' ? 'enrich' : 'create',
      title: String(r.title || ''),
      payload: r.payload,
      created_at: String(r.created_at || ''),
    }));
    return { rows };
  } catch {
    return { rows: [] };
  }
}

export function subscribeCoachModules(onChanged: () => void): () => void {
  const channel = supabase
    .channel(`coach-modules-${Math.random().toString(36).slice(2, 7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_modules' }, () => {
      onChanged();
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function saveCoachDocumentAndModules(
  doc: Omit<CoachDocumentRow, 'id' | 'created_at'>,
  modules: Array<Omit<CoachModuleRow, 'document_id' | 'created_at'>>
): Promise<{ ok: boolean; documentId?: string; error?: string; missingTable?: boolean }> {
  try {
    const { data: docData, error: docErr } = await supabase
      .from('coach_documents')
      .insert({
        filename: doc.filename,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        storage_url: doc.storage_url,
        subject_key: doc.subject_key,
        subject_name: doc.subject_name,
        doc_type: doc.doc_type,
        detected_topics: doc.detected_topics,
        action_summary: doc.action_summary,
        reasoning: doc.reasoning,
      })
      .select('id')
      .single();

    if (docErr || !docData) {
      return {
        ok: false,
        error: docErr?.message || "Impossible d'enregistrer le document dans Supabase.",
        missingTable: isMissingTableError(docErr),
      };
    }

    const documentId = String(docData.id);
    if (modules.length > 0) {
      const rowsToInsert = modules.map((m) => ({
        id: m.id,
        document_id: documentId,
        subject_key: m.subject_key,
        module_type: m.module_type,
        target_id: m.target_id,
        operation: m.operation,
        title: m.title,
        payload: m.payload,
      }));
      const { error: modErr } = await supabase
        .from('coach_modules')
        .upsert(rowsToInsert, { onConflict: 'id' });
      if (modErr) {
        return { ok: false, documentId, error: modErr.message };
      }
    }
    return { ok: true, documentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau Supabase' };
  }
}

export async function deleteCoachDocument(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('coach_documents').delete().eq('id', documentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur suppression' };
  }
}
