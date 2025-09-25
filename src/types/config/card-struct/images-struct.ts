import { object, string, optional, union, array } from 'superstruct';

/**
 * @deprecated ImageConfig
 */
export const imageConfigStruct = object({
  /** @deprecated Use `image` or `image_entity` instead. */
  url: optional(string()),
});

/**
 * ImageItem (preferred)
 */
export const imageItemStruct = object({
  image: optional(string()),
  image_entity: optional(string()),
});

/**
 * Union: ImageItem | ImageConfig
 */
export const imageUnionStruct = union([imageItemStruct, imageConfigStruct]);

/**
 * Array of images
 */
export const imagesStruct = optional(array(imageUnionStruct));
