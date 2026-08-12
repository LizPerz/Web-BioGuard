import { useState, type ReactNode } from 'react';
import { applyTheme, getStoredTheme, type Theme } from './theme';
import { ThemeContext } from './theme-context';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const handleToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: handleToggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
