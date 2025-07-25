import { ActionsSharedConfig } from '../actions-config';
/**
 * Configuration interface for the Range Info section of the Vehicle Status Card.
 */
export interface RangeInfoConfig extends RangeInfoLayoutConfig, ChargingConfig {
  energy_level: RangeItemConfig;
  range_level?: RangeItemConfig;
}

export type RangeValuePosition = 'outside' | 'inside' | 'off';
export type RangeValueAlignment = 'start' | 'end';
export type Threshold = { value: number; color: string };

export type RangeItemConfig = ActionsSharedConfig & {
  attribute?: string;
  entity?: string;
  icon?: string;
  max_value?: number;
  value_position?: RangeValuePosition;
  value_alignment?: RangeValueAlignment;
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
  charge_target_entity: string;
  charge_target_color: string;
  charge_target_visibility: string;
  charge_target_tooltip: boolean;
}>;
