import { useEffect, useState } from 'react';
import { getThemeChoice, setThemeChoice, resolveTheme } from '../services/theme';
import { SunIcon, MoonIcon } from './icons';
import './ThemeToggle.css';

// Keeps a component in step with the theme service (choice + applied theme).
function useTheme() {
  const [state, setState] = useState(() => {
    const choice = getThemeChoice();
    return { choice, theme: resolveTheme(choice) };
  });
  useEffect(() => {
    const onChange = (e) => setState(e.detail);
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);
  return state;
}

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Account Settings card: pick System / Light / Dark.
export function AppearanceSettings() {
  const { choice } = useTheme();

  return (
    <section className="theme-toggle-card">
      <div className="theme-toggle-text">
        <p className="theme-toggle-title">Appearance</p>
        <p className="theme-toggle-note">Choose light, dark, or follow your device.</p>
      </div>
      <div className="theme-toggle-options" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            className={`theme-toggle-option ${choice === option.value ? 'theme-toggle-option-selected' : ''}`}
            onClick={() => setThemeChoice(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// Top-bar shortcut: flips between light and dark in one tap.
export function ThemeQuickToggle() {
  const { theme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle-quick"
      onClick={() => setThemeChoice(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
    </button>
  );
}
