/**
 * Image configuration interface for the Vehicle Card.
 * @deprecated Use `ImageItem` instead.
 * Will be removed in future releases.
 */
export interface ImageConfig {
  url: string; // URL of the image
  title?: string; // Title of the image
}

/** Image item that can be an image URL or tied to an entity */
export interface ImageItem {
  image?: string; // URL of the image
  image_entity?: string; // Entity ID to fetch the image from
}
