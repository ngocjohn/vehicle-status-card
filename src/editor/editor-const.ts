const makePanel = (name: string, description?: string, icon?: string) => ({
  name,
  description,
  icon,
});

export const CONFIG_TYPES = {
  name: 'Config type',
  description: 'Select the type of configuration you want to edit.',
  options: {
    indicators: {
      name: 'Indicators',
      description: 'Display individual or grouped entity states on the card header.',
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
    },
    mini_map: {
      name: 'Mini Map',
      description: 'Track device_tracker entities on a mini map.',
    },
    button_card: {
      name: 'Button and Card',
      description: 'Configure button appearance, notifications, and default or custom cards.',
      subpanels: {
        button: makePanel('Button', 'Set the value of primary, secondary, icon, and notify for the button.'),
        default_cards: makePanel('Default Card', 'Set the title and items for the default card.'),
        custom_cards: makePanel('Custom Card', 'Add custom cards to display. Use Lovelace card configuration.'),
      },
    },
    layout_config: {
      name: 'Layout Configuration',
      description: 'Set the card’s layout, theme, rows, and swipe for button grids.',
    },
  },
};

export type BUTTON_CARD_ACTIONS =
  | 'edit-button'
  | 'delete-button'
  | 'add-new-button'
  | 'back-to-list'
  | 'custom-card-preview'
  | 'show-delete'
  | 'show-button'
  | 'delete-item'
  | 'edit-item'
  | 'add-item'
  | 'category-edit'
  | 'category-add'
  | 'category-delete'
  | 'category-back';
