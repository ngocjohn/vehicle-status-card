import tinycolor from 'tinycolor2';

import { Threshold } from '../types';

/**
 * Generates a color based on the given thresholds and current level.
 * @param {Threshold[]} thresholds - Array of thresholds with value and color.
 * @param {number} [currentLevel] - The current level to determine the color.
 * @returns {string} - The color as a hex string.
 */

export const generateGradient = (thresholds: Threshold[], currentLevel?: number): string => {
  if (!thresholds || thresholds.length === 0) {
    return '';
  }
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const maxThreshold = sorted[sorted.length - 1]?.value ?? 100;
  const level = Math.min(currentLevel || maxThreshold, maxThreshold);

  const stops: string[] = [];

  let lastColor = sorted[0]?.color ?? 'gray';

  for (let i = 0; i < sorted.length; i++) {
    const { value, color } = sorted[i];
    const normalized = (value / maxThreshold) * 100;

    if (value <= level) {
      stops.push(`${color} ${normalized}%`);
      lastColor = color;
    } else {
      break;
    }
  }

  // Normalize current level and conditionally add it
  const normalizedLevel = (level / maxThreshold) * 100;
  const lastStop = stops[stops.length - 1];
  if (!lastStop?.endsWith(`${normalizedLevel}%`)) {
    stops.push(`${lastColor} ${normalizedLevel}%`);
  }
  const gradient = `linear-gradient(to right, ${stops.join(', ')})`;
  return gradient;
};

/**
 * Generates a linear gradient with solid color blocks up to the given level.
 * @param {Threshold[]} thresholds - Array of thresholds with value and color.
 * @param {number} [currentLevel] - Current level to determine where to stop.
 * @returns {string} - The linear gradient CSS string.
 */

export const generateColorBlocks = (thresholds: Threshold[], currentLevel?: number): string => {
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  if (sorted.length === 0) return '';

  const max = sorted[sorted.length - 1].value;
  const level = Math.min(currentLevel ?? max, max);
  const levelPercent = (level / max) * 100;

  const stops: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const from = (current.value / max) * 100;
    const to = (next.value / max) * 100;

    if (levelPercent <= from) break;

    const end = Math.min(to, levelPercent);
    stops.push(`${current.color} ${from}%`, `${current.color} ${end}%`);

    if (levelPercent <= to) break;
  }

  // Handle last threshold if level is beyond last
  const last = sorted[sorted.length - 1];
  const lastStart = (last.value / max) * 100;

  if (levelPercent > lastStart) {
    stops.push(`${last.color} ${lastStart}%`, `${last.color} ${levelPercent}%`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
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
  const palette: Threshold[] = Array.from({ length: steps + 1 }, (_, i) => ({
    value: Math.round(i * stepSize),
    color: getColor(baseColor, i),
  }));

  return palette;
};
