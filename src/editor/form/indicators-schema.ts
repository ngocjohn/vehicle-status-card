import { mdiGestureTap, mdiPalette } from '@mdi/js';
import memoizeOne from 'memoize-one';

import { UiAction } from '../../ha';
import { computeOptionalActionSchema } from './actions-config';

const DEFAULT_ACTIONS: UiAction[] = ['more-info', 'toggle', 'navigate', 'url', 'perform-action', 'assist'];

export const singleIndicatorSchema = memoizeOne(
  (entity: string | undefined) =>
    [
      {
        name: 'entity',
        required: true,
        selector: {
          entity: {},
        },
      },
      {
        name: 'attribute',
        label: 'Attribute',
        selector: {
          attribute: {
            entity_id: entity,
          },
        },
      },
      {
        name: 'icon',
        selector: { icon: {} },
        context: { icon_entity: 'entity' },
      },
    ] as const
);

export const singleApparenceSchema = [
  {
    name: '',
    type: 'expandable',
    iconPath: mdiPalette,
    title: 'Appearance',
    schema: [
      {
        name: 'state_color',
        label: 'State Color',
        type: 'boolean',
        default: false,
        helper: 'Use the state color of the entity to color the indicator.',
      },
      {
        name: 'visibility',
        label: 'Visibility Template',
        selector: { template: {} },
        helper: 'Hide or show the indicator based on a template. The template should return true or false.',
      },
      {
        name: 'icon_template',
        label: 'Icon Template',
        selector: { template: {} },
        helper: 'Customize the icon based on a template. The template should return a valid icon name.',
      },
      {
        name: 'color',
        label: 'Color Template',
        selector: { template: {} },
        helper: 'Customize the color based on a template. The template should return a valid color name or hex code.',
      },
      {
        name: 'state_template',
        label: 'State Template',
        selector: { template: {} },
        helper: 'Customize the state based on a template. The template should return a valid state name.',
      },
    ],
  },
] as const;

export const singleActionSchema = memoizeOne(() => [
  {
    name: 'action_config',
    type: 'expandable',
    title: 'Action Configuration',
    iconPath: mdiGestureTap,
    schema: [...computeOptionalActionSchema()],
  },
]);

export const mainGroupSchema = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'name',
        label: 'Group Name',
        selector: { text: {} },
      },
      {
        name: 'icon',
        label: 'Group Icon',
        selector: { icon: {} },
      },
    ],
  },
] as const;

export const groupApparenceSchema = [
  {
    name: '',
    type: 'expandable',
    iconPath: mdiPalette,
    title: 'Appearance',
    schema: [
      {
        name: 'visibility',
        label: 'Visibility Template',
        selector: { template: {} },
        helper: 'Hide or show the indicator based on a template. The template should return true or false.',
      },
      {
        name: 'color',
        label: 'Color Template',
        selector: { template: {} },
        helper: 'Customize the color based on a template. The template should return a valid color name or hex code.',
      },
    ],
  },
] as const;

export const subGroupItemSchema = memoizeOne(
  (entity: string) =>
    [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'name',
            label: 'Item name',
            required: false,
            type: 'string',
            default: '',
          },
          ...singleIndicatorSchema(entity),
        ],
      },
      {
        name: '',
        type: 'expandable',
        title: 'Extra templates',
        schema: [
          {
            name: 'state_color',
            label: 'State Color',
            type: 'boolean',
            default: false,
            helper: 'Use the state color of the entity to color the indicator.',
          },
          {
            name: 'icon_template',
            label: 'Icon Template',
            selector: { template: {} },
            helper: 'Customize the icon based on a template. The template should return a valid icon name.',
          },
          {
            name: 'state_template',
            label: 'State Template',
            selector: { template: {} },
            helper: 'Customize the state based on a template',
          },
          {
            name: 'color',
            label: 'Color Template',
            selector: { template: {} },
          },
        ] as const,
      },
      {
        name: 'action_config',
        type: 'expandable',
        title: 'Interaction Configuration',
        iconPath: mdiGestureTap,
        schema: (['tap_action', 'hold_action', 'double_tap_action'] as const).map((action) => ({
          name: action,
          selector: {
            ui_action: {
              actions: DEFAULT_ACTIONS,
              default_action: 'none' as const,
            },
          },
        })),
      },
    ] as const
);
