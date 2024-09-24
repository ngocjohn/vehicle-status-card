// Cutom card helpers:
import { ActionConfig, HomeAssistant, LovelaceCardConfig, Theme, Themes } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

export interface ModeSpecificTheme {
  dark: Partial<Theme>;
  light: Partial<Theme>;
}

export interface ExtendedTheme extends Theme {
  modes?: ModeSpecificTheme;
}

export interface ExtendedThemes extends Themes {
  darkMode: boolean;
  themes: {
    [key: string]: ExtendedTheme;
  };
}

/**
 * HomeAssistantExtended extends the existing HomeAssistant interface with additional properties.
 */

export type HomeAssistantExtended = {
  formatAttributeName: (entityId: string, attribute: string) => string;
  formatEntityAttributeValue: (entityId: HassEntity, attribute: string) => string;
  formatEntityState: (stateObj: HassEntity) => string;
  themes: ExtendedThemes;
} & HomeAssistant;

/* ----------------------- INDICATOR CONFIG INTERFACE ----------------------- */

// Indicator configuration for a single entity
export interface IndicatorConfig {
  attribute?: string;
  entity: string;
  icon: string;
  icon_template?: string;
  state_template?: string;
  visibility?: string;
}

export type IndicatorEntity = Array<{
  entity: string;
  icon: string;
  state: string;
  visibility?: boolean;
}>;

// IndicatorGroup configuration for a group of indicators
export interface IndicatorGroupConfig {
  icon: string;
  items: Array<IndicatorGroupItemConfig>; // Array of group items
  name: string;
  visibility: string;
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

export type IndicatorGroupEntity = Array<{
  icon: string; // Group-level icon
  items: Array<{
    entity: string;
    icon: string;
    name: string;
    state: string;
  }>; // Array of individual indicator items
  name: string;
  visibility?: boolean;
}>;

/* ----------------------- RANGE INFO CONFIG INTERFACE ---------------------- */

export interface RangeInfoConfig {
  energy_level: Array<RangeItemConfig>;
  progress_color: string;
  range_level: Array<RangeItemConfig>;
}

export interface RangeItemConfig {
  attribute: string;
  entity: string;
  icon?: string;
}

export type RangeInfoEntity = Array<{
  energy: string;
  icon: string;
  level: number;
  progress_color: string;
  range: string;
}>;

/* ------------------------- CONFIG IMAGES INTERFACE ------------------------ */

export interface ImageConfig {
  title: string;
  url: string;
}

/* ----------------------------- MINI MAP CONFIG ---------------------------- */

export interface MiniMapConfig {
  default_zoom: number;
  device_tracker: string;
  enable_popup: boolean;
  google_api_key: string;
  hours_to_show: number;
  theme_mode: 'auto' | 'dark' | 'light';
}

/* ------------------------- BUTTON AND CARD CONFIG ------------------------- */

export interface SecondaryInfoConfig {
  attribute: string;
  entity: string;
  state_template: string;
}
export interface ButtonConfig {
  icon: string;
  notify: string;
  primary: string;
  secondary: Array<SecondaryInfoConfig>;
}

export type ButtonEntity = {
  buttonIndex: number;
  icon: string;
  notify: boolean;
  primary: string;
  secondary: string;
};

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
    };
    front_right: {
      state: string;
      name: string;
    };
    rear_left: {
      state: string;
      name: string;
    };
    rear_right: {
      state: string;
      name: string;
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

export interface CardItemEntity {
  entity: string;
  icon: string;
  name: string;
  state: string;
}

export type DefaultCardEntity = {
  collapsed_items: boolean;
  items: Array<{
    entity: string;
    icon: string;
    name: string;
    state: string;
  }>;
  title: string;
};

export type ButtonCardEntity = Array<{
  button: {
    button_action: ButtonActionConfig;
    icon: string;
    notify: boolean;
    primary: string;
    secondary: string;
  };
  button_type: 'action' | 'default';
  card_type: 'custom' | 'default' | 'tire';
  custom_card: LovelaceCardConfig[];
  default_card: Array<{
    collapsed_items: boolean;
    items: Array<{
      entity: string;
      icon: string;
      name: string;
      state: string;
    }>;
    title: string;
  }>;
  hide_button: boolean;
  tire_card?: TireEntity;
}>;

export type PREVIEW_TYPE = 'default' | 'custom' | 'tire' | null;

/* ----------------------------- LAYOUT CONFIG ----------------------------- */
export interface LayoutConfig {
  button_grid: {
    rows: number;
    swipe: boolean;
  };

  hide: {
    button_notify: boolean;
    buttons: boolean;
    images: boolean;
    indicators: boolean;
    mini_map: boolean;
    range_info: boolean;
  };
  theme_config: {
    mode: 'auto' | 'dark' | 'light';
    theme: string;
  };
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
