import { mdiGestureTap, mdiPalette } from '@mdi/js';
import memoizeOne from 'memoize-one';

import { computeActionsFormSchema } from './actions-config';

export const singleIndicatorSchema = memoizeOne(
  (entity: string) =>
    [
      {
        name: 'entity',
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

export const singleActionSchema = [
  {
    name: 'action_config',
    type: 'expandable',
    title: 'Action Configuration',
    iconPath: mdiGestureTap,
    schema: [
      {
        name: 'entity',
        selector: { entity: {} },
        helper: 'The entity to be controlled by the action.',
      },
      ...computeActionsFormSchema(),
    ],
  },
] as const;

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
            selector: { text: {} },
          },
          ...singleIndicatorSchema(entity),
        ],
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
        helper: 'Customize the state based on a template. The template should return a valid state name.',
      },
      ...singleActionSchema,
    ] as const
);
