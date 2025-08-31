import { mdiGestureTap, mdiPalette, mdiTextShort } from '@mdi/js';

import { UiAction } from '../../ha';
import { computeOptionalActionSchemaFull } from './actions-config';

const DISPLAY_ELEMENTS = ['show_name', 'show_state', 'show_icon', 'include_state_template'] as const;

export const ROW_NO_WRAP_SCHEMA = [
  {
    name: 'no_wrap',
    label: 'Disable Wrap',
    type: 'boolean',
    helper: 'Disable wrapping of items. Items will be in a single line and can be scrolled horizontally.',
    default: false,
  },
] as const;

export const ROW_ENTITY_SCHEMA = [{ name: 'entity', required: true, selector: { entity: {} } }];

export const ROW_INTERACTON_BASE_SCHEMA = [
  {
    title: 'Interactions',
    type: 'expandable',
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [...computeOptionalActionSchemaFull()],
  },
] as const;

export const ROW_ITEM_CONTENT_SCHEMA = (entityId?: string) =>
  [
    {
      name: '',
      type: 'grid',
      flatten: true,
      schema: [
        {
          name: 'name',
          selector: {
            text: {},
          },
        },
        {
          name: 'color',
          selector: {
            ui_color: {
              default_color: 'state',
              include_state: true,
            },
          },
        },
        {
          name: 'icon',
          selector: {
            icon: {},
          },
          context: {
            icon_entity: entityId,
          },
        },
        {
          name: 'show_entity_picture',
          label: 'Show Entity Picture',
          selector: {
            boolean: {},
          },
        },
      ],
    },
    {
      type: 'constant',
      label: 'Display Options',
    },
    {
      type: 'grid',
      schema: [
        ...DISPLAY_ELEMENTS.map((element) => ({
          label: element.replace(/_/g, ' ').replace('show', ''),
          name: element,
          type: 'boolean',
          default: ['show_state', 'show_icon'].includes(element) ? true : false,
        })),
      ],
    },
  ] as const;

export const ROW_ENTITY_ITEM_SCHEMA = [
  { name: 'entity', selector: { entity: {} } },
  {
    title: 'Content',
    type: 'expandable',
    flatten: true,
    iconPath: mdiTextShort,
    schema: [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'name',
            selector: {
              text: {},
            },
          },
          {
            name: 'color',
            selector: {
              ui_color: {
                default_color: 'state',
                include_state: true,
              },
            },
          },
          {
            name: 'icon',
            selector: {
              icon: {},
            },
            context: { icon_entity: 'entity' },
          },
          {
            name: 'show_entity_picture',
            label: 'Show Entity Picture',
            selector: {
              boolean: {},
            },
          },
          {
            name: 'Display Options',
            flatten: true,
            type: 'grid',
            schema: [
              ...DISPLAY_ELEMENTS.filter((el) => el !== 'include_state_template').map((element) => ({
                label: element.replace(/_/g, ' ').replace('show', ' '),
                name: element,
                type: 'boolean',
                default: ['show_state', 'show_icon'].includes(element) ? true : false,
              })),
            ],
          },
        ],
      },
      {
        name: 'state_content',
        selector: {
          ui_state_content: {
            allow_name: true,
          },
        },
        context: {
          filter_entity: 'entity',
        },
      },
    ],
  },
] as const;

const groupActions: UiAction[] = ['navigate', 'url', 'perform-action', 'assist', 'none'];

export const ROW_GROUP_BASE_SCHEMA = (groupEntity?: string | undefined) =>
  [
    {
      name: 'name',
      label: 'Group Name',
      selector: {
        text: {},
      },
    },
    {
      name: 'entity',
      helper: 'Group Entity (optional)',
      selector: {
        entity: { filter: { integration: 'group' } },
      },
    },
    {
      title: 'Appearance',
      type: 'expandable',
      flatten: true,
      iconPath: mdiPalette,
      schema: [
        {
          name: '',
          type: 'grid',
          schema: [
            {
              name: 'color',
              selector: {
                ui_color: {
                  include_state: false,
                },
              },
            },
            {
              name: 'icon',
              selector: {
                icon: {},
              },
              context: { icon_entity: groupEntity },
            },
          ],
        },
        ...(groupEntity && groupEntity
          ? [
              {
                flatten: true,
                type: 'grid',
                schema: [
                  ...DISPLAY_ELEMENTS.map((element) => ({
                    label: element.replace(/_/g, ' ').replace('show', ''),
                    name: element,
                    type: 'boolean',
                    default: ['show_state', 'show_icon'].includes(element) ? true : false,
                  })),
                ],
              },
              {
                name: 'state_content',
                label: 'State Content',
                selector: {
                  ui_state_content: {
                    entity_id: groupEntity,
                    allow_name: true,
                  },
                },
              },
            ]
          : []),
      ],
    },
    {
      title: 'Interactions',
      helper: 'Tap action is ommitted for groups, as tapping the group will expand/collapse it.',
      type: 'expandable',
      flatten: true,
      iconPath: mdiGestureTap,
      schema: [...computeOptionalActionSchemaFull(true, !groupEntity ? groupActions : undefined)],
    },
    ...ROW_ITEM_TEMPATE_SCHEMA,
  ] as const;

export const ROW_GROUP_INTERACTION_SCHEMA = [
  {
    title: 'Interactions',
    helper: 'Tap action is ommitted for groups, as tapping the group will expand/collapse it.',
    type: 'expandable',
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [...computeOptionalActionSchemaFull(true, groupActions)],
  },
] as const;

export const ROW_ITEM_TEMPATE_SCHEMA = [
  {
    title: 'Extra Templates (Advanced)',
    type: 'expandable',
    flatten: true,
    iconPath: mdiTextShort,
    schema: [
      {
        name: 'visibility',
        label: 'Visibility Template',
        helper: 'Hide or show the indicator based on a template. The template should return true or false.',
        selector: {
          template: {},
        },
      },
      {
        name: 'state_template',
        label: 'State Template',
        helper: 'Customize the state based on a template. The template should return a valid state name.',
        selector: {
          template: {},
        },
      },
    ],
  },
] as const;
