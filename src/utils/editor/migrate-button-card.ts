import type { ButtonCardConfig } from '../../types/config/card/button';

import { hasTemplate } from '../../ha';
import { BaseButtonCardItemConfig } from '../../types/config/card/button-card';

export const convertButtonToNewFormat = (oldConfig: ButtonCardConfig): BaseButtonCardItemConfig => {
  const newConfig: Partial<BaseButtonCardItemConfig> = {
    show_primary: true,
    show_secondary: true,
    show_icon: true,
  };
  if (oldConfig.button && typeof oldConfig.button === 'object') {
    const button = { ...oldConfig.button };
    if (button.primary) {
      newConfig.name = button.primary;
    }
    if (button.color) {
      if (hasTemplate(button.color)) {
        newConfig.color_template = button.color;
        delete newConfig.color;
      } else {
        newConfig.color = button.color;
      }
    }
    if (button.picture_template) {
      if (hasTemplate(button.picture_template)) {
        newConfig.icon_template = button.picture_template;
        newConfig.icon_type = 'icon-template';
      }
    }
    if (button.icon) {
      newConfig.icon = button.icon;
    }
    if ('secondary' in button && button.secondary && typeof button.secondary === 'object') {
      const secondary = { ...button.secondary };
      if (secondary.state_template) {
        newConfig.state_template = secondary.state_template;
        newConfig.include_state_template = true;
      }
      if (secondary.entity) {
        newConfig.entity = secondary.entity;
      }
      if (secondary.attribute) {
        newConfig.state_content = [secondary.attribute];
      }
    }
    ['notify', 'notify_color', 'notify_icon'].forEach((prop) => {
      if (prop in button && button[prop as keyof typeof button]) {
        (newConfig as any)[prop] = button[prop as keyof typeof button];
      }
    });
  }
  if ('button_action' in oldConfig && oldConfig.button_action) {
    for (const action of ['tap_action', 'hold_action', 'double_tap_action'] as const) {
      if (action in oldConfig.button_action && oldConfig.button_action[action]) {
        (newConfig as any)[action] = oldConfig.button_action[action];
      }
    }
  }
  if ('hide_button' in oldConfig && typeof oldConfig.hide_button === 'boolean') {
    newConfig.hide_button = oldConfig.hide_button;
  }

  if (oldConfig.button_type) {
    newConfig.button_type = oldConfig.button_type;
  }
  if (oldConfig.card_type) {
    newConfig.card_type = oldConfig.card_type;
  }

  newConfig.sub_card = {
    default_card: oldConfig.default_card,
    custom_card: oldConfig.custom_card,
    tire_card: oldConfig.tire_card,
  };
  // Remove undefined values or empty objects
  Object.keys(newConfig).forEach((key) => {
    const value = (newConfig as any)[key];
    if (value === undefined || (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
      delete (newConfig as any)[key];
    }
  });
  return newConfig as BaseButtonCardItemConfig;
};

export function migrateButtonCardConfig(oldConfig: ButtonCardConfig[]): BaseButtonCardItemConfig[] {
  // console.debug('Migrating legacy button_card config...');
  return oldConfig.map((item) => convertButtonToNewFormat(item));
}

export const generateNewButtonConfig = (entity: string): BaseButtonCardItemConfig => {
  const newButton: BaseButtonCardItemConfig = {
    entity,
    show_icon: true,
    show_primary: true,
    show_secondary: true,
    layout: 'horizontal',
    button_type: 'action',
    tap_action: {
      action: 'more-info',
    },
  };
  return newButton;
};
