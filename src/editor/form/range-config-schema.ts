import memoizeOne from 'memoize-one';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { computeOptionalActionSchemaFull } from './actions-config';

interface TemplateItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  selector: {
    template: { preview?: boolean };
  };
}
const DIMENSION_KEYS = ['bar_height', 'bar_width', 'bar_radius'];

const CHARGE_TARGET_KEYS = [
  'charge_target_entity',
  'charge_target_color',
  'charge_target_visibility',
  'charge_target_tooltip',
] as const;

const CHARGING_KEYS = [
  'charging_entity',
  'charging_template',
  'charging_icon_template',
  'charging_icon_color_template',
] as const;

const TEMPLATES = [
  {
    name: 'charging_template',
    label: 'Charging Template',
    helper: 'Template to set the visibility of the charging active icon',
  },
  {
    name: 'charging_icon_template',
    label: 'Charging Icon Template',
    helper: 'Override the default charging icon with a custom one based on a template',
  },
  {
    name: 'charging_icon_color_template',
    label: 'Charging Icon Color Template',
    helper: 'Template to set the color of the charging icon, overrides the default bar color',
  },
  {
    name: 'charge_target_visibility',
    label: 'Charge Target Visibility',
    helper: 'Template to set the visibility of the charge target line, defaults true if charge_target_entity is set',
  },
  {
    name: 'visibility_template',
    label: ' ',
    helper: 'The bar will be shown when the template result is true',
  },
];

const TemplateKeys = TEMPLATES.map((t) => t.name);
type TemplateKey = (typeof TemplateKeys)[number];

const computeTemplateSchema = (type?: TemplateKey[]) => {
  if (!type) {
    type = TemplateKeys;
  }
  const list: TemplateItem[] = [];
  type.forEach((key) => {
    const t = TEMPLATES.find((tt) => tt.name === key);
    if (t) {
      list.push({
        name: t.name,
        label: t.label,
        helper: t.helper,
        selector: {
          template: { preview: true },
        },
      });
    }
  });
  return list;
};

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

export const RANGE_ITEM_BASE_SCHEMA = () =>
  [
    {
      name: 'icon',
      label: 'Icon',
      selector: { icon: {} },
      context: { icon_entity: 'entity' },
    },
    {
      name: 'hide_icon',
      label: 'Hide Icon',
      type: 'boolean',
      default: false,
      helper: 'Hide the icon even if set',
    },
    {
      name: 'icon_state_color',
      label: 'Icon State Color',
      type: 'boolean',
      default: false,
      helper: 'Use the state color for the icon',
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
  ...(entityId && entityId !== ''
    ? [
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
          name: '',
          type: 'grid',
          flatten: true,
          schema: [
            ...RANGE_ITEM_BASE_SCHEMA(),
            ...(valueAligment ? VALUE_ALIGNMENT_SCHEMA(valueAligment) : []),
            ...(required === true
              ? [
                  {
                    name: 'max_value',
                    label: 'Max Value',
                    type: 'integer',
                    valueMin: 0,
                  },
                ]
              : []),
          ],
        },
        {
          name: '',
          type: 'expandable',
          title: 'Interaction Options',
          icon: 'mdi:gesture-tap-button',
          flatten: true,
          schema: [...computeOptionalActionSchemaFull()],
        },
      ]
    : []),
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

export const CHARGING_STATE_SCHEMA = () => {
  return [
    {
      name: 'charging_entity',
      label: ' ',
      selector: { entity: {} },
      required: false,
    },
    {
      title: 'Template Options (Optional)',
      type: 'expandable',
      flatten: true,
      icon: 'mdi:code-json',
      context: { isTemplate: true },
      schema: [
        {
          type: 'optional_actions',
          flatten: true,
          context: { isTemplate: true },
          schema: [
            ...computeTemplateSchema(['charging_template', 'charging_icon_template', 'charging_icon_color_template']),
          ],
        },
      ],
    },
  ] as const;
};

export const CHARGE_TARGET_SCHEMA = (entityId: string | undefined) =>
  [
    {
      name: 'charge_target_entity',
      selector: { entity: {} },
      required: false,
    },
    ...(entityId && entityId !== ''
      ? [
          {
            name: '',
            type: 'grid',
            flatten: true,
            schema: [
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
            helper:
              'Template to set the visibility of the charge target line, defaults true if charge_target_entity is set',
            selector: { template: {} },
          },
        ]
      : []),
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

export const RANGE_LAYOUT = [
  {
    name: 'layout',
    label: 'Choose Range Info Layout',
    default: 'column',
    required: false,
    selector: {
      select: {
        mode: 'dropdown',
        options: RANGE_LAYOUTS.map((layout) => ({
          value: layout,
          label: capitalizeFirstLetter(layout),
        })),
      },
    },
  },
] as const;

export const RANGE_VISIBILITY_SCHEMA = [...computeTemplateSchema(['visibility_template'])];
