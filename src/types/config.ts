// Cutom card helpers:
import { ActionConfig, EntityConfig } from 'custom-card-helpers';
import { MapEntityConfig } from 'extra-map-card/dist/types/config';

import { LovelaceCardConfig } from './ha-frontend/lovelace/lovelace';

/* ----------------------- INDICATOR CONFIG INTERFACE ----------------------- */

// Indicator configuration for a single entity
export interface IndicatorConfig {
  attribute?: string;
  entity: string;
  icon?: string;
  icon_template?: string;
  state_template?: string;
  visibility?: string;
  color?: string;
  action_config?: ButtonActionConfig;
}

// IndicatorGroup configuration for a group of indicators
export interface IndicatorGroupConfig {
  icon?: string;
  items?: Array<IndicatorGroupItemConfig>; // Array of group items
  name: string;
  visibility?: string;
  color?: string;
}

// Configuration for individual items in the indicatorGroup
export interface IndicatorGroupItemConfig {
  attribute?: string;
  entity: string;
  icon?: string;
  icon_template?: string;
  color?: string;
  name?: string;
  state_template?: string;
  action_config?: ButtonActionConfig;
}

export interface IndicatorsConfig {
  single?: IndicatorConfig[];
  group?: IndicatorGroupConfig[];
}

/* ----------------------- RANGE INFO CONFIG INTERFACE ---------------------- */

export interface RangeInfoConfig {
  energy_level: RangeItemConfig;
  progress_color: string;
  range_level?: RangeItemConfig;
  charging_entity?: string;
  charging_template?: string;
  charge_target_entity?: string;
  charge_target_color?: string;
  charge_target_visibility?: string;
  charge_target_tooltip?: boolean;
  color_template?: string;
  bar_height?: number;
  bar_width?: number;
  bar_radius?: number;
}
export type RangeValuePosition = 'outside' | 'inside' | 'off';
export type RangeItemConfig = {
  attribute?: string;
  entity?: string;
  icon?: string;
  value_position?: RangeValuePosition;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

/* ------------------------- CONFIG IMAGES INTERFACE ------------------------ */

export interface ImageConfig {
  title: string;
  url: string;
}

/* ----------------------------- MINI MAP CONFIG ---------------------------- */
export interface Address {
  streetNumber: string;
  streetName: string;
  sublocality: string;
  city: string;
}
export interface MapData {
  lat: number;
  lon: number;
  address: Partial<Address>;
}
export type THEME_MODE = 'auto' | 'dark' | 'light';
export type HISTORY_PERIOD = 'today' | 'yesterday';
export type LABEL_MODE = 'name' | 'state' | 'attribute' | 'icon';

export interface SingleMapCustomStyles {
  light?: string;
  dark?: string;
}
export interface MiniMapConfig {
  default_zoom: number;
  device_tracker: string;
  enable_popup: boolean;
  google_api_key: string;
  maptiler_api_key: string;
  us_format: boolean;
  hours_to_show: number;
  hide_map_address: boolean;
  theme_mode: THEME_MODE;
  map_height: number;
  path_color?: string;
  auto_fit?: boolean;
  map_zoom?: number;
  aspect_ratio?: string;
  history_period?: HISTORY_PERIOD;
  use_zone_name?: boolean;
  label_mode?: LABEL_MODE;
  attribute?: string;
  fit_zones?: boolean;
  single_map_card?: boolean;
  use_more_info?: boolean;
  extra_entities?: (MapEntityConfig | string)[];
  map_styles?: SingleMapCustomStyles;
}

/* ------------------------- BUTTON AND CARD CONFIG ------------------------- */

type SecondaryInfoConfig = {
  attribute: string;
  entity: string;
  state_template: string;
};

export interface ButtonConfig {
  icon: string;
  notify?: string;
  notify_color?: string;
  notify_icon?: string;
  primary: string;
  color: string;
  secondary: SecondaryInfoConfig;
  picture_template?: string;
}

export interface DefaultCardConfig {
  collapsed_items: boolean;
  items: Array<CardItemConfig>;
  title: string;
}

export interface CardItemConfig {
  attribute?: string;
  entity: string;
  icon?: string;
  name?: string;
  state_template?: string;
}

export interface ButtonActionConfig {
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface TireEntityConfig {
  entity: string;
  attribute?: string;
  name?: string;
  color?: string;
}

export interface TireTemplateConfig {
  title?: string;
  background: string;
  background_entity?: string;
  horizontal: boolean;
  image_size: number;
  value_size: number;
  top: number;
  left: number;
  hide_rotation_button?: boolean;
  front_left: TireEntityConfig;
  front_right: TireEntityConfig;
  rear_left: TireEntityConfig;
  rear_right: TireEntityConfig;
}

export type TireEntity = {
  title: string;
  background: string;
  background_entity?: string;
  image_size: number;
  value_size: number;
  top: number;
  left: number;
  tires: {
    front_left: {
      state: string;
      name: string;
      color: string;
    };
    front_right: {
      state: string;
      name: string;
      color: string;
    };
    rear_left: {
      state: string;
      name: string;
      color: string;
    };
    rear_right: {
      state: string;
      name: string;
      color: string;
    };
  };
  horizontal: boolean;
  hide_rotation_button?: boolean;
};

export interface ButtonCardConfig {
  button: ButtonConfig;
  button_action: ButtonActionConfig;
  button_type: BUTTON_TYPE;
  card_type: CARD_TYPE;
  custom_card: LovelaceCardConfig[];
  default_card: Array<DefaultCardConfig>;
  hide_button: boolean;
  tire_card?: TireTemplateConfig;
}

export type BaseButtonConfig = Omit<ButtonCardConfig, 'custom_card' | 'default_card' | 'tire_card'>;

export interface ButtonCardEntityItem {
  button: {
    button_action: ButtonActionConfig;
    icon: string;
    notify: string;
    primary: string;
    secondary: SecondaryInfoConfig;
    color: string;
    picture_template: string;
    notify_color?: string;
    notify_icon?: string;
  };
  button_type: BUTTON_TYPE;
  card_type: CARD_TYPE;
  custom_card: LovelaceCardConfig[];
  default_card: Array<{
    collapsed_items: boolean;
    items: CardItemConfig[];
    title: string;
  }>;
  hide_button: boolean;
  tire_card?: TireEntity;
}
type BUTTON_TYPE = 'action' | 'default';
type CARD_TYPE = 'custom' | 'default' | 'tire';

export type ButtonCardEntity = ButtonCardEntityItem[];

export enum PREVIEW_TYPE {
  CUSTOM = 'custom',
  DEFAULT = 'default',
  TIRE = 'tire',
}
export type BUTTON_LAYOUT = 'horizontal' | 'vertical';

/* ----------------------------- LAYOUT CONFIG ----------------------------- */
export interface LayoutConfig {
  button_grid: {
    rows: number;
    columns: number;
    swipe: boolean;
    button_layout?: BUTTON_LAYOUT;
  };
  images_swipe: {
    max_height: number;
    max_width: number;
    autoplay: boolean;
    loop: boolean;
    delay: number;
    speed: number;
    effect: 'slide' | 'fade' | 'coverflow';
    hide_pagination: boolean;
  };
  hide: {
    button_notify: boolean;
    buttons: boolean;
    images: boolean;
    indicators: boolean;
    mini_map: boolean;
    range_info: boolean;
    card_name: boolean;
    map_address?: boolean;
  };
  theme_config: {
    mode: THEME_MODE;
    theme?: string;
  };
  section_order?: Array<string>;
  range_info_config?: {
    layout: 'column' | 'row';
  };
}

/**
 * Configuration interface for the Vehicle Card.
 */

export interface VehicleStatusCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  button_card: ButtonCardConfig[];
  range_info: RangeInfoConfig[];
  images?: ImageConfig[];
  mini_map: MiniMapConfig;
  indicators: IndicatorsConfig;
  layout_config: LayoutConfig;
  image_entities?: (EntityConfig | string)[];
}
