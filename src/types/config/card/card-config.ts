import { LovelaceCardConfig } from '../../../ha';
import { reorderSection } from '../../../utils/editor/reorder-section';
import { EntityConfig } from '../entity-config';
import { ButtonCardConfig } from './button';
import { BaseButtonCardItemConfig } from './button-card';
import { hasImageLegacy, ImageConfig, ImageItem, migrateImageConfig } from './images';
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
  button_cards?: BaseButtonCardItemConfig[];

  range_info: RangeInfoConfig[];
  images?: (ImageItem | ImageConfig)[];
  mini_map: MiniMapConfig;
  indicator_rows?: IndicatorRowConfig[];
  layout_config: LayoutConfig;
  /**
   * @deprecated Use `button_cards` instead.
   */
  button_card?: ButtonCardConfig[];
  /**
   * @deprecated Use `images.image_entity` or `images.image` instead.
   */
  image_entities?: (EntityConfig | string)[];
  /**
   * @deprecated Use `indicator_rows` instead.
   */
  indicators?: IndicatorsConfig;
}

export const configHasDeprecatedProps = (config: VehicleStatusCardConfig): boolean => {
  // Check for deprecated properties
  const imageLegacy = hasImageLegacy(config.images || []) || !!config.image_entities;
  // console.debug('Checking for deprecated config properties:', {
  //   hasImageLegacy: imageLegacy,
  //   hasLayoutHide: !!config.layout_config?.hide,
  //   hasMiniMapExtraEntities: !!config.mini_map?.extra_entities,
  //   hasButtonLegacy: !!config.button_card?.length,
  // });
  return Boolean(config.mini_map?.extra_entities || config.layout_config?.hide || imageLegacy);
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
    console.debug('Updated section_order');
  }
  if (!!config.mini_map?.extra_entities?.length) {
    // Clean up extra_entities to remove duplicates and invalid entries
    newConfig.mini_map.entities = config.mini_map.extra_entities;
    newConfig.mini_map.extra_entities = undefined;
    console.debug('Updated mini_map entities');
  }
  if (hasImageLegacy(config.images || []) || !!config.image_entities) {
    // delete deprecated image_entities and migrate images
    delete newConfig.images; // Clear existing images to avoid duplication
    delete newConfig.image_entities;

    newConfig.images = [];
    const migratedImages = migrateImageConfig(config.images as ImageConfig[], config.image_entities);
    newConfig.images.push(...migratedImages);
    console.debug('Images migrated');
    if (newConfig.layout_config?.images_swipe) {
      // change max_height and max_width to height and width
      const { max_height, max_width, ...rest } = newConfig.layout_config.images_swipe;
      newConfig.layout_config.images_swipe = {
        ...rest,
        height: max_height,
        width: max_width,
      };
      delete newConfig.layout_config.images_swipe?.max_height;
      delete newConfig.layout_config.images_swipe?.max_width;
      console.debug('Updated images_swipe height and width');
    }
  }

  delete newConfig.mini_map?.extra_entities; // Remove deprecated extra_entities property
  // Remove the deprecated 'hide' property
  delete newConfig.layout_config.hide;
  // console.debug('Final layout_config after migration:', newConfig.layout_config);

  return newConfig;
};
