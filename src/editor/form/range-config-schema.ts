import memoizeOne from 'memoize-one';

import { computeOptionalActionSchema } from './actions-config';

const POSTIONS = ['outside', 'inside', 'off'] as const;
export const RANGE_ITEM_SCHEMA = memoizeOne(
  (name: string, entityId: string, required: boolean = false) =>
    [
      {
        name,
        type: 'grid',
        flatten: true,
        schema: [
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
            label: 'Icon',
            selector: { icon: {} },
          },
          {
            name: 'value_position',
            label: 'Value Position',
            default: 'outside',
            selector: {
              select: {
                mode: 'dropdown',
                options: POSTIONS.map((position) => ({
                  value: position,
                  label: position.charAt(0).toUpperCase() + position.slice(1),
                })),
              },
            },
          },
        ],
      },
      {
        name,
        type: 'expandable',
        title: 'Interaction Options',
        icon: 'mdi:gesture-tap-button',
        flatten: true,
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
            mode: 'box',
          },
        },
      },
      {
        name: 'bar_width',
        label: 'Bar Width (%)',
        default: 100,
        selector: {
          number: {
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
            mode: 'box',
          },
        },
      },
    ],
  },
] as const;

export const CHARGING_STATE_SCHEMA = [
  {
    name: 'charging_entity',
    selector: { entity: {} },
    required: false,
    helper: 'Entity to display the charging status',
  },
  {
    name: 'charging_template',
    label: 'Charging Template',
    helper: 'Template to set the visibility of the charging active icon',
    selector: { template: {} },
  },
] as const;
export const CHARGE_TARGET_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'charge_target_entity',
        selector: { entity: {} },
        required: false,
      },
      {
        name: 'charge_target_color',
        label: 'Charge Target Line Color',
        selector: {
          ui_color: {
            include_none: false,
            include_states: false,
            default_color: 'accent',
          },
        },
      },
    ] as const,
  },
  {
    name: 'charge_target_tooltip',
    label: 'Use Tooltip',
    helper: 'Show tooltip with target value when hovering over the charge target line',
    default: false,
    type: 'boolean',
  },
  {
    name: 'charge_target_visibility',
    label: 'Charge Target Visibility',
    helper: 'Template to set the visibility of the charge target line, defaults true if charge_target_entity is set',
    selector: { template: {} },
  },
];

const RANGE_LAYOUTS = ['column', 'row'] as const;
export const RANGE_LAYOUT_SCHEMA = [
  {
    name: 'layout',
    label: 'Layout appearance',
    type: 'select',
    default: 'column',
    required: false,
    options: RANGE_LAYOUTS.map((layout) => [layout, layout.charAt(0).toUpperCase() + layout.slice(1)]),
  },
] as const;
