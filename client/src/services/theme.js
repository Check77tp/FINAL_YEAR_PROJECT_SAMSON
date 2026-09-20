// Light / dark / follow-the-device theme.
//
// The user's CHOICE ('system' | 'light' | 'dark') is stored in localStorage.
// The APPLIED theme is always 'light' or 'dark', written to
// <html data-theme="..."> where styles/theme.css picks it up. index.html runs
// the same resolution before first paint so there is no white flash.
const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLOR = { light: '#2e7d32', dark: '#0f140e' };

export function getThemeChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // storage unavailable - fall through to the default
  }
  return 'system';
}

export function resolveTheme(choice) {
  if (choice === 'system') {
    return window.matchMedia && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }
  return choice;
}

function apply(choice) {
  const theme = resolveTheme(choice);
  document.documentElement.setAttribute('data-theme', theme);
  // Colours the phone's browser bar / PWA title bar.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { choice, theme } }));
}

export function setThemeChoice(choice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore - the choice still applies for this session
  }
  apply(choice);
}

// Call once at startup: applies the saved choice and, for 'system', follows
// the device if the user switches their OS between light and dark.
export function initTheme() {
  apply(getThemeChoice());
  if (window.matchMedia) {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (getThemeChoice() === 'system') apply('system');
    });
  }
}
