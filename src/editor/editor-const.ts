const makePanel = (name: string, description?: string, icon?: string) => ({
  description,
  icon,
  name,
});

export const CONFIG_TYPES = {
  description: 'Select the type of configuration you want to edit.',
  name: 'Config type',
  options: {
    button_card: {
      description: 'Configure button appearance, notifications, and default or custom cards.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#button-card',
      name: 'Button and Card',
      subpanels: {
        button: makePanel('Button', 'Set the value of primary, secondary, icon, and notify for the button.'),
        custom_cards: makePanel('Custom Card', 'Add custom cards to display. Use Lovelace card configuration.'),
        default_cards: makePanel('Default Card', 'Set the title and items for the default card.'),
      },
    },
    images: {
      description: 'Add images for slides and set intervals for auto-changing.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#image-slides',
      name: 'Images',
    },
    indicators: {
      description: 'Display individual or grouped entity states on the card header.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#indicators-configuration',
      name: 'Indicators',
      subpanels: {
        group: makePanel(
          'Group Indicators',
          'Group indicators are used to display the wrapped state of multiple entities. Click on the group to expand and see the individual entities.'
        ),
        single: makePanel(
          'Single Indicators',
          'Indicators are used to display the state of an entity. You can choose the entity, attribute, and icon to display.'
        ),
      },
    },
    layout_config: {
      description: 'Set the card’s layout, theme, rows, and swipe for button grids.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#button-card',
      name: 'Layout Configuration',
    },
    mini_map: {
      description: 'Track device_tracker entities on a mini map.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#mini-map',
      name: 'Mini Map',
    },
    range: {
      description: 'Show progress bars for fuel, battery, or any entity with a range state.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#range-info-bars',
      name: 'Range progress bar',
      subpanels: {
        rangeIndicator: makePanel(
          'Range Indicator',
          'Display the state of an entity with a range. You can choose the entity, attribute, and icon to display.'
        ),
      },
    },
  },
};

export type BUTTON_CARD_ACTIONS =
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
