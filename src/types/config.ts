// Cutom card helpers:
import { ActionConfig } from 'custom-card-helpers';

import { LovelaceCardConfig } from './ha-frontend/lovelace/lovelace';

/* ----------------------- INDICATOR CONFIG INTERFACE ----------------------- */

// Indicator configuration for a single entity
export interface IndicatorConfig {
  attribute?: string;
  entity: string;
  icon: string;
  icon_template?: string;
  state_template?: string;
  visibility?: string;
  color?: string;
}

// IndicatorGroup configuration for a group of indicators
export interface IndicatorGroupConfig {
  icon: string;
  items: Array<IndicatorGroupItemConfig>; // Array of group items
  name: string;
  visibility: string;
  color?: string;
}

// Configuration for individual items in the indicatorGroup
export interface IndicatorGroupItemConfig {
  attribute?: string;
  entity: string;
  icon: string;
  icon_template?: string;
  name: string;
  state_template?: string;
}

/* ----------------------- RANGE INFO CONFIG INTERFACE ---------------------- */

export interface RangeInfoConfig {
  energy_level: RangeItemConfig;
  progress_color: string;
  range_level: RangeItemConfig;
}

export interface RangeItemConfig {
  attribute: string;
  entity: string;
  icon?: string;
}

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
  popUpCard?: LovelaceCardConfig[];
}

interface MiniMapConfig {
  default_zoom: number;
  device_tracker: string;
  enable_popup: boolean;
  google_api_key: string;
  us_format: boolean;
  hours_to_show: number;
  theme_mode: 'auto' | 'dark' | 'light';
  map_height: number;
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
  attribute: string;
  entity: string;
  icon?: string;
  name: string;
  state_template: string;
}

export interface ButtonActionConfig {
  double_tap_action: ActionConfig;
  entity: string;
  hold_action: ActionConfig;
  tap_action: ActionConfig;
}

export interface TireEntityConfig {
  entity: string;
  attribute: string;
  name: string;
  color?: string;
}

export interface TireTemplateConfig {
  title: string;
  background: string;
  horizontal: boolean;
  image_size: number;
  value_size: number;
  top: number;
  left: number;
  front_left: TireEntityConfig;
  front_right: TireEntityConfig;
  rear_left: TireEntityConfig;
  rear_right: TireEntityConfig;
}

export type TireEntity = {
  title: string;
  background: string;
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
};

export interface ButtonCardConfig {
  button: ButtonConfig;
  button_action: ButtonActionConfig;
  button_type: 'action' | 'default';
  card_type: 'custom' | 'default' | 'tire';
  custom_card: LovelaceCardConfig[];
  default_card: Array<DefaultCardConfig>;
  hide_button: boolean;
  tire_card?: TireTemplateConfig;
}

export interface ButtonCardEntityItem {
  button: {
    button_action: ButtonActionConfig;
    icon: string;
    notify: string;
    primary: string;
    secondary: SecondaryInfoConfig;
    color: string;
    picture_template: string;
  };
  button_type: 'action' | 'default';
  card_type: 'custom' | 'default' | 'tire';
  custom_card: LovelaceCardConfig[];
  default_card: Array<{
    collapsed_items: boolean;
    items: CardItemConfig[];
    title: string;
  }>;
  hide_button: boolean;
  tire_card?: TireEntity;
}

export type ButtonCardEntity = ButtonCardEntityItem[];

export type PREVIEW_TYPE = 'default' | 'custom' | 'tire' | null;

/* ----------------------------- LAYOUT CONFIG ----------------------------- */
interface LayoutConfig {
  button_grid: {
    rows: number;
    columns: number;
    swipe: boolean;
  };
  images_swipe: {
    max_height: number;
    max_width: number;
    autoplay: boolean;
    loop: boolean;
    delay: number;
    speed: number;
    effect: 'slide' | 'fade' | 'coverflow';
  };
  hide: {
    button_notify: boolean;
    buttons: boolean;
    images: boolean;
    indicators: boolean;
    mini_map: boolean;
    range_info: boolean;
    card_name: boolean;
    map_address: boolean;
  };
  theme_config: {
    mode: 'auto' | 'dark' | 'light';
    theme: string;
  };
  section_order?: Array<string>;
}

/**
 * Configuration interface for the Vehicle Card.
 */

export interface VehicleStatusCardConfig extends LovelaceCardConfig {
  button_card: Array<ButtonCardConfig>;
  images: Array<ImageConfig>;
  indicators: {
    group: Array<IndicatorGroupConfig>;
    single: Array<IndicatorConfig>;
  };
  layout_config: LayoutConfig;
  mini_map: MiniMapConfig;
  name?: string;
  range_info: Array<RangeInfoConfig>;
  type: string;
}
