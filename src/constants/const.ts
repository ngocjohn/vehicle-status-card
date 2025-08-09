import { version } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const NAMESPACE_TITLE = 'Vehicle Status Card';
export const CARD_NAME = 'vehicle-status-card';

export const PREFIX_NAME = 'vsc';

export enum COMPONENT {
  BUTTONS_GRID = `${PREFIX_NAME}-buttons-grid`,
  IMAGES_SLIDE = `${PREFIX_NAME}-images-slide`,
  RANGE_INFO = `${PREFIX_NAME}-range-info`,
  INDICATORS = `${PREFIX_NAME}-indicators`,
  INDICATOR_ROW = `${PREFIX_NAME}-indicator-row`,
  MINI_MAP = `${PREFIX_NAME}-mini-map`,
  INDICATOR_BADGE = `${PREFIX_NAME}-indicator-badge`,
  INDICATOR_ITEM = `${PREFIX_NAME}-indicator-item`,
}

export type ComponentType = COMPONENT;

export const COMPONENTS = Object.values(COMPONENT) as ComponentType[];
