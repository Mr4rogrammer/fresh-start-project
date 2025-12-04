import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Utility functions for theme color management
const hexToHSL = (hex: string) => {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

const applyThemeColor = (variable: string, color: string) => {
  const hsl = hexToHSL(color);
  document.documentElement.style.setProperty(`--${variable}`, hsl);
  
  if (variable === 'primary') {
    const [h, s, l] = hsl.split(' ');
    const glowL = parseInt(l) + 5;
    document.documentElement.style.setProperty(`--primary-glow`, `${h} ${s} ${glowL}%`);
  }
};

const loadThemeColors = () => {
  const savedPrimary = localStorage.getItem('theme-primary');
  const savedSecondary = localStorage.getItem('theme-secondary');
  
  if (savedPrimary) {
    applyThemeColor('primary', savedPrimary);
  }
  if (savedSecondary) {
    applyThemeColor('accent', savedSecondary);
  }
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "mr-journal-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Load custom theme colors on mount
  useEffect(() => {
    loadThemeColors();
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

// Export utility functions for use in other components
export { hexToHSL, applyThemeColor, loadThemeColors };
