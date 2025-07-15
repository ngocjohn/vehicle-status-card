import { EntityConfig } from 'custom-card-helpers';

import { LovelaceCardConfig } from './ha-frontend/lovelace/lovelace';

interface CustomStyles {
  light?: string;
  dark?: string;
}

export interface MapEntityConfig extends EntityConfig {
  label_mode?: 'state' | 'attribute' | 'name' | 'icon';
  attribute?: string;
  focus?: boolean;
  color?: string;
}
type ThemeMode = 'auto' | 'light' | 'dark';
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
  theme_mode?: ThemeMode;
  show_all?: boolean;
  use_more_info?: boolean;
  custom_styles?: CustomStyles;
  history_period?: 'today' | 'yesterday';
}
