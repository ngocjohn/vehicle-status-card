export const BUTTON_GRID_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'swipe',
        label: 'Use swipe for buttons',
        selector: { boolean: {} },
      },
      {
        name: 'button_layout',
        label: 'Button Layout',
        default: 'horizontal',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
            ],
          },
        },
      },
      {
        name: 'rows',
        label: 'Rows',
        default: 2,
        selector: { number: { min: 1, max: 10, mode: 'box' } },
      },
      {
        name: 'columns',
        label: 'Columns',
        default: 2,
        selector: { number: { min: 1, max: 10, mode: 'box' } },
      },
    ],
  },
] as const;

const HIDE_OPTIONS = [
  'card_name',
  'indicators',
  'range_info',
  'images',
  'mini_map',
  'buttons',
  'button_notify',
] as const;

const createBooleanSelector = (name: string) => ({
  name,
  label: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  selector: { boolean: {} },
});

export const HIDE_SCHEMA = [
  {
    name: '',
    type: 'grid',
    column_min_width: '150px',
    schema: HIDE_OPTIONS.map(createBooleanSelector),
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
