import { LovelaceCardConfig } from '../../../ha';
import { EntityConfig } from '../entity-config';

export type LABEL_MODE = 'name' | 'state' | 'attribute' | 'icon';
export type HISTORY_PERIOD = 'today' | 'yesterday';
export type MAP_THEME_MODE = 'auto' | 'dark' | 'light';

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
  device_tracker?: string;
  maptiler_api_key?: string;
  single_map_card?: boolean;
  google_api_key?: string;
}

export interface MinimapLayoutConfig {
  enable_popup?: boolean;
  hide_map_address?: boolean;
  us_format?: boolean;
  map_height?: number;
  map_zoom?: number;
  use_zone_name?: boolean;
}

export interface MapPopupSharedConfig {
  default_zoom?: number;
  hours_to_show?: number;
  theme_mode?: MAP_THEME_MODE;
  aspect_ratio?: string;
  auto_fit?: boolean;
  fit_zones?: boolean;
  entities?: (EntityConfig | string)[];
  /**
   * @deprecated use `entities` instead
   */
  extra_entities?: (MapEntityConfig | string)[];
}

export interface MaptilerPopupConfig {
  // maptiler config for Extra Map Card
  history_period?: HISTORY_PERIOD;
  use_more_info?: boolean;
  map_styles?: CustomStyles;
  label_mode?: LABEL_MODE;
  attribute?: string;
}

export type MiniMapConfig = MiniMapBaseConfig & MinimapLayoutConfig & MapPopupSharedConfig & MaptilerPopupConfig;

// POPUP CARD

export interface BaseMapCardConfig extends LovelaceCardConfig {
  aspect_ratio?: string;
  auto_fit?: boolean;
  fit_zones?: boolean;
  default_zoom?: number;
  hours_to_show?: number;
  theme_mode?: MAP_THEME_MODE;
  entities?: (EntityConfig | string)[];
}

// MapCardConfig using BaseMapCardConfig
export interface MapCardConfig extends BaseMapCardConfig {
  type: 'map';
}

// ExtraMapCardConfig using BaseMapCardConfig
export interface ExtraMapCardConfig extends BaseMapCardConfig {
  type: 'custom:extra-map-card';
  api_key?: string;
  show_all?: boolean;
  use_more_info?: boolean;
  custom_styles?: CustomStyles;
  history_period?: HISTORY_PERIOD;
}

export type LovelaceMapPopupConfig = MapCardConfig | ExtraMapCardConfig;

export function mapCommonPopupConfig(config: MiniMapConfig): Partial<MapPopupSharedConfig> {
  return {
    aspect_ratio: config.aspect_ratio,
    auto_fit: config.auto_fit,
    fit_zones: config.fit_zones,
    default_zoom: config.default_zoom,
    hours_to_show: config.hours_to_show,
    theme_mode: config.theme_mode,
    entities: config.entities,
  };
}

export function computeExtraMapConfig(config: MiniMapConfig): Partial<ExtraMapCardConfig> {
  return {
    api_key: config.maptiler_api_key,
    custom_styles: config.map_styles,
    history_period: config.history_period,
    use_more_info: config.use_more_info,
    ...mapCommonPopupConfig(config),
  };
}

export function computePopupCardConfig(config: MiniMapConfig): LovelaceMapPopupConfig {
  const useMaptiler = config?.maptiler_api_key && config?.maptiler_api_key !== '';
  if (!config.entities || (Array.isArray(config.entities) && config.entities.length === 0)) {
    config.entities = [{ entity: config.device_tracker } as EntityConfig];
  }
  if (useMaptiler) {
    return {
      type: 'custom:extra-map-card',
      ...computeExtraMapConfig(config),
    } as ExtraMapCardConfig;
  }
  return {
    type: 'map',
    ...mapCommonPopupConfig(config),
  } as MapCardConfig;
}

export function toPopupShared(
  config: MapCardConfig | ExtraMapCardConfig
): Partial<MapPopupSharedConfig & MaptilerPopupConfig> {
  const sharedConfig: Partial<MapPopupSharedConfig & MaptilerPopupConfig> = {
    aspect_ratio: config.aspect_ratio,
    auto_fit: config.auto_fit,
    fit_zones: config.fit_zones,
    default_zoom: config.default_zoom,
    hours_to_show: config.hours_to_show,
    theme_mode: config.theme_mode,
    entities: config.entities,
    map_styles: config.custom_styles,
    history_period: config.history_period,
    use_more_info: config.use_more_info,
  };
  return sharedConfig;
}
