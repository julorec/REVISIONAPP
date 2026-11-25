import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminDocumentsModal } from './components/AdminDocumentsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { mountCoachApp, type CoachController } from './coach/coachRuntime';
import { fetchAppSettings } from './lib/supabase';
import type { AppSettings } from './types/quiz';

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<CoachController | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ home_banner_url: null });

  const loadSettings = useCallback(async () => {
    const settingsRes = await fetchAppSettings();
    setSettings(settingsRes.settings);
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ctrl = mountCoachApp({
      root: el,
      onOpenAdmin: () => {
        void loadSettings();
        setAdminOpen(true);
      },
    });
    ctrlRef.current = ctrl;
    return () => {
      ctrl.destroy();
      ctrlRef.current = null;
    };
  }, [loadSettings]);

  return (
    <>
      <OfflineIndicator />
      <div ref={hostRef} />
      <AdminDocumentsModal
        open={adminOpen}
        bannerUrl={settings.home_banner_url}
        getCatalogContext={() =>
          ctrlRef.current?.getCatalogContext() ?? { dsBySubject: {}, memoBySubject: {} }
        }
        onClose={() => setAdminOpen(false)}
        onModulesChanged={async () => {
          await ctrlRef.current?.refreshModules();
        }}
        onAppearanceChanged={async () => {
          await loadSettings();
          await ctrlRef.current?.refreshBanner();
        }}
      />
    </>
  );
}
