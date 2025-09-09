import type { ImageConfig, ImageItem } from '../../types/config/card/images';
import type { EntityConfig } from '../../types/config/entity-config';

/**
 * Migrate old image configurations to the new format.
 * @param images - Array of image configurations (string URLs or ImageConfig objects).
 * @param image_entities - Array of entity configurations (string entity IDs or EntityConfig objects).
 * @returns Array of ImageItem configurations.
 */
export function migrateImages(images?: ImageConfig[], image_entities?: (EntityConfig | string)[]): ImageItem[] {
  const imageItems: ImageItem[] = [];

  // Migrate images from the `images` array
  if (images && images.length) {
    imageItems.push(
      ...images.map((img) => ({
        image: img.url,
      }))
    );
  }

  // Migrate images from the `image_entities` array
  if (image_entities) {
    for (const entity of image_entities) {
      if (typeof entity === 'string') {
        imageItems.push({
          image_entity: entity,
        });
      } else if ('entity' in entity && entity.entity) {
        imageItems.push({
          image_entity: entity.entity,
        });
      }
    }
  }

  return imageItems;
}

export interface EditorImageItem extends ImageItem {
  type: 'image' | 'image_entity';
  value?: string; // Used for editor purposes only
}

export const processEditorImages = <T extends EditorImageItem>(items: T[] | ImageItem[]): T[] => {
  if (!items || !Array.isArray(items)) {
    throw new Error('Images need to be an array');
  }

  return items.map((item, index): T => {
    if (
      typeof item === 'object' &&
      !Array.isArray(item) &&
      item.type &&
      (item.type === 'image' || item.type === 'image_entity')
    ) {
      return item;
    }

    let config: T;
    if (typeof item === 'object' && !Array.isArray(item)) {
      if ('image' in item && item.image) {
        config = { type: 'image', value: item.image, title: item.title, ...item } as T;
      } else if ('image_entity' in item && item.image_entity) {
        config = { type: 'image_entity', value: item.image_entity, title: item.title, ...item } as T;
      } else {
        throw new Error(`Invalid image item at position ${index}`);
      }
    } else {
      throw new Error(`Invalid image item at position ${index}`);
    }
    return config;
  });
};

export const revertEditorImages = <T extends EditorImageItem>(items: T[]): ImageItem[] => {
  if (!items || !Array.isArray(items)) {
    throw new Error('Images need to be an array');
  }

  return items.map((item, index): ImageItem => {
    let config: ImageItem;
    if (!item.type && ('image' in item || 'image_entity' in item)) {
      // Already in old format
      config = item;
    } else if (item.type === 'image' && item.value) {
      config = { image: item.value };
    } else if (item.type === 'image_entity' && item.value) {
      config = { image_entity: item.value };
    } else {
      throw new Error(`Invalid image item at position ${index}`);
    }
    return config;
  });
};
