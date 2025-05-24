import { mdiGestureTap, mdiPalette } from '@mdi/js';
import memoizeOne from 'memoize-one';

import { CARD_TYPES, BUTTON_TYPE } from '../editor-const';
import { computeActionsFormSchema } from './actions-config';

export const BASE_BUTTON_SCHEMA = memoizeOne(
  (typeDisabled: boolean) =>
    [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'button_type',
            label: 'Button Type',
            default: 'default',
            selector: {
              select: {
                mode: 'dropdown',
                options: BUTTON_TYPE,
              },
            },
          },
          {
            name: 'card_type',
            label: 'Card Type',
            default: 'default',
            disabled: typeDisabled,
            selector: {
              select: {
                mode: 'dropdown',
                options: CARD_TYPES,
              },
            },
          },
        ],
      },
    ] as const
);

export const BASE_BUTTON_APPEARANCE_SCHEMA = memoizeOne(
  (secondEntity: string) =>
    [
      {
        name: 'button',
        type: 'expandable',
        iconPath: mdiPalette,
        title: 'Button Appearance',
        schema: [
          {
            name: '',
            type: 'grid',
            schema: [
              {
                name: 'primary',
                label: 'Primary title',
                selector: { text: { type: 'text' } },
              },
              {
                name: 'icon',
                label: 'Icon',
                selector: { icon: {} },
              },
            ],
          },
          {
            name: 'picture_template',
            label: 'Picture & Icon template',
            helper:
              'Result starts with `http` or "/" will be treated as image URL, otherwise as icon. (this change picked icon)',
            selector: { template: {} },
          },
          {
            name: 'notify',
            label: 'Notification template',
            helper: 'Use Jinja2 template with result `true` to display notification badge',
            selector: { template: {} },
          },
          {
            name: 'color',
            label: 'Color template',
            helper: 'Template for the icon color',
            selector: { template: {} },
          },
          {
            name: 'secondary',
            type: 'expandable',
            title: 'Secondary Info',
            schema: [
              {
                name: 'entity',
                selector: { entity: {} },
              },
              {
                name: 'attribute',
                label: 'Attribute',
                selector: { attribute: { entity_id: secondEntity } },
              },
              {
                name: 'state_template',
                label: 'State template',
                helper: 'Template for the secondary info state',
                selector: { template: {} },
              },
            ],
          },
        ],
      },
    ] as const
);

export const BASE_BUTTON_ACTION_SCHEMA = [
  {
    name: 'button_action',
    type: 'expandable',
    iconPath: mdiGestureTap,
    title: 'Interaction',
    schema: [
      {
        name: 'entity',
        selector: { entity: {} },
        helper: 'Entity to control when the button is pressed',
      },
      ...computeActionsFormSchema(),
    ],
  },
] as const;
