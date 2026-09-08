import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'kk_theme';
const MODES = ['light', 'dark', 'system'];

function systemPrefersDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Owns the colour scheme.
 *
 * `mode` is what the user chose (light / dark / system); `theme` is what is
 * actually painted. The matching inline script in index.html applies the same
 * logic before first paint, so there is no flash of the wrong theme on load.
 */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow the OS setting while the user is on "system".
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    // Keeps the mobile browser chrome in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#141419' : '#f5f5f7');
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage unavailable — the choice just will not persist */
    }
  }, [mode]);

  /** Cycles light → dark → system, which is what the navbar button does. */
  const cycleMode = useCallback(() => {
    setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length]);
  }, []);

  const value = useMemo(
    () => ({ mode, theme, setMode, cycleMode, isDark: theme === 'dark' }),
    [mode, theme, cycleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
