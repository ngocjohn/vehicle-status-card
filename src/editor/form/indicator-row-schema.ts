import { mdiCodeJson, mdiDotsHexagon, mdiGestureTap, mdiPalette, mdiTextShort } from '@mdi/js';

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

export const ROW_NO_WRAP_SCHEMA = [
  {
    name: 'no_wrap',
    label: 'Disable Wrap',
    type: 'boolean',
    helper: 'Items will be in a single line and can be scrolled horizontally.',
    default: false,
  },
] as const;

export const ICON_SIZE_SCHEMA = [
  {
    name: 'icon_size',
    label: 'Icon Size (px)',
    required: false,
    default: 21,
    selector: { number: { min: 14, step: 1, mode: 'box', unit_of_measurement: 'px' } },
  },
] as const;
// export const ICON_SIZE_SCHEMA = (helper?: string) => {
//   if (!helper) {
//     helper = 'Size for all icons in the row.';
//   }
//   return [
//     {
//       name: 'icon_size',
//       label: 'Icon Size (px)',
//       helper: helper,
//       required: false,
//       default: 21,
//       selector: { number: { min: 14, step: 1, mode: 'box', unit_of_measurement: 'px' } },
//     },
//   ] as const;
// };

export interface BooleanItemSchema {
  type: 'boolean';
  name: string;
  label?: string;
  helper?: string;
  default?: boolean;
}

interface BooleanItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  type: 'boolean';
  default?: boolean;
}

interface TemplateItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  selector: {
    template: {};
  };
}

const BaseBooleanConfig: Record<string, Partial<BooleanItem>> = {
  ignore_global: {
    label: 'Ignore Global Config',
    helper: 'Ignore global appearance configuration for this item.',
  },
  show_entity_picture: {
    label: 'Show Entity Picture',
  },
  column_reverse: {
    label: 'Column Reverse',
    helper: 'Reverse the order of name and state',
  },
  row_reverse: {
    label: 'Row Reverse',
    helper: 'Reverse the order of icon and content',
  },
  include_state_template: {
    label: 'Include State Template',
    helper: 'Add state template result to content',
  },
};

const GlobalBooleanConfig: Record<string, Partial<BooleanItem>> = {
  global_column_reverse: {
    label: 'Global Column Reverse',
    helper: 'Reverse the order of name and state for all items in the row',
  },
  global_row_reverse: {
    label: 'Global Row Reverse',
    helper: 'Reverse the order of icon and content for all items in the row',
  },
};

const COMBINED_BOOLEAN_CONFIG = { ...BaseBooleanConfig, ...GlobalBooleanConfig };

const SINGLE_BOOLEAN_KEYS = [
  'ignore_global',
  'show_entity_picture',
  'column_reverse',
  'row_reverse',
  'include_state_template',
] as const;
export const GLOBAL_BOOLEAN_KEYS = [...Object.keys(GlobalBooleanConfig)] as string[];

const BOOLEAN_KEYS = [...SINGLE_BOOLEAN_KEYS, ...GLOBAL_BOOLEAN_KEYS];

// eslint-disable-next-line unused-imports/no-unused-vars
const BooleanTypes = [...BOOLEAN_KEYS] as const;
type BooleanKey = (typeof BooleanTypes)[number];

const DEFAULT_BOLEAN_CONFIG = [
  ...BOOLEAN_KEYS.map((key) => ({
    name: key,
    type: 'boolean',
    default: false,
    ...(COMBINED_BOOLEAN_CONFIG[key] || {}),
  })),
] as BooleanItemSchema[];

export const createBooleanSchema = (overrides?: Partial<BooleanItemSchema>[]): BooleanItemSchema[] => {
  const defaultConfig = DEFAULT_BOLEAN_CONFIG;

  if (!overrides) {
    return defaultConfig;
  }
  const merged = defaultConfig.map((item) => {
    const override = overrides.find((o) => o.name === item.name);
    if (override) {
      return { ...item, ...override };
    }
    return item;
  });
  // Add any additional items that are not in the default list
  overrides.forEach((override) => {
    if (!merged.find((m) => m.name === override.name)) {
      merged.push(override as BooleanItemSchema);
    }
  });
  return merged;
};

export const computeBooleanSchema = (keys: BooleanKey[]): BooleanItemSchema[] => {
  return createBooleanSchema().filter((item) => keys.includes(item.name as BooleanKey));
};

export const computeBooleanList = (keys?: BooleanKey[]) => {
  if (!keys) {
    keys = BOOLEAN_KEYS;
  }
  const baseConfig = { ...BaseBooleanConfig, ...GlobalBooleanConfig };
  const list: BooleanItem[] = [];
  keys.forEach((key) => {
    if (baseConfig[key]) {
      list.push({
        name: key,
        type: 'boolean',
        default: false,
        label: baseConfig[key].label || key.replace(/_/g, ' ').replace('show', ''),
        helper: baseConfig[key].helper || '',
      });
    }
  });
  return list;
};

export const ROW_ICON_SIZE_NO_WRAP_SCHEMA = [
  {
    title: 'Global Appearance (optional)',
    type: 'expandable',
    iconPath: mdiPalette,
    helper: 'These options affect all items, unless overridden on the item itself.',
    flatten: true,
    schema: [
      {
        type: 'grid',
        schema: [
          {
            name: 'global_icon_size',
            label: 'Icon Size (px)',
            helper: 'Size for all icons in the row.',
            required: false,
            default: 21,
            selector: { number: { min: 14, step: 1, mode: 'box', unit_of_measurement: 'px' } },
          },
          ,
          ...computeBooleanSchema(GLOBAL_BOOLEAN_KEYS as BooleanKey[]),
        ],
      },
    ],
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

const TemplateKeys = TEMPLATES.map((t) => t.name);
type TemplateKey = (typeof TemplateKeys)[number];

export const computeTemplateSchema = (type?: TemplateKey[]) => {
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
          template: {},
        },
      });
    }
  });
  return list;
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
        ...ICON_SIZE_SCHEMA,
        ...computeBooleanSchema([...SINGLE_BOOLEAN_KEYS]),
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

export const ROW_GROUP_BASE_SCHEMA = (groupEntity?: string | undefined, isGroupEntityType: boolean = false) =>
  [
    {
      title: 'Group configuration',
      type: 'expandable',
      flatten: true,
      expanded: false,
      iconPath: mdiDotsHexagon,
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
            ...ICON_SIZE_SCHEMA,
          ],
        },
        {
          name: '',
          type: 'grid',
          schema: [
            ...computeBooleanSchema(['ignore_global', 'column_reverse', 'row_reverse', 'include_state_template']),
          ],
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
      schema: [...computeOptionalActionSchemaFull(!!groupEntity)],
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
            ...computeBooleanSchema([...SINGLE_BOOLEAN_KEYS]),
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
        schema: [...computeTemplateSchema()],
      },
    ],
  },
] as const;
