import { mdiButtonCursor, mdiGestureTap, mdiPalette } from '@mdi/js';
import { capitalize } from 'es-toolkit';

import type { BaseButtonCardItemConfig } from '../../types/config';

import { computeIconActionSchema, computeOptionalActionSchemaFull } from './actions-config';

interface TemplateItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  selector: {
    template: {};
  };
}

interface BooleanItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  default?: boolean;
  type: 'boolean';
}

const BUTTON_TYPE = ['default', 'action'] as const;
const CARD_TYPE = ['default', 'custom', 'tire'] as const;
const LAYOUT = ['horizontal', 'vertical'] as const;
const PRIMARY_INFO = ['name', 'state', 'primary-template'] as const;
const ICON_TYPE = ['icon', 'entity-picture', 'icon-template'] as const;

const BOOLEANS = [
  {
    name: 'show_primary',
    label: 'Show Primary Info',
  },
  {
    name: 'show_secondary',
    label: 'Show Secondary Info',
  },
  {
    name: 'show_icon',
    label: 'Show Icon',
  },
  {
    name: 'state_color',
    label: 'State Color',
    helper: 'Applies the color to icon background when available',
    default: false,
  },
  {
    name: 'include_state_template',
    label: 'Include State Template',
    helper: 'Extends the secondary content with the state_template',
  },
  {
    name: 'transparent',
    label: 'Transparent background',
    helper: 'Use this option to make the button background transparent.',
  },
  {
    name: 'secondary_multiline',
    label: 'Allow multiline secondary content',
    helper: 'Allows the secondary content to span multiple lines if needed.',
  },
  {
    name: 'hide_button',
    label: 'Hide Button on Card',
    helper: 'Hides the button from being displayed on the card.',
  },
];
const computeBooleanSchema = (type?: BooleanItem['name'][]) => {
  if (!type) {
    type = BOOLEANS.map((b) => b.name);
  }
  const list: BooleanItem[] = [];
  type.forEach((key) => {
    const b = BOOLEANS.find((bb) => bb.name === key);
    if (b) {
      list.push({
        name: b.name,
        label: b.label,
        helper: b.helper,
        default: b.default,
        type: 'boolean',
      });
    }
  });
  return list;
};

const TEMPLATES = [
  {
    name: 'primary_template',
    label: 'Primary Label Template',
    helper: 'Template for the primary label. Overrides the primary label content.',
  },
  {
    name: 'state_template',
    label: 'Secondary State Template',
    helper: 'Additional template to extend secondary state content.',
  },
  {
    name: 'icon_template',
    label: 'Icon Template',
    helper: 'Template to override the icon. The template should return a valid icon name.',
  },
  {
    name: 'color_template',
    label: 'Icon Color Template',
    helper:
      'Template to override the color to the icon. The template should return a valid CSS color (name, hex, rgb, hsl, etc.).',
  },
] as const;

const BADGE_TEMPLATES = [
  {
    name: 'notify',
    label: 'Badge visibility',
    helper: 'Use Jinja2 template with result `true` to display notification badge',
  },
  {
    name: 'notify_color',
    label: 'Badge color',
    helper: 'Color applied to the badge. Supports Templating or CSS color formats',
  },
  {
    name: 'notify_icon',
    label: 'Badge icon',
    helper: 'Icon displayed as a badge. Supports Templating',
  },
  {
    name: 'notify_text',
    label: 'Badge text (replace icon)',
    helper: 'Text displayed inside the badge. Supports Templating',
  },
] as const;

const TEMPLATES_ALL = [...TEMPLATES, ...BADGE_TEMPLATES];

const TemplateKeys = TEMPLATES_ALL.map((t) => t.name);

type TemplateKey = (typeof TemplateKeys)[number];

const computeTemplateSchema = (type?: TemplateKey[]) => {
  if (!type) {
    type = TemplateKeys;
  }
  const list: TemplateItem[] = [];
  type.forEach((key) => {
    const t = TEMPLATES_ALL.find((tt) => tt.name === key);
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

const BASE_TEMPLATE_KEYS: TemplateKey[] = ['primary_template', 'state_template', 'icon_template', 'color_template'];
const NOTIFY_TEMPLATE_KEYS: TemplateKey[] = ['notify', 'notify_color', 'notify_icon', 'notify_text'];

const _generateOptionalTemplate = (type: 'base' | 'notify') => {
  const schemaObj = {
    base: {
      title: 'Extra Templates (Advanced)',
      icon: 'mdi:code-block-braces',
      keys: BASE_TEMPLATE_KEYS,
    },
    notify: {
      title: 'Badge',
      icon: 'mdi:square-rounded-badge',
      keys: NOTIFY_TEMPLATE_KEYS,
    },
  };
  const obj = schemaObj[type];
  return [
    {
      title: obj.title,
      type: 'expandable',
      flatten: true,
      icon: obj.icon,
      context: {
        isTemplate: true,
      },
      schema: [
        {
          type: 'optional_actions',
          flatten: true,
          context: { isTemplate: true },
          schema: [...computeTemplateSchema(obj.keys)],
        },
      ],
    },
  ] as const;
};

const BUTTON_BEHAVIOR_SCHEMA = (isActionButton: boolean) => {
  return [
    {
      title: 'Button Behavior',
      type: 'expandable',
      flatten: true,
      icon: 'mdi:gesture-tap-button',
      helper:
        'Tap action is ommitted when button type is "default", as tapping will open subcard. Other actions will still apply.',
      schema: [
        {
          type: 'grid',
          schema: [
            {
              name: 'button_type',
              label: 'Button Type',
              default: 'default',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: BUTTON_TYPE.map((type) => ({ value: type, label: capitalize(type.replace(/_/g, ' ')) })),
                },
              },
            },
            {
              name: 'card_type',
              label: 'Card Type',
              default: 'default',
              disabled: isActionButton,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: CARD_TYPE.map((type) => ({
                    value: type,
                    label: capitalize(type.replace(/_/g, ' ') + ' card'),
                  })),
                },
              },
            },
          ] as const,
        },
        // ...(isActionButton ? [...computeOptionalActionSchemaFull()] : []),
        ...computeOptionalActionSchemaFull(!isActionButton),
      ],
    },
  ] as const;
};

const ICON_COLOR_SCHEMA = [
  {
    title: 'Icon & Color',
    type: 'expandable',
    flatten: true,
    icon: 'mdi:emoticon-happy',
    context: {
      isTemplate: true,
    },
    schema: [
      ...computeBooleanSchema(['show_icon']),
      {
        type: 'grid',
        schema: [
          {
            name: 'color',
            selector: {
              ui_color: {
                default_color: 'none',
                include_none: true,
                include_state: true,
              },
            },
          },
          ...computeBooleanSchema(['state_color']),
          {
            name: 'icon',
            selector: {
              icon: {},
            },
            context: { icon_entity: 'entity' },
          },
          {
            name: 'icon_type',
            label: 'Icon Type',
            helper: 'Determines how the icon is generated and displayed. (default: icon)',
            required: false,
            default: 'icon',
            selector: {
              select: {
                mode: 'dropdown',
                options: ICON_TYPE.map((type) => ({
                  value: type,
                  label: capitalize(type.replace(/_/g, ' ')),
                })),
              },
            },
          },
        ],
      },

      {
        type: 'optional_actions',
        flatten: true,
        context: { isTemplate: true },
        schema: [...computeTemplateSchema(['icon_template', 'color_template'])],
      },
    ] as const,
  },
] as const;

const PRIMARY_INFO_SCHEMA = [
  {
    title: 'Primary Information',
    type: 'expandable',
    flatten: true,
    icon: 'mdi:format-text',
    context: {
      isTemplate: true,
    },
    schema: [
      ...computeBooleanSchema(['show_primary']),
      {
        name: 'primary_info',
        label: 'Primary Information',
        helper: 'Choose type of content to display as primary information (default: Name)',
        required: false,
        default: 'name',
        selector: {
          select: {
            mode: 'dropdown',
            options: PRIMARY_INFO.map((type) => ({
              value: type,
              label: capitalize(type.replace(/_/g, ' ')),
            })),
          },
        },
      },
      {
        type: 'optional_actions',
        flatten: true,
        context: { isTemplate: true },
        schema: [...computeTemplateSchema(['primary_template'])],
      },
    ] as const,
  },
] as const;

const SECONDARY_INFO_SCHEMA = (entity?: string) =>
  [
    {
      title: 'Secondary Information',
      type: 'expandable',
      flatten: true,
      icon: 'mdi:format-text-variant',
      context: {
        isTemplate: true,
      },
      schema: [
        ...computeBooleanSchema(['show_secondary', 'include_state_template']),
        ...(!!entity
          ? [
              {
                name: 'state_content',
                label: 'Secondary State Content',
                helper:
                  'Additional content to display in the secondary state area. Select from available attributes and options.',
                selector: {
                  ui_state_content: {
                    entity_id: entity,
                    allow_name: true,
                  },
                },
                context: {
                  filter_entity: entity,
                },
              },
            ]
          : []),
      ] as const,
    },
  ] as const;

const LAYOUT_SCHEMA = [
  {
    title: 'Layout & Style',
    type: 'expandable',
    flatten: true,
    icon: 'mdi:image-text',
    schema: [
      ...computeBooleanSchema(['transparent', 'secondary_multiline']),
      {
        name: 'layout',
        label: 'Button Layout',
        required: true,
        selector: {
          select: {
            mode: 'box',
            options: LAYOUT.map((value) => ({
              label: capitalize(value),
              value,
              image: {
                src: `/static/images/form/tile_content_layout_${value}.svg`,
                src_dark: `/static/images/form/tile_content_layout_${value}_dark.svg`,
                flip_rtl: true,
              },
            })),
          },
        },
      },
    ] as const,
  },
] as const;

export const MAIN_BUTTON_SCHEMA = (data: BaseButtonCardItemConfig) => {
  const isActionButton = data?.button_type === 'action';
  const entity = data?.entity;
  return [
    {
      title: 'Context & Identity',
      type: 'expandable',
      flatten: true,
      iconPath: mdiButtonCursor,
      schema: [
        ...computeBooleanSchema(['hide_button']),

        {
          name: 'name',
          label: 'Name (optional)',
          required: false,
          selector: { text: {} },
        },
        {
          name: 'entity',
          label: 'Entity (optional)',
          helper: 'Entity used for templating, actions, and state display',
          required: false,
          selector: {
            entity: {},
          },
          context: { group_entity: true },
        },
      ] as const,
    },
    {
      title: 'Appearance & Content',
      type: 'expandable',
      flatten: true,
      iconPath: mdiPalette,
      headingLevel: 2,
      schema: [
        ...ICON_COLOR_SCHEMA,
        ...PRIMARY_INFO_SCHEMA,
        ...SECONDARY_INFO_SCHEMA(entity),
        ..._generateOptionalTemplate('notify'),
        ...LAYOUT_SCHEMA,
      ] as const,
    },
    {
      title: 'Interactions',
      type: 'expandable',
      flatten: true,
      iconPath: mdiGestureTap,
      schema: [
        ...BUTTON_BEHAVIOR_SCHEMA(isActionButton),
        {
          title: 'Icon Interactions',
          type: 'expandable',
          flatten: true,
          icon: 'mdi:gesture-tap-hold',
          helper: 'Action and behavior when interacting with the icon',
          schema: [...computeIconActionSchema()] as const,
        },
      ] as const,
    },
  ] as const;
};
