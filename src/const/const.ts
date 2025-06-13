import {
  mdiDotsVertical,
  mdiDrag,
  mdiPencil,
  mdiPlus,
  mdiCodeBraces,
  mdiListBoxOutline,
  mdiDelete,
  mdiContentCopy,
  mdiContentCut,
  mdiClose,
  mdiChevronRight,
  mdiChevronLeft,
  mdiCodeJson,
  mdiThemeLightDark,
  mdiRestart,
} from '@mdi/js';

import { version } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const NAMESPACE_TITLE = 'Vehicle Status Card';
export const EXTRA_MAP_CARD_URL = 'https://cdn.jsdelivr.net/npm/extra-map-card/dist/extra-map-card-bundle.min.js';

export const ICON = {
  CLOSE: mdiClose,
  CODE_BRACES: mdiCodeBraces,
  CONTENT_COPY: mdiContentCopy,
  CONTENT_CUT: mdiContentCut,
  DELETE: mdiDelete,
  DOTS_VERTICAL: mdiDotsVertical,
  DRAG: mdiDrag,
  LIST_BOX_OUTLINE: mdiListBoxOutline,
  PENCIL: mdiPencil,
  PLUS: mdiPlus,
  CHEVRON_RIGHT: mdiChevronRight,
  CHEVRON_LEFT: mdiChevronLeft,
  CODE_JSON: mdiCodeJson,
  THEME_LIGHT_DARK: mdiThemeLightDark,
  RESTART: mdiRestart,
};

export const enum SECTION {
  INDICATORS = 'indicators',
  RANGE_INFO = 'range_info',
  IMAGES = 'images',
  MINI_MAP = 'mini_map',
  BUTTONS = 'buttons',
  HEADER_INFO = 'header_info',
  CARD_NAME = 'card_name',
}

export const CARD_SECTIONS = [
  SECTION.INDICATORS,
  SECTION.RANGE_INFO,
  SECTION.IMAGES,
  SECTION.MINI_MAP,
  SECTION.BUTTONS,
];
export const SECTION_ORDER = [SECTION.HEADER_INFO, SECTION.IMAGES, SECTION.MINI_MAP, SECTION.BUTTONS];
