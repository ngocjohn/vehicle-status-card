export interface ThemeSettings {
  theme: string;
  // Radio box selection for theme picker. Do not use in Lovelace rendering as
  // it can be undefined == auto.
  // Property hass.themes.darkMode carries effective current mode.
  dark?: boolean;
  primaryColor?: string;
  accentColor?: string;
}

interface ThemeVars {
  // Incomplete
  'primary-color': string;
  'text-primary-color': string;
  'accent-color': string;
  [key: string]: string;
}

type Theme = ThemeVars & {
  modes?: {
    light?: ThemeVars;
    dark?: ThemeVars;
  };
};

export interface Themes {
  default_theme: string;
  default_dark_theme: string | null;
  themes: Record<string, Theme>;
  // Currently effective dark mode. Will never be undefined. If user selected "auto"
  // in theme picker, this property will still contain either true or false based on
  // what has been determined via system preferences and support from the selected theme.
  darkMode: boolean;
  // Currently globally active theme name
  theme: string;
}
