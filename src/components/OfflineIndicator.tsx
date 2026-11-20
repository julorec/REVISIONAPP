import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[var(--line)] bg-[var(--warm-soft)] px-4 py-2 text-center text-xs font-medium text-[var(--warm)]"
    >
      <span className="inline-flex items-center gap-1.5">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        Mode hors-ligne actif — les quiz en cache restent disponibles.
      </span>
    </div>
  );
}
