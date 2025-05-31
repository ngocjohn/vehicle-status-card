import memoizeOne from 'memoize-one';

import { computeOptionalActionSchema } from './actions-config';

export const RANGE_ITEM_SCHEMA = memoizeOne(
  (entityId: string, required: boolean = false) =>
    [
      {
        name: 'entity',
        required: required,
        selector: { entity: {} },
      },
      {
        name: 'attribute',
        label: 'Attribute',
        selector: {
          attribute: {
            entity_id: entityId,
          },
        },
      },
      {
        name: 'icon',
        selector: { icon: {} },
        context: { icon_entity: 'entity' },
      },
      {
        name: '',
        type: 'expandable',
        title: 'Interaction Options',
        icon: 'mdi:gesture-tap-button',
        schema: [...computeOptionalActionSchema()],
      },
    ] as const
);

export const PROGRESS_BAR_SCHEMA = [
  {
    name: '',
    type: 'grid',
    column_min_width: '140px',
    schema: [
      {
        name: 'bar_height',
        label: 'Bar Height (px)',
        default: 5,
        selector: {
          number: {
            min: 1,
            mode: 'box',
          },
        },
      },
      {
        name: 'bar_width',
        label: 'Bar Width (px)',
        default: 60,
        selector: {
          number: {
            min: 1,
            max: 100,
            mode: 'box',
          },
        },
      },
      {
        name: 'bar_radius',
        label: 'Bar Radius (px)',
        default: 5,
        selector: {
          number: {
            min: 1,
            mode: 'box',
          },
        },
      },
    ],
  },
] as const;
