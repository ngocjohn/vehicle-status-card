/**
 * TireTemplateConfig Interface
 */

import { MediaSelectorValue } from '../../../ha/data/media_source';

export interface TireCardLayout {
  title?: string;
  background?: string | MediaSelectorValue;
  background_entity?: string;
  horizontal?: boolean;
  image_size?: number;
  value_size?: number;
  top?: number;
  left?: number;
  hide_rotation_button?: boolean;
}
export interface TireEntityConfig {
  entity?: string;
  attribute?: string;
  name?: string;
  color?: string;
}

export interface TireTemplateEntities {
  front_left?: TireEntityConfig;
  front_right?: TireEntityConfig;
  rear_left?: TireEntityConfig;
  rear_right?: TireEntityConfig;
}

export interface TireTemplateConfig extends TireCardLayout, TireTemplateEntities {}

export const TireLayoutKeys = [
  'title',
  'horizontal',
  'image_size',
  'value_size',
  'top',
  'left',
  'hide_rotation_button',
] as const;

export const TireBackgroundKeys = ['background', 'background_entity'] as const;

export const TireItems = ['front_left', 'front_right', 'rear_left', 'rear_right'] as const;
