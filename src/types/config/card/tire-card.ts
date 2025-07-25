/**
 * TireTemplateConfig Interface
 */

export type TireEntityConfig = {
  entity: string;
  attribute?: string;
  name?: string;
  color?: string;
};

export type TireCardLayout = {
  title?: string;
  background?: string;
  background_entity?: string;
  horizontal: boolean;
  image_size: number;
  value_size: number;
  top: number;
  left: number;
  hide_rotation_button?: boolean;
};

export type TireTemplateEntities = {
  front_left: TireEntityConfig;
  front_right: TireEntityConfig;
  rear_left: TireEntityConfig;
  rear_right: TireEntityConfig;
};

export interface TireTemplateConfig extends TireCardLayout, TireTemplateEntities {}

/**
 * TireEntity type
 */

export const TireItems = ['front_left', 'front_right', 'rear_left', 'rear_right'] as const;
export type TireItem = {
  state: string;
  name: string;
  color: string;
};
export type TiresConfig = {
  front_left: TireItem;
  rear_left: TireItem;
  front_right: TireItem;
  rear_right: TireItem;
};

/**
 * TireCardConfig Interface
 * This interface defines the structure of the tire card configuration
 * used in the Vehicle Status Card.
 */
export type TireEntity = TireCardLayout & {
  tires: TiresConfig;
};
