import { mdiCodeJson, mdiGestureTap, mdiPalette, mdiTextShort } from '@mdi/js';

import { UiAction } from '../../ha';
import { computeOptionalActionSchemaFull } from './actions-config';

const DISPLAY_ELEMENTS = ['show_name', 'show_state', 'show_icon'] as const;

export const DISPLAY_OPTIONS_SCHEMA = (stateContentAllowed: boolean = true, entity?: string) =>
  [
    {
      type: 'expandable',
      flatten: true,
      title: 'Display Options',
      iconPath: mdiTextShort,
      schema: [
        {
          type: 'grid',
          schema: [
            ...DISPLAY_ELEMENTS.map((element) => ({
              label: element.replace(/_/g, ' '),
              name: element,
              type: 'boolean',
            })),
          ] as const,
        },
        ...(stateContentAllowed
          ? [
              {
                name: 'state_content',
                label: 'State Content',
                selector: {
                  ui_state_content: {
                    entity_id: entity,
                    allow_name: false,
                  },
                },
                context: {
                  filter_entity: entity,
                },
              },
            ]
          : []),
      ],
    },
  ] as const;
// export const DISPLAY_OPTIONS_SCHEMA = [
//   {
//     type: 'constant',
//     label: 'Display Options',
//   },
//   {
//     type: 'grid',
//     schema: [
//       ...DISPLAY_ELEMENTS.map((element) => ({
//         label: element.replace(/_/g, ' ').replace('show', ''),
//         name: element,
//         type: 'boolean',
//       })),
//     ] as const,
//   },
// ] as const;

export const ROW_NO_WRAP_SCHEMA = [
  {
    name: 'no_wrap',
    label: 'Disable Wrap',
    type: 'boolean',
    helper: 'Items will be in a single line and can be scrolled horizontally.',
    default: false,
  },
] as const;

export const ICON_SIZE_SCHEMA = (helper?: string) => {
  if (!helper) {
    helper = 'Size for all icons in the row.';
  }
  return [
    {
      name: 'icon_size',
      label: 'Icon Size (px)',
      helper: helper,
      required: false,
      default: 21,
      selector: { number: { min: 14, step: 1, mode: 'box', unit_of_measurement: 'px' } },
    },
  ] as const;
};

export const ROW_ICON_SIZE_NO_WRAP_SCHEMA = [
  {
    type: 'grid',
    flatten: true,
    schema: [...ROW_NO_WRAP_SCHEMA, ...ICON_SIZE_SCHEMA()],
  },
] as const;

interface BooleanItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  type: 'boolean';
  default: false;
}

const BaseBooleanConfig: Record<string, Partial<BooleanItem>> = {
  show_entity_picture: {
    label: 'Show Entity Picture',
  },
  column_reverse: {
    label: 'Column Reverse',
    helper: 'Reverse the order of name and state',
  },
  include_state_template: {
    label: 'Include State Template',
    helper: 'Add state template result to the state display.',
  },
};

const BOOLEAN_KEYS = Object.keys(BaseBooleanConfig) as string[];
type BooleanKey = (typeof BOOLEAN_KEYS)[number];

export const computeBooleanList = (keys?: BooleanKey[]) => {
  if (!keys) {
    keys = BOOLEAN_KEYS;
  }
  const list: BooleanItem[] = [];
  keys.forEach((key) => {
    if (BaseBooleanConfig[key]) {
      list.push({
        name: key,
        type: 'boolean',
        default: false,
        label: BaseBooleanConfig[key].label || key.replace(/_/g, ' ').replace('show', ''),
        helper: BaseBooleanConfig[key].helper || '',
      });
    }
  });
  return list;
};

export const INCLUDE_STATE_TEMPLATE_SCHEMA = [
  {
    name: 'include_state_template',
    label: 'Include State Template',
    type: 'boolean',
    helper: 'Add state template result to the state display.',
    default: false,
  },
] as const;

export const COLUMN_REVERSE_SCHEMA = [
  {
    name: 'column_reverse',
    label: 'Column Reverse',
    helper: 'Reverse the order of name and state',
    type: 'boolean',
    default: false,
  },
] as const;

export const SHOW_ENTITY_PICTURE_SCHEMA = [
  {
    name: 'show_entity_picture',
    label: 'Show Entity Picture',
    type: 'boolean',
    default: false,
  },
] as const;

export const ROW_INTERACTON_BASE_SCHEMA = [
  {
    title: 'Interactions',
    type: 'expandable',
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [...computeOptionalActionSchemaFull()],
  },
] as const;

const TEMPLATES = [
  {
    name: 'visibility',
    label: 'Visibility Template',
    helper: 'Hide or show the indicator based on a template. The template should return true or false.',
  },
  {
    name: 'state_template',
    label: 'State Template',
    helper: 'Customize the state based on a template. The template should return a valid state name.',
  },
  {
    name: 'icon_template',
    label: 'Icon Template',
    helper: 'Template to override the icon. The template should return a valid icon name.',
  },
  {
    name: 'color_template',
    label: 'Color Template',
    helper: 'Template to override the color. The template should return a valid CSS color (name, hex, rgb, hsl, etc.).',
  },
];

// eslint-disable-next-line unused-imports/no-unused-vars
const TemplateKeys = TEMPLATES.map((t) => t.name);
type TemplateKey = (typeof TemplateKeys)[number];

export const computeTemplateSchema = (type: TemplateKey) => {
  const t = TEMPLATES.find((tt) => tt.name === type);
  return [
    {
      name: type,
      label: t?.label || '',
      helper: t?.helper || '',
      selector: {
        template: {},
      },
    },
  ] as const;
};

// SINGLE ENTITY TYPE SCHEMA
export const ROW_ITEM_CONTENT_SCHEMA = () =>
  [
    {
      name: 'name',
      selector: {
        text: {},
      },
    },
    {
      name: '',
      type: 'grid',
      flatten: true,
      schema: [
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
            icon_entity: 'entity',
          },
        },
        ...ICON_SIZE_SCHEMA('Will override the row icon size for this item only.'),
        ...computeBooleanList(),
      ],
    },
  ] as const;

export const ENTITY_SINGLE_TYPE_SCHEMA = (data: any) => {
  const entity = data?.entity;
  return [
    { name: 'entity', required: true, selector: { entity: {} } },
    {
      title: 'Appearance & Content',
      type: 'expandable',
      flatten: true,
      iconPath: mdiPalette,
      schema: [...ROW_ITEM_CONTENT_SCHEMA(), ...DISPLAY_OPTIONS_SCHEMA(!!entity, entity), ...OPTIONAL_TEMPLATE_SCHEMA],
    },

    ...ROW_INTERACTON_BASE_SCHEMA,
  ] as const;
};

const groupActions: UiAction[] = ['navigate', 'url', 'perform-action', 'assist', 'none'];

export const ROW_GROUP_BASE_SCHEMA = (groupEntity?: string | undefined, isGroupEntityType: boolean = false) =>
  [
    {
      title: 'Group configuration',
      type: 'expandable',
      flatten: true,
      expanded: false,
      schema: [
        {
          name: 'name',
          label: 'Group Name',
          selector: {
            text: {},
          },
        },
        {
          name: 'entity',
          label: 'Group Entity (optional)',
          helper: 'This entity is used to fetch the state content',
          required: false,
          selector: {
            entity: {},
          },
          context: { group_entity: true },
        },
        ...(groupEntity && isGroupEntityType
          ? [
              {
                name: 'ignore_group_members',
                label: 'Ignore Group Members',
                type: 'boolean',
                helper:
                  'Do not include entities from the group entity attribute. Only use entities defined in the items.',
                default: false,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Appearance & Content',
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
              context: { icon_entity: 'entity' },
            },
            ...ICON_SIZE_SCHEMA('Will override the row icon size for this item only.'),
          ],
        },
        {
          name: '',
          type: 'grid',
          schema: [...computeBooleanList(['column_reverse', 'include_state_template'])],
        },
        ...DISPLAY_OPTIONS_SCHEMA(!!groupEntity, groupEntity),
      ],
    },
    ...OPTIONAL_TEMPLATE_SCHEMA,
    {
      title: 'Interactions',
      helper: 'Tap action is ommitted for groups, as tapping the group will expand/collapse it.',
      type: 'expandable',
      flatten: true,
      iconPath: mdiGestureTap,
      schema: [...computeOptionalActionSchemaFull(true, !groupEntity ? groupActions : undefined)],
    },
  ] as const;

export const SUBGROUP_ENTITY_SCHEMA = (data: any) => {
  const entity = data?.entity;
  return [
    { name: 'entity', selector: { entity: {} } },
    {
      name: 'name',
      selector: {
        text: {},
      },
    },
    {
      title: 'Content',
      type: 'expandable',
      flatten: true,
      iconPath: mdiTextShort,
      schema: [
        {
          name: '',
          type: 'grid',
          flatten: true,
          schema: [
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
                icon_entity: 'entity',
              },
            },
            ...computeBooleanList(),
          ],
        },
        ...DISPLAY_OPTIONS_SCHEMA(!!entity, entity),
        ...OPTIONAL_TEMPLATE_SCHEMA,
      ],
    },
  ] as const;
};

export const OPTIONAL_TEMPLATE_SCHEMA = [
  {
    title: 'Extra Templates (Advanced)',
    type: 'expandable',
    flatten: true,
    iconPath: mdiCodeJson,
    context: {
      isTemplate: true,
    },
    schema: [
      {
        type: 'optional_actions',
        flatten: true,
        context: { isTemplate: true },
        schema: TEMPLATES.map((t) => ({
          name: t.name,
          label: t.label,
          helper: t.helper,
          selector: {
            template: {},
          },
        })),
      },
    ],
  },
] as const;
