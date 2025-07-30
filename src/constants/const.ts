import { version } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const NAMESPACE_TITLE = 'Vehicle Status Card';
export const CARD_NAME = 'vehicle-status-card';
export const EDITOR_NAME = `${CARD_NAME}-editor`;

export const PREFIX_NAME = 'vsc';

export enum COMPONENT {
  BUTTONS_GRID = `${PREFIX_NAME}-buttons-grid`,
  IMAGES_SLIDE = `${PREFIX_NAME}-images-slide`,
  RANGE_INFO = `${PREFIX_NAME}-range-info`,
  INDICATORS = `${PREFIX_NAME}-indicators`,
  MINI_MAP = `${PREFIX_NAME}-mini-map`,
}

export type ComponentType = COMPONENT;

export const COMPONENTS = Object.values(COMPONENT) as ComponentType[];

export const enum SECTION {
  INDICATORS = 'indicators',
  RANGE_INFO = 'range_info',
  IMAGES = 'images',
  MINI_MAP = 'mini_map',
  BUTTONS = 'buttons',
  HEADER_INFO = 'header_info',
  CARD_NAME = 'card_name',
}

export const SECTION_ORDER = [SECTION.HEADER_INFO, SECTION.IMAGES, SECTION.MINI_MAP, SECTION.BUTTONS];
