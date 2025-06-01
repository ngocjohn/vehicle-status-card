import memoizeOne from 'memoize-one';

import { TireEntityConfig, TireTemplateConfig } from '../../types';

const DEFAULT_TIRE_ENTITY: TireEntityConfig = {
  entity: '',
};

export const DEFAULT_TIRE_CONFIG: TireTemplateConfig = {
  title: '',
  background: '',
  horizontal: false,
  hide_rotation_button: false,
  image_size: 100,
  value_size: 100,
  top: 50,
  left: 50,
  front_left: DEFAULT_TIRE_ENTITY,
  front_right: DEFAULT_TIRE_ENTITY,
  rear_left: DEFAULT_TIRE_ENTITY,
  rear_right: DEFAULT_TIRE_ENTITY,
};

export const TIRE_APPEARANCE_SCHEMA = memoizeOne(
  (positionLabel: string) =>
    [
      {
        name: 'title',
        label: 'Card Title',
        required: false,
        selector: { text: { type: 'text' } },
      },
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'image_size',
            label: 'Base image size',
            selector: { number: { max: 200, min: 0, mode: 'slider', step: 1 } },
            default: 100,
          },
          {
            name: 'value_size',
            label: 'Name & Value size',
            selector: { number: { max: 150, min: 50, mode: 'slider', step: 1 } },
            default: 100,
          },
          {
            name: 'top',
            label: `${positionLabel} position`,
            default: 50,
            selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } },
          },
          {
            name: 'left',
            label: `${positionLabel} position`,
            default: 50,
            selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } },
          },
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
        ],
      },
    ] as const
);

export const TIRE_BACKGROUND_SCHEMA = [
  {
    name: 'background',
    label: 'Background image URL',
    selector: { image: {} },
    default: '',
    helper:
      'The image should be square with a maximum resolution of 450x450 pixels. A transparent background is recommended.',
  },
];

export const TIRE_ENTITY_SCHEMA = memoizeOne(
  (tirePosition: string, tireEntity: string) =>
    [
      {
        name: tirePosition,
        type: 'expandable',
        label: tirePosition.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
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
            helper: 'Name of the tire',
          },
          {
            name: 'color',
            label: 'Color Template',
            selector: { template: {} },
            helper:
              'Customize the color based on a template. The template should return a valid color name or hex code.',
          },
        ],
      },
    ] as const
);
