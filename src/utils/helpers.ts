import tinycolor from 'tinycolor2';

import { HistoryStates } from '../types';
import { MiniMapConfig } from '../types/config';

export function isEmpty(input: any): boolean {
  if (Array.isArray(input)) {
    // Check if array is empty
    return input.length === 0;
  } else if (input && typeof input === 'object') {
    // Check if object is empty
    return Object.keys(input).length === 0;
  } else {
    // For other types (null, undefined, etc.), treat as not empty
    return true;
  }
}

export const isDarkColor = (color: string): boolean => {
  const colorObj = tinycolor(color);
  // console.log('colorObj', colorObj);
  return colorObj.isLight();
};

const isTemplateRegex = /{%|{{/;

export const isTemplate = (value: string): boolean => isTemplateRegex.test(value);

export const hasTemplate = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (typeof value === 'string') {
    return isTemplate(value);
  }
  if (typeof value === 'object') {
    const values = Array.isArray(value) ? value : Object.values(value!);
    return values.some((val) => val && hasTemplate(val));
  }
  return false;
};

export const strStartsWith = (value: string, search: string) => value.substring(0, search.length) === search;

const formatTimestamp = (ts: number): string => {
  const date = new Date(ts * 1000);
  return date.toLocaleString();
};

export const _getHistoryPoints = async (config: MiniMapConfig, history?: HistoryStates): Promise<any | undefined> => {
  if (!history || !(config.hours_to_show ?? 0)) {
    return undefined;
  }
  console.log('history', history);
  const paths = {};

  // Get the history for the device
  const entityStates = history[config.device_tracker];
  if (!entityStates) {
    return undefined;
  }

  // Filter out locations without coordinates
  const locations = entityStates.filter((loc) => loc.a.latitude && loc.a.longitude);
  if (locations.length < 2) {
    return undefined;
  }

  // const apiKey = config.maptiler_api_key!;

  // Create source data for LineString and Point features
  const totalPoints = locations.length;
  const lineSegments: any[] = [];
  const pointFeatures: any[] = [];

  for (let i = 0; i < totalPoints - 1; i++) {
    const start = locations[i];
    const end = locations[i + 1];

    const gradualOpacity = 0.8;
    let opacityStep: number;
    let baseOpacity: number;

    opacityStep = gradualOpacity / (totalPoints - 2);
    baseOpacity = 1 - gradualOpacity;

    // Calculate opacity (higher at start, lower towards the end)
    const opacity = baseOpacity + i * opacityStep;

    lineSegments.push({
      type: 'Feature',
      id: `line-${i}`,
      geometry: {
        type: 'LineString',
        coordinates: [
          [start.a.longitude, start.a.latitude],
          [end.a.longitude, end.a.latitude],
        ],
      },
      properties: {
        line_id: `line-${i}`,
        order_id: i,
        opacity: opacity, // Keep 2 decimal places for smoother transition
      },
    });

    // Create description for the Point

    const description = `<b>${start.a.friendly_name}</b><i>${formatTimestamp(start.lu)}</i>`;

    // Create Point features for each segment
    pointFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [start.a.longitude, start.a.latitude],
      },
      properties: {
        friendly_name: start.a.friendly_name,
        last_updated: start.lu,
        description: description,
        opacity: opacity,
      },
    });
  }

  const pointSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: pointFeatures,
    },
  };

  const routeSource = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection', // Instead of a single LineString, we now have multiple segments
      features: lineSegments,
    },
  };

  paths['route'] = routeSource;
  paths['points'] = pointSource;
  console.log('paths', paths);
  return paths;
};

export const getInitials = (name: string): string => {
  if (!name) return ''; // Handle empty or undefined names

  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};
