/**
 * @file section.ts
 * @description Defines the structure for section configurations in the Vehicle Status Card.
 */

export enum Section {
  INDICATORS = 'indicators',
  RANGE_INFO = 'range_info',
  IMAGES = 'images',
  MINI_MAP = 'mini_map',
  BUTTONS = 'buttons',
  MAIN = 'main',
}

export const SectionOrder = {
  HEADER_INFO: 'header_info',
  IMAGES: 'images',
  MINI_MAP: 'mini_map',
  BUTTONS: 'buttons',
} as const;

export type SectionOrder = (typeof SectionOrder)[keyof typeof SectionOrder];
