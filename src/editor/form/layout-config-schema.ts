export const BUTTON_GRID_SCHEMA = (swipeDisabled: boolean = false) =>
  [
    {
      name: '',
      type: 'grid',
      column_min_width: '140px',
      schema: [
        {
          name: 'swipe',
          label: 'Use swipe',
          type: 'boolean',
          default: false,
        },

        {
          name: 'rows',
          label: 'Rows',
          type: 'integer',
          disabled: swipeDisabled,
          selector: { number: { mode: 'box', min: 1, step: 1 } },
        },
        {
          name: 'columns',
          label: 'Columns',
          type: 'integer',
          selector: { number: { mode: 'box', min: 1, step: 1 } },
        },
      ],
    },
    {
      name: 'transparent',
      label: 'Transparent background',
      type: 'boolean',
      default: false,
      helper: 'Use this option to make the button background transparent.',
    },
    {
      name: 'hide_notify_badge',
      label: 'Hide notify badge',
      type: 'boolean',
      default: false,
      helper: 'Use this option to hide the notification badge on the button.',
    },
    {
      name: 'button_layout',
      label: 'Button layout',
      required: true,
      default: 'horizontal',
      selector: {
        select: {
          mode: 'box',
          options: ['horizontal', 'vertical'].map((value) => ({
            label: value.charAt(0).toUpperCase() + value.slice(1),
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
  ] as const;

const HIDE_OPTIONS = ['card_name', 'indicators', 'range_info', 'images', 'mini_map', 'buttons'] as const;

export const HIDE_SCHEMA = [
  {
    name: '',
    type: 'grid',
    column_min_width: '140px',
    schema: [
      ...HIDE_OPTIONS.map((option) => ({
        label: option.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        name: option,
        type: 'boolean',
        default: false,
      })),
    ],
  },
] as const;

const THEME_MODE_OPTIONS = ['auto', 'light', 'dark'] as const;

export const THEME_CONFIG_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'theme',
        label: 'Theme',
        default: 'default',
        required: false,
        selector: { theme: { include_default: true } },
      },
      {
        name: 'mode',
        label: 'Theme Mode',
        default: 'auto',
        selector: {
          select: {
            mode: 'dropdown',
            options: THEME_MODE_OPTIONS.map((mode) => ({
              value: mode,
              label: mode.charAt(0).toUpperCase() + mode.slice(1),
            })),
          },
        },
      },
    ],
  },
] as const;

export const NAME_SCHEMA = [
  {
    name: 'name',
    label: 'Card Name',
    required: false,
    type: 'string',
  },
] as const;
