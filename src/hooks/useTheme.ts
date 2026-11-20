import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'auto';

const THEME_KEY = 'coach_partiels_theme_v1';

function getInitialTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Ignore storage access issues
  }
  return 'auto';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getInitialTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = preference === 'dark' || (preference === 'auto' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#0d1117' : '#2e7d6b');
      }
    };

    apply();
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Ignore
    }

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  return { preference, setPreference };
}
