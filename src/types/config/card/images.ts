import { EntityConfig } from '../entity-config';

/**
 * Image configuration interface for the Vehicle Card.
 * @deprecated Use ImageItem instead.
 */
export interface ImageConfig {
  /**
   * @deprecated Use `image || image_entity` instead.
   */
  url?: string; // URL of the image
}

export interface ImageItem {
  image?: string; // URL of the image
  image_entity?: string; // Entity ID to fetch the image from
}

export const hasImageLegacy = (configImages: (ImageItem | ImageConfig)[]): boolean => {
  if (!configImages || !configImages.length) {
    return false;
  }
  // check if any item has the deprecated 'url' property
  return configImages.some((img) => (img as ImageConfig).url !== undefined);
};

export const migrateImageConfig = (images?: ImageConfig[], image_entities?: (string | EntityConfig)[]): ImageItem[] => {
  // console.debug('Migrating image configuration:', { images, image_entities });
  const imageList: ImageItem[] = [];
  if (images && images.length) {
    imageList.push(
      ...images.map((img) => ({
        image: img.url,
      }))
    );
  }
  if (image_entities && image_entities.length) {
    imageList.push(
      ...image_entities.map((ent) => ({
        image_entity: typeof ent === 'string' ? ent : ent.entity,
      }))
    );
  }
  // console.debug('Migrated image configuration:', imageList);
  return imageList;
};
