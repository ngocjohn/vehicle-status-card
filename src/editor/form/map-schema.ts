import { mdiPalette } from '@mdi/js';
import memoizeOne from 'memoize-one';

import { DEFAULT_HOURS_TO_SHOW, DEFAULT_ZOOM, STYLE_OPTIONS } from '../../const/maptiler-const';

import type { LocalizeFunc } from 'custom-card-helpers';

const themeModes = ['auto', 'light', 'dark'] as const;
const labelModes = ['name', 'state', 'icon', 'attribute'] as const;

const sharedDefaultMapConfig = [
  { name: 'aspect_ratio', label: 'Aspect Ratio', type: 'string' },
  {
    type: 'integer',
    name: 'default_zoom',
    label: 'Default Zoom',
    default: DEFAULT_ZOOM,
  },
  {
    name: 'theme_mode',
    label: 'Theme Mode',
    default: 'auto',
    selector: {
      select: {
        mode: 'dropdown',
        options: themeModes.map((themeMode) => ({
          value: themeMode,
          label: themeMode.charAt(0).toUpperCase() + themeMode.slice(1),
        })),
      },
    },
  },
  {
    type: 'integer',
    name: 'hours_to_show',
    label: 'Hours to Show',
    default: DEFAULT_HOURS_TO_SHOW,
  },
  {
    name: 'history_period',
    label: 'History Period',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
        ],
      },
    },
  },
  {
    name: 'auto_fit',
    label: 'Auto Fit',
    default: false,
    type: 'boolean',
  },
  {
    name: 'fit_zones',
    label: 'Fit Zones',
    default: false,
    type: 'boolean',
  },
];

const mapStyles = {
  name: 'map_styles',
  type: 'expandable',
  iconPath: mdiPalette,
  title: 'Custom Styles',
  schema: [
    {
      name: '',
      type: 'grid',
      schema: [
        {
          name: 'light',
          label: 'Light Style',
          selector: {
            select: {
              mode: 'dropdown',
              options: STYLE_OPTIONS,
            },
          },
        },
        {
          name: 'dark',
          label: 'Dark Style',
          selector: {
            select: {
              mode: 'dropdown',
              options: STYLE_OPTIONS,
            },
          },
        },
      ],
    },
  ],
};

export const singleMapConfingSchema = memoizeOne(
  (localize: LocalizeFunc) =>
    [
      {
        name: '',
        type: 'expandable',
        iconPath: mdiPalette,
        title: localize(`ui.panel.lovelace.editor.card.map.appearance`),
        schema: [
          {
            name: '',
            type: 'grid',
            schema: [...sharedDefaultMapConfig],
          },
          mapStyles,
        ],
      },
    ] as const
);

export const baseMapConfigSchema = memoizeOne(
  () =>
    [
      {
        name: 'device_tracker',
        selector: { entity: { filter: { domain: ['device_tracker', 'person'] } } },
      },
      // {
      //   name: 'google_api_key',
      //   label: 'Google API Key (optional)',
      //   selector: { text: { type: 'text' } },
      // },
      {
        name: 'maptiler_api_key',
        label: 'MapTiler API Key (optional)',
        selector: { text: { type: 'text' } },
      },
    ] as const
);

export const miniMapConfigSchema = memoizeOne(
  (deviceTracker: string, disabled: boolean) =>
    [
      {
        name: '',
        type: 'expandable',
        title: 'Mini Map Layout',
        schema: [
          {
            name: '',
            type: 'grid',
            schema: [
              {
                name: 'enable_popup',
                label: 'Enable Popup',
                default: false,
                type: 'boolean',
              },
              {
                name: 'us_format',
                label: 'US Address Format',
                default: false,
                type: 'boolean',
              },
              {
                name: 'hide_map_address',
                label: 'Hide address',
                default: false,
                type: 'boolean',
              },
              {
                name: 'use_zone_name',
                label: 'Use zone name',
                default: false,
                type: 'boolean',
              },
              {
                name: 'map_zoom',
                label: 'Map Zoom',
                default: 14,
                type: 'integer',
              },
              {
                name: 'map_height',
                label: 'Map Height',
                default: 150,
                selector: { number: { mode: 'box', min: 150, max: 500, step: 10 } },
              },
            ],
          },
        ],
      },
      {
        name: '',
        type: 'expandable',
        title: 'Popup Configuration',
        schema: [
          {
            name: '',
            type: 'grid',
            schema: [
              ...sharedDefaultMapConfig,
              {
                name: 'path_color',
                label: 'Path Color',
                selector: {
                  ui_color: {
                    include_none: false,
                    include_states: false,
                    default_color: '',
                  },
                },
              },
              {
                name: 'label_mode',
                label: 'Label Mode',
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: labelModes.map((labelMode) => ({
                      value: labelMode,
                      label: labelMode.charAt(0).toUpperCase() + labelMode.slice(1),
                    })),
                  },
                },
              },
              {
                name: 'attribute',
                label: 'Attribute',
                disabled: disabled,
                selector: {
                  attribute: {
                    entity_id: deviceTracker,
                  },
                },
              },
            ],
          },
        ],
      },
    ] as const
);
