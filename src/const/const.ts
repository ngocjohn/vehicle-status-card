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
} from '@mdi/js';

import { repository, version } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const REPOSITORY = repository.repo;

export const DEFAULT_CONFIG = {
  button_card: [
    {
      button: {
        icon: 'mdi:new-box',
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
        notify: false,
        primary: 'New Button',
        secondary: 'This is a new button',
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
  images: [],
  indicators: {
    group: [],
    single: [],
  },
  layout_config: {
    button_grid: {
      rows: 2,
      swipe: true,
    },
    hide: {
      button_notify: false,
      buttons: false,
      images: false,
      indicators: false,
      mini_map: false,
      range_info: false,
    },
    theme_config: {
      mode: 'auto',
      theme: 'default',
    },
  },
  mini_map: {},
  name: 'Vehicle Status Card',
  range_info: [],
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
};
