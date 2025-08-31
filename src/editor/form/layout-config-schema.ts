import { mdiButtonCursor, mdiListBox, mdiPalette, mdiTextShort } from '@mdi/js';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { SECTION_KEYS } from '../../types/config/card/layout';

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

        ...(!swipeDisabled
          ? [
              {
                name: 'rows',
                label: 'Rows',
                type: 'integer',
                disabled: swipeDisabled,
                selector: { number: { mode: 'box', min: 1, step: 1 } },
              },
            ]
          : []),

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
export const BUTTON_GRID_LAYOUT_SCHEMA = (swipeDisabled: boolean = false) =>
  [
    {
      title: 'Button Grid Options',
      type: 'expandable',
      flatten: true,
      iconPath: mdiButtonCursor,
      schema: BUTTON_GRID_SCHEMA(swipeDisabled),
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

export const HIDE_ELEMENT_SCHEMA = [
  {
    name: 'hide_elements',
    label: 'Hide Elements',
    selector: {
      select: {
        mode: 'dropdown',
        multiple: true,
        options: HIDE_OPTIONS.map((option) => ({
          value: option,
          label: capitalizeFirstLetter(option.replace(/_/g, ' ')),
        })),
      },
    },
  },
] as const;

export const SECTION_ORDER_SCHEMA = [
  {
    title: 'Sections Order',
    type: 'expandable',
    flatten: true,
    iconPath: mdiListBox,
    schema: [
      {
        name: 'section_order',
        label: 'Choose section to display',
        helper: 'Drag to reorder the sections as you want them to appear on the card.',
        selector: {
          select: {
            mode: 'dropdown',
            multiple: true,
            reorder: true,
            options: SECTION_KEYS.map((option) => ({
              value: option,
              label: capitalizeFirstLetter(option.replace(/_/g, ' ')),
            })),
          },
        },
      },
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

export const CARD_NAME_SCHEMA = (data: any) =>
  [
    {
      title: 'Card Name',
      type: 'expandable',
      flatten: true,
      iconPath: mdiTextShort,
      schema: [
        {
          name: 'name',
          label: 'Card Name',
          type: 'string',
          required: false,
          default: '',
        },
        {
          name: 'hide_card_name',
          label: 'Hide Card Name',
          type: 'boolean',
          default: false,
          disabled: !data?.name || data?.name === '',
        },
      ] as const,
    },
  ] as const;

export const CARD_THEME_SCHEMA = [
  {
    title: 'Theme Options',
    type: 'expandable',
    flatten: true,
    iconPath: mdiPalette,
    schema: [
      {
        name: 'theme_config',
        flatten: false,
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
            required: false,
            default: 'auto',
            selector: {
              select: {
                mode: 'dropdown',
                options: THEME_MODE_OPTIONS.map((mode) => ({
                  value: mode,
                  label: capitalizeFirstLetter(mode),
                })),
              },
            },
          },
        ],
      },
    ],
  },
] as const;

export const LAYOUT_COMBINED_SCHEMA = () => {
  return [...SECTION_ORDER_SCHEMA, ...CARD_THEME_SCHEMA] as const;
};
