const makePanel = (name: string, description: string, icon?: string, helper?: string) => ({
  name,
  description,
  icon,
  helper,
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
        button: makePanel(
          'Button',
          'Select the button type between default and action. Default opens a card, action triggers an action.'
        ),
        default_cards: makePanel('Default Card', 'To change order of sections, click and drag the handle.'),
        custom_cards: makePanel('Custom Card', 'Add custom cards to display. Use Lovelace card configuration.'),
        tire_card: makePanel('Tire Card', 'Set the title and items for the tire card.'),
      },
    },
    layout_config: {
      name: 'Layout Configuration',
      description: 'Set the card’s layout, theme, rows, and swipe for button grids.',
      doc: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#button-card',
    },
  },
};

const PREVIEW_CONFIG_TYPES = ['btn_preview', 'default_card_preview', 'card_preview', 'tire_preview', 'active_group'];

type BUTTON_CARD_ACTIONS =
  | 'add-item'
  | 'add-new-button'
  | 'back-to-list'
  | 'category-add'
  | 'category-back'
  | 'category-delete'
  | 'category-edit'
  | 'custom-card-preview'
  | 'duplicate-button'
  | 'delete-button'
  | 'delete-item'
  | 'edit-button'
  | 'edit-item'
  | 'item-back'
  | 'show-button'
  | 'show-delete'
  | 'category-duplicate'
  | 'yaml-editor'
  | 'hide-button'
  | 'unhide-button'
  | 'yaml-default-card';
export enum ACTIONS {
  ADD_ITEM = 'add-item',
  ADD_NEW_BUTTON = 'add-new-button',
  BACK_TO_LIST = 'back-to-list',
  CATEGORY_ADD = 'category-add',
  CATEGORY_BACK = 'category-back',
  CATEGORY_DELETE = 'category-delete',
  CATEGORY_DUPLICATE = 'category-duplicate',
  CATEGORY_EDIT = 'category-edit',
  CUSTOM_CARD_PREVIEW = 'custom-card-preview',
  DELETE_BUTTON = 'delete-button',
  DELETE_ITEM = 'delete-item',
  DUPLICATE_BUTTON = 'duplicate-button',
  EDIT_BUTTON = 'edit-button',
  EDIT_ITEM = 'edit-item',
  HIDE_BUTTON = 'hide-button',
  ITEM_BACK = 'item-back',
  SHOW_BUTTON = 'show-button',
  SHOW_DELETE = 'show-delete',
  UNHIDE_BUTTON = 'unhide-button',
}

type IMAGE_CONFIG_ACTIONS =
  | 'add'
  | 'showDelete'
  | 'delete'
  | 'upload'
  | 'add-new-url'
  | 'show-image'
  | 'yaml-editor'
  | 'deselect-all'
  | 'select-all'
  | 'delete-selected';

export enum IMAGE_ACTIONS {
  ADD = 'add',
  SHOW_DELETE = 'showDelete',
  DELETE = 'delete',
  UPLOAD = 'upload',
  ADD_NEW_URL = 'add-new-url',
  SHOW_IMAGE = 'show-image',
  YAML_EDITOR = 'yaml-editor',
  DESELECT_ALL = 'deselect-all',
  SELECT_ALL = 'select-all',
  DELETE_SELECTED = 'delete-selected',
}

export enum RANGE_ACTIONS {
  DELETE_ITEM = 'delete-item',
  EDIT_ITEM = 'edit-item',
}

const BUTTON_TYPE = [
  { value: 'default', label: 'Default' },
  { value: 'action', label: 'Action' },
];

const CARD_TYPES = [
  { value: 'default', label: 'Default Card' },
  { value: 'custom', label: 'Custom Lovelace' },
  { value: 'tire', label: 'Tire Card' },
];

const NEW_BUTTON_CONFIG = {
  button: {
    primary: 'New Button',
    secondary: [{ entity: '', attribute: '', state_template: '' }],
    icon: 'mdi:new-box',
    notify: '',
  },
  button_type: 'default',
  hide_button: false,
  card_type: 'default',
  default_card: [],
  custom_card: [],
  button_action: {
    entity: '',
    // tap_action: { action: 'none' },
    // hold_action: { action: 'none' },
    // double_tap_action: { action: 'none' },
  },
};

enum ALERT_INFO {
  MAPTILER_GET = 'How to get Maptiler API Key?',
  MAPTILER_DOC_LINK = 'https://github.com/ngocjohn/vehicle-status-card/wiki/Mini-map#maptiler-popup',
  MAP_SINGLE_CARD = 'Configuration is same as for HA Default Map Card',
  MAP_SINGLE_LINK = 'https://www.home-assistant.io/dashboards/map/',
}

export {
  BUTTON_TYPE,
  CARD_TYPES,
  BUTTON_CARD_ACTIONS,
  PREVIEW_CONFIG_TYPES,
  NEW_BUTTON_CONFIG,
  IMAGE_CONFIG_ACTIONS,
  ALERT_INFO,
};
