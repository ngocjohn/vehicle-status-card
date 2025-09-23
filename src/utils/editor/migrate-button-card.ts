import type { ButtonCardConfig } from '../../types/config/card/button';

import { hasTemplate } from '../../ha';
import { BaseButtonCardItemConfig } from '../../types/config/card/button-card';

export const convertButtonToNewFormat = (oldConfig: ButtonCardConfig): BaseButtonCardItemConfig => {
  const newConfig: Partial<BaseButtonCardItemConfig> = {
    show_name: true,
    show_state: true,
    show_icon: true,
  };
  if (oldConfig.button) {
    newConfig.name = oldConfig.button.primary;
    if ('color' in oldConfig.button && oldConfig.button.color) {
      if (hasTemplate(oldConfig.button.color)) {
        newConfig.color_template = oldConfig.button.color;
      } else {
        newConfig.color = oldConfig.button.color;
      }
    }
    if ('picture_template' in oldConfig.button && oldConfig.button.picture_template) {
      if (hasTemplate(oldConfig.button.picture_template)) {
        newConfig.icon_template = oldConfig.button.picture_template;
      } else if (oldConfig.button.icon) {
        newConfig.icon = oldConfig.button.icon;
      }
    } else if (oldConfig.button.icon) {
      newConfig.icon = oldConfig.button.icon;
    }
    if ('secondary' in oldConfig.button && oldConfig.button.secondary) {
      const secondary = { ...oldConfig.button.secondary };
      if ('state_template' in secondary && secondary.state_template) {
        newConfig.state_template = secondary.state_template;
        newConfig.include_state_template = true;
      }
      if ('entity' in secondary && secondary.entity) {
        newConfig.entity = secondary.entity;
      }
      if ('attribute' in secondary && secondary.attribute) {
        newConfig.state_content = [secondary.attribute];
      }
    }
    ['notify', 'notify_color', 'notify_icon'].forEach((prop) => {
      if (prop in oldConfig.button && oldConfig.button[prop as keyof typeof oldConfig.button]) {
        (newConfig as any)[prop] = oldConfig.button[prop as keyof typeof oldConfig.button];
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

  newConfig.button_type = oldConfig.button_type || 'default';
  newConfig.card_type = oldConfig.card_type || 'default';

  newConfig.sub_card = {
    default_card: oldConfig.default_card,
    custom_card: oldConfig.custom_card,
    tire_card: oldConfig.tire_card,
  };
  return newConfig as BaseButtonCardItemConfig;
};

export function migrateButtonCardConfig(oldConfig: ButtonCardConfig[]): BaseButtonCardItemConfig[] {
  // console.debug('Migrating legacy button_card config...');
  return oldConfig.map((item) => convertButtonToNewFormat(item));
}
