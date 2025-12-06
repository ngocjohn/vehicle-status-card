import { ActionConfig } from '../../../ha';

/**
 * Configuration interface for the Range Info section of the Vehicle Status Card.
 */
export interface RangeInfoConfig extends RangeInfoLayoutConfig, ChargingConfig, ChargeTargetConfig {
  energy_level: RangeItemConfig;
  range_level?: RangeItemConfig;
}

export type RangeValuePosition = 'outside' | 'inside' | 'off';
export type RangeValueAlignment = 'start' | 'end';
export type Threshold = { value: number; color: string };

export type RangeItemConfig = {
  entity?: string;
  attribute?: string;
  icon?: string;
  max_value?: number;
  value_position?: RangeValuePosition;
  value_alignment?: RangeValueAlignment;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  hide_icon?: boolean;
};

export type RangeInfoLayoutConfig = Partial<{
  progress_color: string;
  color_template: string;
  bar_background: string;
  color_blocks: boolean;
  color_thresholds: Threshold[];
  bar_height: number;
  bar_width: number;
  bar_radius: number;
}>;

export type ChargingConfig = Partial<{
  charging_entity: string;
  charging_template: string;
}>;

export type ChargeTargetConfig = Partial<{
  charge_target_entity: string;
  charge_target_color: string;
  charge_target_visibility: string;
  charge_target_tooltip: boolean;
}>;

export const RANGE_INFO_TEMPLATE_KEYS = ['color_template', 'charging_template', 'charge_target_visibility'] as const;

export type RangeInfoTemplateKey = (typeof RANGE_INFO_TEMPLATE_KEYS)[number];

export const RANGE_LAYOUT_KEYS = [
  'progress_color',
  'color_template',
  'bar_background',
  'color_blocks',
  'color_thresholds',
  'bar_height',
  'bar_width',
  'bar_radius',
] as const;
