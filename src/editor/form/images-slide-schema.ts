export const IMAGES_SLIDE_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'max_height',
        label: 'Max Height',
        default: 150,
        selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } },
      },
      {
        name: 'max_width',
        label: 'Max Width',
        default: 450,
        selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } },
      },
      {
        name: 'delay',
        label: 'Delay (ms)',
        default: 3000,
        selector: { number: { min: 500, max: 10000, mode: 'slider', step: 50 } },
      },
      {
        name: 'speed',
        label: 'Speed (ms)',
        default: 500,
        selector: { number: { min: 100, max: 2000, mode: 'slider', step: 50 } },
      },
      {
        name: 'effect',
        label: 'Effect',
        default: 'slide',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'slide', label: 'Slide' },
              { value: 'fade', label: 'Fade' },
              { value: 'coverflow', label: 'Coverflow' },
            ],
          },
        },
      },
      {
        name: 'autoplay',
        label: 'Autoplay',
        default: false,
        type: 'boolean',
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
    ],
  },
] as const;
