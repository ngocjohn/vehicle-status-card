import { mdiGestureSwipe, mdiImage } from '@mdi/js';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';

export const ImageSchema = [
  {
    name: 'image',
    required: false,
    selector: { image: { original: true } },
  },
  {
    name: 'image_entity',
    required: false,
    selector: { entity: { domain: 'image' } },
  },
  {
    name: 'title',
    required: false,
    selector: { text: {} },
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
