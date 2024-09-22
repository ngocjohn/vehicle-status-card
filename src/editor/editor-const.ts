const makePanel = (name: string, description?: string, icon?: string) => ({
  description,
  icon,
  name,
});

export const CONFIG_TYPES = {
  name: 'Config type',
  description: 'Select the type of configuration you want to edit.',
  options: {
    indicators: {
      name: 'Indicators',
      description: 'Display individual or grouped entity states on the card header.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#indicators-configuration',
      subpanels: {
        single: makePanel(
          'Single Indicators',
          'Indicators are used to display the state of an entity. You can choose the entity, attribute, and icon to display.'
        ),
        group: makePanel(
          'Group Indicators',
          'Group indicators are used to display the wrapped state of multiple entities. Click on the group to expand and see the individual entities.'
        ),
      },
    },
    range: {
      name: 'Range progress bar',
      description: 'Show progress bars for fuel, battery, or any entity with a range state.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#range-info-bars',
      subpanels: {
        rangeIndicator: makePanel(
          'Range Indicator',
          'Display the state of an entity with a range. You can choose the entity, attribute, and icon to display.'
        ),
      },
    },
    images: {
      name: 'Images',
      description: 'Add images for slides and set intervals for auto-changing.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#image-slides',
    },
    mini_map: {
      name: 'Mini Map',
      description: 'Track device_tracker entities on a mini map.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#mini-map',
    },
    button_card: {
      name: 'Button and Card',
      description: 'Configure button appearance, notifications, and default or custom cards.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#button-card',
      subpanels: {
        button: makePanel('Button', 'Set the value of primary, secondary, icon, and notify for the button.'),
        default_cards: makePanel('Default Card', 'Set the title and items for the default card.'),
        custom_cards: makePanel('Custom Card', 'Add custom cards to display. Use Lovelace card configuration.'),
      },
    },
    layout_config: {
      name: 'Layout Configuration',
      description: 'Set the card’s layout, theme, rows, and swipe for button grids.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#button-card',
    },
  },
};

const DETAIL_CONFIG_VALUES = [
  'attribute',
  'card_type',
  'button_type',
  'collapsed_items',
  'image_size',
  'horizontal',
  'value_size',
  'top',
  'left',
];

type BUTTON_CARD_ACTIONS =
  | 'add-item'
  | 'add-new-button'
  | 'back-to-list'
  | 'category-add'
  | 'category-back'
  | 'category-delete'
  | 'category-edit'
  | 'custom-card-preview'
  | 'delete-button'
  | 'delete-item'
  | 'edit-button'
  | 'edit-item'
  | 'show-button'
  | 'show-delete';

const BUTTON_TYPE = [
  { value: 'default', label: 'Default' },
  { value: 'action', label: 'Action' },
];

const CARD_TYPES = [
  { value: 'default', label: 'Default Card' },
  { value: 'custom', label: 'Custom Lovelace' },
  { value: 'tire', label: 'Tire Card' },
];

const ACTIONSELECTOR = [
  {
    name: 'tap_action',
    label: 'Tap action',
    defaultAction: 'more-info',
  },
  {
    name: 'hold_action',
    label: 'Hold action',
    defaultAction: 'none',
  },
  {
    name: 'double_tap_action',
    label: 'Double tap action',
    defaultAction: 'none',
  },
];

export { BUTTON_TYPE, CARD_TYPES, ACTIONSELECTOR, BUTTON_CARD_ACTIONS, DETAIL_CONFIG_VALUES as CONFIG_VALUES };
