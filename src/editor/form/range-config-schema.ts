import memoizeOne from 'memoize-one';

import { computeOptionalActionSchema } from './actions-config';

const DIMENSION_KEYS = ['bar_height', 'bar_width', 'bar_radius'];

const CHARGE_TARGET_KEYS = [
  'charge_target_entity',
  'charge_target_color',
  'charge_target_visibility',
  'charge_target_tooltip',
];

const CHARGING_KEYS = ['charging_entity', 'charging_template'];

export { DIMENSION_KEYS, CHARGE_TARGET_KEYS, CHARGING_KEYS };

const POSTIONS = ['outside', 'inside', 'off'] as const;
const ALIGNMENTS = ['start', 'end'] as const;

export const VALUE_ALIGNMENT_SCHEMA = (disabled: boolean) => {
  return [
    {
      name: 'value_alignment',
      label: 'Value Alignment',
      default: 'end',
      selector: {
        select: {
          mode: 'dropdown',
          options: ALIGNMENTS.map((alignment) => ({
            value: alignment,
            label: alignment.charAt(0).toUpperCase() + alignment.slice(1),
          })),
        },
      },
      disabled: !disabled,
    },
  ] as const;
};

export const RANGE_ITEM_BASE_SCHEMA = (entityId: string) =>
  [
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
  ] as const;

export const RANGE_ITEM_SCHEMA = memoizeOne((entityId: string, required: boolean = false, valueAligment?: boolean) => [
  {
    name: 'entity',
    required: required,
    selector: { entity: {} },
  },
  {
    name: '',
    type: 'grid',
    flatten: true,
    schema: [...RANGE_ITEM_BASE_SCHEMA(entityId), ...(valueAligment ? VALUE_ALIGNMENT_SCHEMA(valueAligment) : [])],
  },
  {
    name: '',
    type: 'expandable',
    title: 'Interaction Options',
    icon: 'mdi:gesture-tap-button',
    flatten: true,
    schema: [...computeOptionalActionSchema()],
  },
]);

export const PROGRESS_BAR_SCHEMA = [
  {
    name: '',
    type: 'grid',
    column_min_width: '140px',
    schema: [
      {
        name: 'bar_height',
        label: 'Bar Height (px)',
        type: 'integer',
        valueMin: 1,
      },
      {
        name: 'bar_width',
        label: 'Bar Width (%)',
        type: 'integer',
        valueMax: 100,
      },
      {
        name: 'bar_radius',
        label: 'Bar Radius (px)',
        type: 'integer',
        valueMin: 0,
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
] as const;

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
