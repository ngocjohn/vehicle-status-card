interface Themes {
  default_theme: string;
  default_dark_theme?: string | null;
  themes: Record<string, any>;
  // Currently effective dark mode. Will never be undefined. If user selected "auto"
  // in theme picker, this property will still contain either true or false based on
  // what has been determined via system preferences and support from the selected theme.
  darkMode?: boolean;
  // Currently globally active theme name
  theme?: string;
}

export const applyThemesOnElement = (element: any, themes: Themes, localTheme: string, updateMeta = false) => {
  if (!element._themes) {
    element._themes = {};
  }
  let themeName = themes.default_theme;
  if (localTheme === 'default' || (localTheme && themes.themes[localTheme])) {
    themeName = localTheme;
  }
  const styles = { ...element._themes };
  if (themeName !== 'default') {
    const theme = themes.themes[themeName];
    Object.keys(theme).forEach((key) => {
      const prefixedKey = '--' + key;
      element._themes[prefixedKey] = '';
      styles[prefixedKey] = theme[key];
    });
  }

  // Set and/or reset styles
  if (window.ShadyCSS) {
    // Use ShadyCSS if available
    window.ShadyCSS.styleSubtree(/** @type {!HTMLElement} */ element, styles);
  } else {
    for (const s in styles) {
      if (s === null) {
        element.style.removeProperty(s);
      } else {
        element.style.setProperty(s, styles[s]);
      }
    }
  }

  if (!updateMeta) {
    return;
  }

  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) {
    if (!meta.hasAttribute('default-content')) {
      meta.setAttribute('default-content', meta.getAttribute('content')!);
    }
    const themeColor = styles['--primary-color'] || meta.getAttribute('default-content');
    meta.setAttribute('content', themeColor);
  }
};

declare global {
  interface Window {
    // Custom panel entry point url
    customPanelJS: string;
    ShadyCSS: {
      nativeCss: boolean;
      nativeShadow: boolean;
      prepareTemplate(templateElement, elementName, elementExtension);
      styleElement(element);
      styleSubtree(element, overrideProperties);
      styleDocument(overrideProperties);
      getComputedStyleValue(element, propertyName);
    };
  }
}
