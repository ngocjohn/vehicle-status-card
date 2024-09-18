import { range } from 'es-toolkit';
import { version, repository } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const REPOSITORY = repository.repo;

export const DEFAULT_CONFIG = {
  type: 'custom:vehicle-status-card',
  name: 'Vehicle Status Card',
  indicators: {
    single: [],
    group: [],
  },
  range_info: [],
  images: [],
  mini_map: {},
  button_card: [
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'default',
      default_card: [
        {
          title: 'Default Card',
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
        },
        {
          title: 'Collapsed Card',
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
        },
      ],
      custom_card: [],
    },
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'custom',
      default_card: [],
      custom_card: [
        {
          type: 'entities',
          title: 'Custom Card',
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
        },
      ],
    },
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'default',
      default_card: [
        {
          title: 'Default Card',
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
        },
      ],
      custom_card: [],
    },
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'custom',
      default_card: [],
      custom_card: [
        {
          type: 'entities',
          title: 'Custom Card',
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
        },
      ],
    },
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'default',
      default_card: [
        {
          title: 'Default Card',
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
        },
      ],
      custom_card: [],
    },
    {
      button: {
        primary: 'New Button',
        secondary: 'This is a new button',
        icon: 'mdi:new-box',
        notify: false,
      },
      hide_button: false,
      card_type: 'custom',
      default_card: [],
      custom_card: [
        {
          type: 'entities',
          title: 'Custom Card',
          entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
        },
      ],
    },
  ],
  layout_config: {
    theme_config: {
      theme: 'default',
      mode: 'auto',
    },
    button_grid: {
      rows: 2,
      swipe: true,
    },
    hide: {
      button_notify: false,
      mini_map: false,
      buttons: false,
      indicators: false,
      range_info: false,
      images: false,
    },
  },
};
