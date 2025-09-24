/**
 * @file config-area.ts
 * @description Configuration area for sections in card components.
 */

export enum ConfigArea {
  DEFAULT = 'default',
  INDICATORS = 'indicators',
  RANGE_INFO = 'range_info',
  IMAGES = 'images',
  MINI_MAP = 'mini_map',
  BUTTONS = 'buttons',
  LAYOUT_CONFIG = 'layout_config',
}

/**
 * Button Area Sections
 * This enum defines the different sections available in the button card configuration area.
 */
export enum ButtonArea {
  BASE = 'base',
  SUB_DEFAULT = 'default_card',
  SUB_CUSTOM = 'custom_card',
  SUB_TIRE = 'tire_card',
  MAIN = 'main',
}
