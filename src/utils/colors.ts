import { Threshold } from '../types';

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

export const generateColorBlocks = (thresholds: Threshold[]): string => {
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const max = sorted[sorted.length - 1]?.value ?? 100;

  const stops: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = (sorted[i].value / max) * 100;
    const to = (sorted[i + 1].value / max) * 100;
    const color = sorted[i].color;

    stops.push(`${color} ${from}%`, `${color} ${to}%`);
  }

  // Last segment to 100%
  const last = sorted[sorted.length - 1];
  const lastFrom = (last.value / max) * 100;
  stops.push(`${last.color} ${lastFrom}%`, `${last.color} 100%`);

  return `linear-gradient(to right, ${stops.join(', ')})`;
};
