import { mdiBellBadge, mdiButtonCursor, mdiCodeJson, mdiGestureTap, mdiPalette, mdiTextShort } from '@mdi/js';

import type { BaseButtonCardItemConfig } from '../../types/config';

import { computeOptionalActionSchemaFull } from './actions-config';

interface TemplateItem<T = string> {
  name: T;
  label?: string;
  helper?: string;
  selector: {
    template: {};
  };
}
const DISPLAY_ELEMENTS = ['show_name', 'show_state', 'show_icon'] as const;
const BUTTON_TYPE = ['default', 'action'] as const;
const CARD_TYPE = ['default', 'custom', 'tire'] as const;
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
      ] as const,
    },
  ] as const;
};

const TEMPLATES = [
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
  {
    name: 'notify',
    label: 'Notify Badge condition',
    helper: 'Use Jinja2 template with result `true` to display notification badge',
  },
  {
    name: 'notify_color',
    label: 'Notify Badge color',
    helper:
      'Template to override the notify badge color. The template should return a valid CSS color (name, hex, rgb, hsl, etc.).',
  },
  {
    name: 'notify_icon',
    label: 'Notify Badge icon',
    helper: 'Template to override the notify badge icon. The template should return a valid icon format.',
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
          template: {},
        },
      });
    }
  });
  return list;
};

const BASE_TEMPLATE_KEYS: TemplateKey[] = ['state_template', 'icon_template', 'color_template'];
const NOTIFY_TEMPLATE_KEYS: TemplateKey[] = ['notify', 'notify_color', 'notify_icon'];

const OPTIONAL_TEMPLATE_SCHEMA = [
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
        schema: [...computeTemplateSchema(BASE_TEMPLATE_KEYS)],
      },
    ],
  },
] as const;

const OPTIONAL_NOTIFY_SCHEMA = [
  {
    title: 'Notification Badge Templates (Advanced)',
    type: 'expandable',
    flatten: true,
    iconPath: mdiBellBadge,
    context: {
      isTemplate: true,
    },
    schema: [
      {
        type: 'optional_actions',
        flatten: true,
        context: { isTemplate: true },
        schema: [...computeTemplateSchema(NOTIFY_TEMPLATE_KEYS)],
      },
    ],
  },
] as const;

export const MAIN_BUTTON_SCHEMA = (data: BaseButtonCardItemConfig) => {
  const hasEntity = !!data?.entity;
  const isActionButton = data?.button_type === 'action';
  return [
    {
      title: 'Base configuration',
      type: 'expandable',
      flatten: true,
      iconPath: mdiButtonCursor,
      schema: [
        {
          name: 'name',
          label: 'Button Name',
          selector: { text: {} },
        },
        {
          name: 'entity',
          label: 'Entity (optional)',
          helper: 'This entity is used to fetch the state content, and interactions',
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
            ...(hasEntity
              ? [
                  {
                    name: 'show_entity_picture',
                    label: 'Show Entity Picture',
                    type: 'boolean',
                    default: false,
                  },
                ]
              : []),
            {
              name: 'include_state_template',
              label: 'Include State Template',
              helper: 'Add state template result to content',
              type: 'boolean',
              default: false,
            },
          ],
        },
        ...BUTTON_DISPLAY_OPTS_SCHEMA(data.entity),
        ...OPTIONAL_NOTIFY_SCHEMA,
        ...OPTIONAL_TEMPLATE_SCHEMA,
      ] as const,
    },
    {
      title: 'Interactions',
      type: 'expandable',
      flatten: true,
      iconPath: mdiGestureTap,
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
                  options: BUTTON_TYPE.map((type) => ({ value: type, label: type.replace(/_/g, ' ') })),
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
                  options: CARD_TYPE.map((type) => ({ value: type, label: type.replace(/_/g, ' ') })),
                },
              },
            },
          ] as const,
        },
        ...(isActionButton ? [...computeOptionalActionSchemaFull()] : []),
      ] as const,
    },
  ];
};
