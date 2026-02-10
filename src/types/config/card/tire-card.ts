/**
 * TireTemplateConfig Interface
 */

import type { MediaSelectorValue } from '../../../ha/data/media_source';
import type { LovelaceElementConfig } from '../../../ha/panels/lovelace/elements/types';

type CustomPosition = {
  top?: string;
  left?: string;
};

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
  aspect_ratio?: string;
}
export interface TireAdditionalEntityConfig {
  entity: string;
  state_content?: string[];
  prefix?: string;
  suffix?: string;
}

export interface TireEntityConfig {
  entity?: string;
  attribute?: string;
  name?: string;
  color?: string;
  use_custom_position?: boolean;
  position?: CustomPosition;
  additional_entities?: TireAdditionalEntityConfig[];
}

export interface TireTemplateEntities {
  front_left?: TireEntityConfig;
  front_right?: TireEntityConfig;
  rear_left?: TireEntityConfig;
  rear_right?: TireEntityConfig;
}

export interface TireTemplateConfig extends TireCardLayout, TireTemplateEntities {
  elements?: LovelaceElementConfig[];
}

export const TireLayoutKeys = [
  'title',
  'horizontal',
  'image_size',
  'value_size',
  'top',
  'left',
  'hide_rotation_button',
  'aspect_ratio',
] as const;

export const TireBackgroundKeys = ['background', 'background_entity'] as const;

export const TireItemsKeys = ['front_left', 'front_right', 'rear_left', 'rear_right'] as const;
export type TireItem = (typeof TireItemsKeys)[number];

export type TireItemsConfig = Pick<TireTemplateConfig, TireItem>;
