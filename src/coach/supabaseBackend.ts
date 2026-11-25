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
