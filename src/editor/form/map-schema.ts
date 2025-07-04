export const BASE_MAP_SCHEMA = [
  {
    name: 'device_tracker',
    selector: { entity: { filter: { domain: ['device_tracker', 'person'] } } },
  },
  {
    name: 'maptiler_api_key',
    label: 'MapTiler API Key (optional)',
    selector: { text: { type: 'text' } },
  },
] as const;

export const MINI_MAP_LAYOUT_SCHEMA = [
  {
    name: '',
    type: 'expandable',
    title: 'Mini Map Layout',
    expanded: true,
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
] as const;
