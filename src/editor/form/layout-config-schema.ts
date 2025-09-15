import { mdiButtonCursor, mdiGestureSwipe, mdiImage, mdiListBox, mdiPalette } from '@mdi/js';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { SECTION_KEYS } from '../../types/config/card/layout';

// CARD NAME OPTIONS
export const NAME_SCHEMA = [
  {
    name: 'name',
    label: 'Card Name',
    required: false,
    type: 'string',
  },
] as const;
export const HIDE_CARD_NAME_SCHEMA = (disabled: boolean = false) => {
  return [
    {
      name: 'hide_card_name',
      label: 'Hide Card Name',
      type: 'boolean',
      default: false,
      disabled,
    },
  ] as const;
};
// SECTION ORDER
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

// BUTTON GRID SECTION
export const BUTTON_GRID_SCHEMA = (swipeDisabled: boolean = false) =>
  [
    {
      name: '',
      type: 'grid',
      flatten: true,
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

export const BUTTON_GRID_LAYOUT_SCHEMA = (swipeDisabled: boolean = false, name: string = '') =>
  [
    {
      name,
      title: 'Button Grid Options',
      type: 'expandable',
      flatten: name === '' ? true : false,
      iconPath: mdiButtonCursor,
      schema: BUTTON_GRID_SCHEMA(swipeDisabled),
    },
  ] as const;

// THEME OPTIONS
const THEME_MODE_OPTIONS = ['auto', 'light', 'dark'] as const;
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

// IMAGES SWIPE SECTION
const SWIPE_EFFECT_OPTIONS = ['slide', 'fade', 'coverflow'] as const;

export const SLIDE_SIZE_SCHEMA = [
  {
    type: 'expandable',
    title: 'Slide Size',
    helper: 'This set size for each image slide, which affects the slides per view',
    expanded: true,
    iconPath: mdiImage,
    schema: [
      {
        type: 'grid',
        flatten: true,
        schema: [
          {
            name: 'height',
            helper: 'Height of slide (px)',
            default: 150,
            selector: { number: { unit_of_measurement: 'px' } },
          },
          {
            name: 'width',
            helper: 'Width of slide (px)',
            default: 450,
            selector: { number: { unit_of_measurement: 'px' } },
          },
        ],
      },
    ],
  },
] as const;

export const SWIPE_BEHAVIOR_SCHEMA = (data: any) => {
  const isAutoplay = data?.autoplay === true;
  return [
    {
      type: 'expandable',
      title: 'Swipe Behavior',
      expanded: false,
      iconPath: mdiGestureSwipe,
      schema: [
        {
          type: 'grid',
          flatten: true,
          schema: [
            {
              name: 'effect',
              default: 'slide',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: SWIPE_EFFECT_OPTIONS.map((value) => ({
                    value,
                    label: capitalizeFirstLetter(value),
                  })),
                },
              },
            },
            {
              name: 'speed',
              label: 'Speed (ms)',
              helper: 'Transition speed between images',
              default: 500,
              selector: { number: { min: 100, mode: 'slider', step: 50, unit_of_measurement: 'ms' } },
            },
            {
              name: 'loop',
              label: 'Loop',
              default: false,
              type: 'boolean',
            },
            {
              name: 'hide_pagination',
              label: 'Hide Pagination',
              default: false,
              type: 'boolean',
            },
            {
              name: 'autoplay',
              label: 'Autoplay',
              helper: 'Automatically start sliding',
              type: 'boolean',
              default: false,
            },
            {
              name: 'delay',
              label: 'Delay (ms)',
              helper: 'Delay between transitions',
              default: 3000,
              selector: { number: { min: 500, mode: 'slider', step: 50, unit_of_measurement: 'ms' } },
              disabled: !isAutoplay,
            },
          ],
        },
      ],
    },
  ] as const;
};

export const IMAGES_LAYOUT_SCHEMA = (data: any, name: string = '') =>
  [
    {
      name,
      title: 'Images Section',
      type: 'expandable',
      flatten: name === '' ? true : false,
      iconPath: mdiImage,
      schema: [...SLIDE_SIZE_SCHEMA, ...SWIPE_BEHAVIOR_SCHEMA(data)],
    },
  ] as const;
