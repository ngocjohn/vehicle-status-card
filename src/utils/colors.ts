import tinycolor from 'tinycolor2';

import { Threshold } from '../types';

/**
 * Generates a color based on the given thresholds and current level.
 * @param {Threshold[]} thresholds - Array of thresholds with value and color.
 * @param {number} [currentLevel] - The current level to determine the color.
 * @param {number} [maxValue] - The maximum value to normalize the color.
 * @returns {string} - The color as a hex string.
 */

export const generateGradient = (thresholds: Threshold[], currentLevel: number = 0, maxValue: number = 100): string => {
  if (!thresholds || thresholds.length === 0) return '';

  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const level = Math.min(currentLevel, maxValue);
  if (level === 0) return '';

  const stops: string[] = [];
  let lastColor = sorted[0]?.color ?? 'gray';

  for (const { value, color } of sorted) {
    if (value > level) break;

    const normalized = (value / level) * 100;
    stops.push(`${color} ${normalized}%`);
    lastColor = color;
  }

  const normalizedLevel = 100;
  const lastStop = stops[stops.length - 1];
  if (!lastStop?.endsWith(`${normalizedLevel}%`)) {
    stops.push(`${lastColor} ${normalizedLevel}%`);
  }

  return `${stops.join(', ')}`;
};

/**
 * Generates a linear gradient with solid color blocks up to the given level.
 * @param {Threshold[]} thresholds - Array of thresholds with value and color.
 * @param {number} [currentLevel] - Current level to determine where to stop.
 * @param {number} [maxValue] - Maximum value to normalize the gradient.
 * @returns {string} - The linear gradient CSS string.
 */

export const generateColorBlocks = (
  thresholds: Threshold[],
  currentLevel: number = 0,
  maxValue: number = 100
): string => {
  if (!thresholds || thresholds.length < 2) return '';

  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const cappedLevel = Math.min(currentLevel, maxValue);

  const stops: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.value > cappedLevel) break;

    const fromNorm = (current.value / cappedLevel) * 100;
    const toNorm = (Math.min(next.value, cappedLevel) / cappedLevel) * 100;

    stops.push(`${current.color} ${fromNorm}%`, `${current.color} ${toNorm}%`);

    if (next.value >= cappedLevel) break;
  }

  // Optional: extend last color to 100% if not at exact level
  let lastThreshold: Threshold | undefined;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].value <= cappedLevel) {
      lastThreshold = sorted[i];
      break;
    }
  }
  if (lastThreshold && lastThreshold.value < cappedLevel) {
    const start = (lastThreshold.value / cappedLevel) * 100;
    stops.push(`${lastThreshold.color} ${start}%`, `${lastThreshold.color} 100%`);
  }
  return `${stops.join(', ')}`;
  // return `linear-gradient(to right, ${stops.join(', ')})`;
};

export const getMaxThreshold = (thresholds: Threshold[]): number => {
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const lastValue = sorted[sorted.length - 1].value;
  return lastValue;
};

export const getNormalizedValue = (thresholds: Threshold[], value: number, maxDefault: number | undefined): number => {
  if (!thresholds || (thresholds.length === 0 && maxDefault === undefined)) {
    return value > 100 ? 100 : value;
  }
  const maxThreshold = maxDefault ?? getMaxThreshold(thresholds);
  if (maxThreshold >= 100) {
    return (value / maxThreshold) * 100;
  } else if (value > maxThreshold) {
    return 100;
  }
  return (value / maxThreshold) * 100;
};

/**
 * Convert color to RGB format.
 * @param {string} color - The color to convert.
 * @returns [number, number, number] - The RGB values as an array.
 */

export const colorToRgb = (color: string): [number, number, number] => {
  const rgb = tinycolor(color);
  if (!rgb.isValid()) {
    return [0, 0, 0]; // Default to black if color is invalid
  }
  const { r, g, b } = rgb.toRgb();
  return [r, g, b];
};

/**
 * Creates a random color palette based on a base color and maximum value.
 * @param {string} baseColor - The base color to generate the palette from.
 * @param {number} maxValue - The maximum value for the palette.
 * @returns {Threshold[]} - An array of thresholds with value and color.
 */
export const createRandomPallete = (baseColor: string, maxValue: number): Threshold[] => {
  const steps = 5;
  const stepSize = maxValue / steps;

  const getColor = (color: string, i: number): string => {
    const tc = tinycolor(color);
    const isDark = tc.isDark();
    const maxAdjustment = 40; // Maximum adjustment for lightening/darkening

    const intesity = (i / steps) * maxAdjustment;

    return isDark ? tc.lighten(intesity).toHexString() : tc.darken(intesity).toHexString();
  };
  const palette: Threshold[] = Array.from({ length: steps }, (_, i) => ({
    value: Math.round(i * stepSize),
    color: getColor(baseColor, i),
  }));

  return palette;
};

/**
 * Get color for current level based on thresholds.
 * @param {Threshold[]} thresholds - Array of thresholds with value and color.
 * @param {number} currentLevel - The current level to determine the color.
 * @param {number} maxValue - The maximum value to normalize the color.
 * @returns {string} - The color as a hex string.
 */
export const getColorForLevel = (thresholds: Threshold[], currentLevel: number = 0, maxValue: number = 100): string => {
  if (!thresholds || thresholds.length === 0) return '';
  const offset = 3; // Offset to avoid very low levels
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const level = Math.min(currentLevel - offset, maxValue);

  if (level < 3) return '';

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].value <= level) {
      return sorted[i].color;
    }
  }
  return sorted[0].color; // Return first color if level is below all thresholds
};

/**
 * Get most readable color based on background color.
 * @param {string} backgroundColor - The background color to check against.
 * @returns {string} - The most readable color (black or white).
 * */

export const getMostReadableColor = (backgroundColor: string): string => {
  const allColors: string[] = [];
  for (let i in tinycolor.names) {
    allColors.push(tinycolor.names[i]);
  }
  const colors = ['#212121', '#e1e1e1']; // Default colors for readability
  const readableColor = tinycolor.mostReadable(backgroundColor, colors);
  return readableColor.isValid() ? readableColor.toHexString() : 'var(--primary-text-color)'; // Default to black if invalid
};

export const getRandomHexColor = (): string => {
  return tinycolor.random().toHexString();
};

export const isDarkColor = (color: string): boolean => {
  const colorObj = tinycolor(color);
  // console.log('colorObj', colorObj);
  return colorObj.isLight();
};
