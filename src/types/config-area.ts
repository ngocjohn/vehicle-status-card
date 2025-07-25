/**
 * @file config-area.ts
 * @description Configuration area for sections in card components.
 */

// export const enum ConfigArea {
//   GENERAL = 'general',
//   BUTTON_CARD = 'button_card',
//   INDICATORS = 'indicators',
//   RANGE = 'range',
//   IMAGES = 'images',
//   MINI_MAP = 'mini_map',
//   LAYOUT_CONFIG = 'layout_config',
// }

export const CONFIG_AREAS = {
  GENERAL: 'general',
  BUTTON_CARD: 'button_card',
  INDICATORS: 'indicators',
  RANGE: 'range',
  IMAGES: 'images',
  MINI_MAP: 'mini_map',
  LAYOUT_CONFIG: 'layout_config',
} as const;

export type ConfigArea = (typeof CONFIG_AREAS)[keyof typeof CONFIG_AREAS];
