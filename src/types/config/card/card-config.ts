import { LovelaceCardConfig } from '../../../ha';
import { EntityConfig } from '../entity-config';
import { ButtonCardConfig } from './button';
import { ImageConfig } from './images';
import { IndicatorsConfig } from './indicators';
import { LayoutConfig } from './layout';
import { MiniMapConfig } from './mini-map';
import { RangeInfoConfig } from './range-info';
import { IndicatorRowConfig } from './row-indicators';
/**
 * Configuration interface for the Vehicle Card.
 */

export interface VehicleStatusCardConfig extends LovelaceCardConfig {
  name?: string;
  button_card: ButtonCardConfig[];
  range_info: RangeInfoConfig[];
  images?: ImageConfig[];
  mini_map: MiniMapConfig;
  indicator_rows?: IndicatorRowConfig[];
  layout_config: LayoutConfig;
  image_entities?: (EntityConfig | string)[];
  /**
   * @deprecated Use `indicator_rows` instead.
   */
  indicators?: IndicatorsConfig;
}

export enum PREVIEW_TYPE {
  CUSTOM = 'custom',
  DEFAULT = 'default',
  TIRE = 'tire',
}
