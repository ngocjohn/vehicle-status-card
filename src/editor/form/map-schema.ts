import { mdiCog, mdiMap } from '@mdi/js';
import { html } from 'lit';

import { ALERT_INFO } from '../editor-const';

const mapTilerHelper = html`How to get Maptiler API Key?
  <a href=${ALERT_INFO.MAPTILER_DOC_LINK} target="_blank" rel="noreferrer">Click here</a>`;

export const BASE_MAP_SCHEMA = [
  {
    name: 'device_tracker',
    label: 'Device Tracker Entity',
    selector: { entity: { filter: { domain: ['device_tracker', 'person'] } } },
  },
  {
    name: 'maptiler_api_key',
    label: 'MapTiler API Key (optional)',
    helper: mapTilerHelper,
    type: 'string',
    required: false,
  },
] as const;

export const MINI_MAP_LAYOUT_SCHEMA = [
  {
    type: 'expandable',
    flatten: true,
    title: 'Mini Map Layout',
    iconPath: mdiMap,
    schema: [
      {
        type: 'grid',
        flatten: true,
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
            valueMin: 0,
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
] as const;

export const BASE_MAP_CONFIG_SCHEMA = (data: any) => {
  const notMapTiler = !data?.maptiler_api_key || data?.maptiler_api_key === '';
  const helperText = notMapTiler
    ? 'MapTiler API key is required'
    : 'If enabled, the mini map will be displayed as a single card instead of within other card sections.';
  const notUseSingleMapCard = data?.single_map_card !== true;
  return [
    {
      title: 'Base Map Configuration',
      type: 'expandable',
      flatten: true,
      iconPath: mdiCog,
      schema: [
        ...BASE_MAP_SCHEMA,
        ...(!notMapTiler
          ? [
              {
                name: 'single_map_card',
                label: 'Mini Map as Single Card',
                helper: helperText,
                type: 'boolean',
                default: false,
                disabled: notMapTiler,
              },
            ]
          : []),
      ],
    },

    ...(notUseSingleMapCard ? MINI_MAP_LAYOUT_SCHEMA : []),
  ] as const;
};
