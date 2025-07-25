import { LovelaceCardConfig } from '../../../ha';
import { EntityConfig } from '../entity-config';

export type LABEL_MODE = 'name' | 'state' | 'attribute' | 'icon';
export type HISTORY_PERIOD = 'today' | 'yesterday';
export type MAP_THEME_MODE = 'auto' | 'dark' | 'light';

export interface MapEntityConfig extends EntityConfig {
  label_mode?: LABEL_MODE;
  attribute?: string;
  focus?: boolean;
  color?: string;
}

type CustomStyles = Partial<{
  light: string;
  dark: string;
}>;

export interface MiniMapBaseConfig {
  device_tracker: string;
  enable_popup?: boolean;
  maptiler_api_key?: string;
  google_api_key?: string;
  hide_map_address?: boolean;
  us_format?: boolean;
  map_height?: number;
  map_zoom?: number;
  use_zone_name?: boolean;
  single_map_card?: boolean;
}

export interface MapPopupSharedConfig {
  default_zoom?: number;
  hours_to_show?: number;
  theme_mode?: MAP_THEME_MODE;
  aspect_ratio?: string;
  auto_fit?: boolean;
  fit_zones?: boolean;
  history_period?: HISTORY_PERIOD;
}
export interface MiniMapConfig extends MiniMapBaseConfig, MapPopupSharedConfig {
  path_color?: string;
  label_mode?: LABEL_MODE;
  attribute?: string;
  use_more_info?: boolean;
  map_styles?: CustomStyles;
  extra_entities?: (MapEntityConfig | string)[];
}

export interface ExtraMapCardConfig extends LovelaceCardConfig {
  type: 'custom:extra-map-card';
  title?: string;
  api_key?: string;
  aspect_ratio?: string;
  entities?: (MapEntityConfig | string)[];
  auto_fit?: boolean;
  fit_zones?: boolean;
  default_zoom?: number;
  hours_to_show?: number;
  theme_mode?: MAP_THEME_MODE;
  show_all?: boolean;
  use_more_info?: boolean;
  custom_styles?: CustomStyles;
  history_period?: HISTORY_PERIOD;
}

export type Address = Partial<{
  streetNumber: string;
  streetName: string;
  sublocality: string;
  city: string;
}>;
export interface MapData {
  lat: number;
  lon: number;
  address?: Address;
}
