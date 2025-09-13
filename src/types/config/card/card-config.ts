import { LovelaceCardConfig } from '../../../ha';
import { reorderSection } from '../../../utils/editor/reorder-section';
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

export const configHasDeprecatedProps = (config: VehicleStatusCardConfig): boolean => {
  return Boolean(config.mini_map?.extra_entities || config.layout_config?.hide);
};

export const updateDeprecatedConfig = (config: VehicleStatusCardConfig): VehicleStatusCardConfig => {
  const newConfig = { ...config };
  if (!!config.layout_config?.hide) {
    const hideConfig = config.layout_config.hide;
    if (hideConfig.card_name) {
      newConfig.layout_config.hide_card_name = hideConfig.card_name;
    } // Migrate hide_card_name if present
    const currentOrder = config.layout_config?.section_order || [];
    const updatedOrder = reorderSection(hideConfig, currentOrder);
    newConfig.layout_config.section_order = updatedOrder;
  }
  if (!!config.mini_map?.extra_entities?.length) {
    // Clean up extra_entities to remove duplicates and invalid entries
    newConfig.mini_map.entities = config.mini_map.extra_entities;
    newConfig.mini_map.extra_entities = undefined;
    console.debug('Migrated extra_entities to entities in mini_map config');
  }
  delete newConfig.mini_map?.extra_entities; // Remove deprecated extra_entities property
  // Remove the deprecated 'hide' property
  delete newConfig.layout_config.hide;
  // console.debug('Final layout_config after migration:', newConfig.layout_config);
  return newConfig;
};
