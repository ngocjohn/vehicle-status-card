import { LovelaceCardConfig } from '../../../ha';
import { EntityConfig } from '../entity-config';
import { ButtonCardConfig } from './button';
import { ImageConfig } from './images';
import { IndicatorsConfig, IndicatorRow } from './indicators';
import { LayoutConfig } from './layout';
import { MiniMapConfig } from './mini-map';
import { RangeInfoConfig } from './range-info';
/**
 * Configuration interface for the Vehicle Card.
 */

export interface VehicleStatusCardConfig extends LovelaceCardConfig {
  name?: string;
  button_card: ButtonCardConfig[];
  range_info: RangeInfoConfig[];
  images?: ImageConfig[];
  mini_map: MiniMapConfig;
  indicators: IndicatorsConfig;
  indicator_rows?: IndicatorRow[]; // Optional array of indicator rows
  layout_config: LayoutConfig;
  image_entities?: (EntityConfig | string)[];
}

export enum PREVIEW_TYPE {
  CUSTOM = 'custom',
  DEFAULT = 'default',
  TIRE = 'tire',
}
