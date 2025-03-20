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
} from '@mdi/js';

import { version } from '../../package.json';

export const CARD_VERSION = `v${version}`;

export const DEFAULT_CONFIG = {
  button_card: [
    {
      button: {
        icon: 'mdi:new-box',
        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      button_type: 'default',
      card_type: 'default',
      custom_card: [],
      default_card: [
        {
          collapsed_items: false,
          items: [
            {
              entity: 'sun.sun',
            },
            {
              entity: 'ensor.sun_next_dawn',
            },
            {
              entity: 'sensor.sun_next_midnight',
            },
            {
              entity: 'sensor.sun_next_noon',
            },
          ],
          title: 'Default Card',
        },
        {
          collapsed_items: true,
          items: [
            {
              entity: 'sun.sun',
            },
            {
              entity: 'ensor.sun_next_dawn',
            },
            {
              entity: 'sensor.sun_next_midnight',
            },
            {
              entity: 'sensor.sun_next_noon',
            },
          ],
          title: 'Collapsed Card',
        },
      ],
      hide_button: false,
    },
    {
      button: {
        icon: 'mdi:new-box',

        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      button_type: 'default',
      card_type: 'custom',
      custom_card: [
        {
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
          title: 'Custom Card',
          type: 'entities',
        },
      ],
      default_card: [],
      hide_button: false,
    },
    {
      button: {
        icon: 'mdi:new-box',
        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      button_type: 'default',
      card_type: 'default',
      custom_card: [],
      default_card: [
        {
          collapsed_items: false,
          items: [
            {
              entity: 'sun.sun',
            },
            {
              entity: 'ensor.sun_next_dawn',
            },
            {
              entity: 'sensor.sun_next_midnight',
            },
            {
              entity: 'sensor.sun_next_noon',
            },
          ],
          title: 'Default Card',
        },
      ],
      hide_button: false,
    },
    {
      button: {
        icon: 'mdi:new-box',
        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      button_type: 'default',
      card_type: 'custom',
      custom_card: [
        {
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
          title: 'Custom Card',
          type: 'entities',
        },
      ],
      default_card: [],
      hide_button: false,
    },
    {
      button: {
        icon: 'mdi:new-box',
        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      button_type: 'default',
      card_type: 'default',
      custom_card: [],
      default_card: [
        {
          collapsed_items: false,
          items: [
            {
              entity: 'sun.sun',
            },
            {
              entity: 'ensor.sun_next_dawn',
            },
            {
              entity: 'sensor.sun_next_midnight',
            },
            {
              entity: 'sensor.sun_next_noon',
            },
          ],
          title: 'Default Card',
        },
      ],
      hide_button: false,
    },
    {
      button: {
        icon: 'mdi:new-box',
        primary: 'New Button',
        secondary: {
          state_template: 'This is a new button',
        },
      },
      card_type: 'custom',
      custom_card: [
        {
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
          title: 'Custom Card',
          type: 'entities',
        },
      ],
      default_card: [],
      hide_button: false,
    },
  ],
  layout_config: {
    button_grid: {
      rows: 2,
      columns: 2,
      swipe: true,
    },
    hide: {
      button_notify: false,
      buttons: false,
      images: false,
      indicators: false,
      mini_map: true,
      range_info: false,
      map_address: false,
    },
    theme_config: {
      mode: 'auto',
      theme: 'default',
    },
  },
  name: 'Vehicle Status Card',
  type: 'custom:vehicle-status-card',
};

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
