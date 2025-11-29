import memoizeOne from 'memoize-one';

import { TireEntityConfig, TireTemplateConfig } from '../../types/config';

const DEFAULT_TIRE_ENTITY: TireEntityConfig = {
  entity: '',
  attribute: '',
  name: '',
  color: '',
};

export const DEFAULT_LAYOUT = {
  horizontal: false,
  hide_rotation_button: false,
  image_size: 100,
  value_size: 100,
  top: 50,
  left: 50,
  aspect_ratio: '1/1',
};
export const DEFAULT_TIRE_CONFIG: TireTemplateConfig = {
  title: '',
  background: '',
  front_left: DEFAULT_TIRE_ENTITY,
  front_right: DEFAULT_TIRE_ENTITY,
  rear_left: DEFAULT_TIRE_ENTITY,
  rear_right: DEFAULT_TIRE_ENTITY,
  ...DEFAULT_LAYOUT,
};

const DIMENSION_SCHEMA = (isHorizontal: boolean) => {
  return [
    {
      name: '',
      flatten: true,
      type: 'grid',
      schema: [
        {
          name: 'image_size',
          label: 'Base image size scale (%)',
          selector: { number: { max: 200, min: 0, mode: 'slider', step: 1 } },
          default: 100,
        },
        {
          name: 'value_size',
          label: 'Name/Value scale size (%)',
          selector: { number: { max: 150, min: 50, mode: 'slider', step: 1 } },
          default: 100,
        },
        {
          name: 'top',
          label: `${!isHorizontal ? 'Top' : 'Left'} position`,
          default: 50,
          selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } },
        },
        {
          name: 'left',
          label: `${!isHorizontal ? 'Left' : 'Top'} position`,
          default: 50,
          selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } },
        },
      ],
    },
  ] as const;
};

export const TIRE_APPEARANCE_SCHEMA = memoizeOne(
  (isHorizontal: boolean) =>
    [
      {
        name: 'title',
        label: 'Card Title',
        required: false,
        selector: { text: { type: 'text' } },
      },
      {
        name: '',
        flatten: true,
        type: 'grid',
        schema: [
          {
            name: 'horizontal',
            label: 'Horizontal',
            default: false,
            selector: { boolean: {} },
          },
          {
            name: 'hide_rotation_button',
            label: 'Hide rotation button',
            default: false,
            selector: { boolean: {} },
          },
          {
            name: 'aspect_ratio',
            label: 'Aspect Ratio',
            selector: { text: { type: 'text' } },
            default: '1/1',
          },
        ],
      },
      ...DIMENSION_SCHEMA(isHorizontal),
    ] as const
);

export const TIRE_BACKGROUND_SCHEMA = [
  {
    name: 'background',
    label: 'Background image',
    selector: {
      media: {
        accept: ['image/*'] as string[],
        clearable: true,
        image_upload: true,
        hide_content_type: false,
      },
    },
    helper:
      'The image should be square with a maximum resolution of 450x450 pixels. A transparent background is recommended.',
  },
  {
    name: 'background_entity',
    label: 'Background entity',
    selector: { entity: { domain: ['image'] } },
    helper: 'If set, the background image will be taken from this entity.',
  },
] as const;

export const TIRE_CUSTOM_POSITION_SCHEMA = (useCustomPosition: boolean = false, isHorizontal: boolean = false) => {
  return [
    {
      type: 'expandable',
      label: 'Custom Position',
      flatten: true,
      schema: [
        {
          name: 'use_custom_position',
          label: 'Use Custom Position',
          type: 'boolean',
          default: false,
          helper: 'Enable to set a custom position for this tire item.',
        },
        {
          name: 'position',
          label: 'Position (%)',
          type: 'grid',
          flatten: false,
          disabled: !useCustomPosition,
          schema: [
            {
              name: 'top',
              label: `${!isHorizontal ? 'Top' : 'Left'} (%)`,
              type: 'float',
            },
            {
              name: 'left',
              label: `${!isHorizontal ? 'Left' : 'Top'} (%)`,
              type: 'float',
            },
          ],
        },
      ],
    },
  ];
};
export const TIRE_ENTITY_SCHEMA = memoizeOne(
  (tirePosition: string, tireEntity: string, useCustomPosition: boolean = false, isHorizontal: boolean = false) => {
    const tireLabel = tirePosition.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return [
      {
        name: tirePosition,
        type: 'expandable',
        flatten: false,
        label: tireLabel,
        schema: [
          {
            name: 'entity',
            label: 'Entity',
            selector: { entity: {} },
          },
          {
            name: 'attribute',
            label: 'Attribute',
            selector: { attribute: { entity_id: tireEntity } },
          },
          {
            name: 'name',
            label: 'Name',
            selector: { text: { type: 'text' } },
            default: tireLabel,
            helper: 'Name of the tire',
          },
          {
            name: 'color',
            label: 'Color Template for value',
            selector: { template: {} },
            helper:
              'Customize the color based on a template. The template should return a valid color name or hex code.',
          },
          ...TIRE_CUSTOM_POSITION_SCHEMA(useCustomPosition, isHorizontal),
        ],
      },
    ] as const;
  }
);

export const SINGLE_TIRE_ENABLED_SCHEMA = [
  {
    name: 'single_tire_card',
    type: 'grid',
    flatten: false,
    schema: [
      {
        name: 'enabled',
        label: 'Enable Standalone Tire Card',
        helper: 'If enabled, the tire card will be displayed as a single card.',
        type: 'boolean',
        default: false,
      },
    ],
  },
] as const;
