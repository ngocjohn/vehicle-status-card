import { mdiButtonCursor, mdiGestureTap, mdiPalette, mdiTextShort } from '@mdi/js';
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
const DISPLAY_ELEMENTS = ['show_primary', 'show_secondary', 'show_icon'] as const;
const BUTTON_TYPE = ['default', 'action'] as const;
const CARD_TYPE = ['default', 'custom', 'tire'] as const;
const LAYOUT = ['horizontal', 'vertical'] as const;
const PRIMARY_INFO = ['name', 'state', 'primary-template'] as const;

const BUTTON_DISPLAY_OPTS_SCHEMA = (entity?: string) => {
  return [
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
      title: 'Notification Badge (Advanced)',
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
      helper: 'Action and behavior when interacting with the button',
      schema: [
        {
          type: 'grid',
          schema: [
            {
              name: 'button_type',
              label: 'Button Type',
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
              disabled: isActionButton,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: CARD_TYPE.map((type) => ({ value: type, label: capitalize(type.replace(/_/g, ' ')) })),
                },
              },
            },
          ] as const,
        },
        ...(isActionButton ? [...computeOptionalActionSchemaFull()] : []),
      ],
    },
  ] as const;
};

const LAYOUT_SCHEMA = [
  {
    title: 'Layout & Style',
    type: 'expandable',
    flatten: true,
    icon: 'mdi:image-text',
    schema: [
      {
        name: 'transparent',
        label: 'Transparent background',
        type: 'boolean',
        default: false,
        helper: 'Use this option to make the button background transparent.',
      },
      {
        name: 'secondary_multiline',
        label: 'Allow multiline secondary content',
        type: 'boolean',
        default: false,
      },
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
  return [
    {
      title: 'Context & Identity',
      type: 'expandable',
      flatten: true,
      iconPath: mdiButtonCursor,
      schema: [
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
        {
          name: 'hide_button',
          label: 'Hide Button on Card',
          selector: { boolean: {} },
        },
      ] as const,
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
            {
              name: 'primary_info',
              label: 'Primary Information',
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
              name: 'include_state_template',
              label: 'Include State Template',
              helper: 'Extends the secondary content with the state_template',
              type: 'boolean',
              default: false,
            },
          ],
        },
        ...BUTTON_DISPLAY_OPTS_SCHEMA(data.entity),
        ...LAYOUT_SCHEMA,
        ..._generateOptionalTemplate('base'),
        ..._generateOptionalTemplate('notify'),
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
