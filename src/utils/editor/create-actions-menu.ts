import { ACTIONS } from '../../editor/editor-const';

export interface MenuItemConfig {
  action: string;
  title: string;
  icon?: string;
  color?: string;
}

export const ActionTypes = ['edit-item', 'show-item', 'duplicate-item', 'delete-item'] as const;
export type ActionType = (typeof ActionTypes)[number];

export const DefaultActions: MenuItemConfig[] = [
  { title: 'Edit', action: 'edit-item', icon: 'mdi:pencil' },
  { title: 'Show Item', action: 'show-item', icon: 'mdi:eye' },
  { title: 'Duplicate', action: 'duplicate-item', icon: 'mdi:content-duplicate' },
  {
    title: 'Delete',
    action: 'delete-item',
    icon: 'mdi:delete',
    color: 'var(--error-color)',
  },
];

export const createActionsMenu = (overrides?: Partial<MenuItemConfig>[]): MenuItemConfig[] => {
  const defaultActions = DefaultActions;
  if (!overrides) {
    return defaultActions;
  }
  const merged = defaultActions.map((action) => {
    const override = overrides.find((o) => o.action === action.action);
    if (override) {
      return { ...action, ...override };
    }
    return action;
  });
  // Add any additional actions that are not in the default list
  overrides.forEach((override) => {
    if (!merged.find((m) => m.action === override.action)) {
      merged.push(override as MenuItemConfig);
    }
  });
  return merged;
};

export const computeActionList = (actions: ActionType[]): MenuItemConfig[] => {
  return createActionsMenu().filter((action) => actions.includes(action.action as ActionType));
};

export const BUTTON_ACTION_MENU: MenuItemConfig[] = [
  { title: 'Edit', action: ACTIONS.EDIT_BUTTON, icon: 'mdi:pencil' },
  { title: 'Show Button', action: ACTIONS.SHOW_BUTTON, icon: 'mdi:eye' },
  { title: 'Duplicate', action: ACTIONS.DUPLICATE_BUTTON, icon: 'mdi:content-duplicate' },
  { title: 'Hide on card', action: ACTIONS.HIDE_BUTTON, icon: 'mdi:eye-off' },
  {
    title: 'Delete',
    action: ACTIONS.DELETE_BUTTON,
    icon: 'mdi:delete',
    color: 'var(--error-color)',
  },
];

export const GROUP_ENTITY_ADDED_ACTIONS: MenuItemConfig[] = [
  { title: 'Add to exclude list', action: 'add-exclude-entity', icon: 'mdi:close-circle' },
  { title: 'Remove from exclude list', action: 'remove-exclude-entity', icon: 'mdi:check-circle' },
];
