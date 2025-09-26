import { LovelaceCardConfig } from '../../../ha';
// migration utils
import { migrateButtonCardConfig } from '../../../utils/editor/migrate-button-card';
import { reorderSection } from '../../../utils/editor/reorder-section';
// Vehicle Status Card config
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

  range_info?: RangeInfoConfig[];
  images?: (ImageItem | ImageConfig)[];
  mini_map?: MiniMapConfig;
  indicator_rows?: IndicatorRowConfig[];
  layout_config?: LayoutConfig;
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
  const hasImageLegacyConfig = hasImageLegacy(config.images || []) || !!config.image_entities;
  const hasLayoutHide = !!config.layout_config?.hide;
  const hasMiniMapExtraEntities = !!(
    config.mini_map &&
    config.mini_map.extra_entities &&
    config.mini_map.extra_entities.length
  );
  const hasButtonLegacy = !!config.button_card?.length;
  const needsUpdate = Boolean(hasImageLegacyConfig || hasLayoutHide || hasMiniMapExtraEntities || hasButtonLegacy);
  if (needsUpdate) {
    console.debug('Checking for deprecated config properties:', {
      hasImageLegacyConfig,
      hasLayoutHide,
      hasMiniMapExtraEntities,
      hasButtonLegacy,
    });
  }
  return needsUpdate;
};

export const updateDeprecatedConfig = (config: VehicleStatusCardConfig): VehicleStatusCardConfig => {
  const newConfig = { ...config };
  if (!!(config.layout_config && config.layout_config.hide)) {
    const hideConfig = config.layout_config.hide;
    if (hideConfig.card_name) {
      newConfig.layout_config!.hide_card_name = hideConfig.card_name;
    } // Migrate hide_card_name if present
    const currentOrder = config.layout_config?.section_order || [];
    const updatedOrder = reorderSection(hideConfig, currentOrder);
    newConfig.layout_config!.section_order = updatedOrder;
    console.debug('Updated section_order');
    delete newConfig.layout_config!.hide; // Remove deprecated hide property
  }
  if (!!config.mini_map?.extra_entities && config.mini_map.extra_entities.length) {
    newConfig.mini_map = { ...config.mini_map } as MiniMapConfig;
    // If entities already exist, merge and remove duplicates
    // Clean up extra_entities to remove duplicates and invalid entries
    newConfig.mini_map.entities = config.mini_map.extra_entities;
    delete newConfig.mini_map.extra_entities; // Remove deprecated extra_entities property
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

  if (!!config.button_card?.length) {
    console.debug('Migrating legacy button_card config...');
    const { button_layout, transparent } = config.layout_config?.button_grid || {};
    const layoutForBtn = {
      layout: button_layout ?? 'horizontal',
      transparent: transparent ?? false, // default to false if undefined
    };
    console.debug('Button layout settings:', layoutForBtn);

    newConfig.button_cards = migrateButtonCardConfig(config.button_card).map((btn) => ({ ...layoutForBtn, ...btn }));
    console.debug('Button cards migrated');

    delete newConfig.button_card; // Remove deprecated button_card property
    delete newConfig.layout_config?.button_grid?.button_layout;
    delete newConfig.layout_config?.button_grid?.transparent;
  }

  return newConfig;
};
