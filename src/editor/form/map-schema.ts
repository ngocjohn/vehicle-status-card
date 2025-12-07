import { mdiCog, mdiMap } from '@mdi/js';
import { html } from 'lit';

import { ALERT_INFO } from '../editor-const';

const mapTilerHelper = html`How to get Maptiler API Key?
  <a href=${ALERT_INFO.MAPTILER_DOC_LINK} target="_blank" rel="noreferrer">Click here</a>`;

export const BASE_MAP_SCHEMA = [
  {
    name: 'device_tracker',
    label: 'Device Tracker Entity',
    helper: 'Entity is required to configure the map',
    required: true,
    selector: { entity: { filter: { domain: ['device_tracker', 'person'] } } },
  },
] as const;

const LAYOUT_BOOL = ['enable_popup', 'us_format', 'hide_map_address', 'use_zone_name', 'user_location'] as const;

export const MINI_MAP_LAYOUT_SCHEMA = [
  {
    type: 'expandable',
    title: 'Mini Map Layout',
    flatten: true,
    iconPath: mdiMap,
    schema: [
      {
        type: 'grid',
        flatten: true,
        schema: [
          ...LAYOUT_BOOL.map((name) => ({
            name,
            selector: { boolean: {} },
          })),
        ] as const,
      },
      {
        type: 'grid',
        flatten: true,
        schema: [
          {
            name: 'map_zoom',
            default: 14,
            selector: { number: { mode: 'box', min: 0, max: 20, step: 1 } },
          },
          {
            name: 'map_height',
            default: 150,
            selector: { number: { mode: 'box', min: 150, max: 500, step: 10 } },
          },
        ] as const,
      },
    ],
  },
];

export const BASE_MAP_CONFIG_SCHEMA = (data: any) => {
  const noEntity = !data?.device_tracker || data?.device_tracker === '';
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
      expanded: noEntity,
      iconPath: mdiCog,
      schema: [
        ...BASE_MAP_SCHEMA,
        {
          name: 'maptiler_api_key',
          label: 'MapTiler API Key (optional)',
          helper: mapTilerHelper,
          type: 'string',
          disabled: noEntity,
          required: false,
        },
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
    ...(!noEntity && notUseSingleMapCard ? MINI_MAP_LAYOUT_SCHEMA : []),
  ] as const;
};
