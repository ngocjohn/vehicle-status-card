import type { HomeAssistant } from '../../ha';

import { DEFAULT_TIRE_CONFIG } from '../../editor/form';
import { ButtonCardConfig, ButtonCardEntity, TireEntity } from '../../types/config';
// Util functions
import { createCardElement } from './create-card-element';
import { getTireCard } from './create-tire-card';

/**
 * Creates a button element based on the provided configuration.
 *
 * @param hass Home Assistant instance
 * @param config Button card configuration
 * @returns Promise that resolves to a button element or void if no config is provided
 */
export async function getButtonCard(hass: HomeAssistant, buttonConfig: ButtonCardConfig[]): Promise<ButtonCardEntity> {
  if (!buttonConfig) {
    return [];
  }

  const buttonCardItem: ButtonCardEntity = [];

  for (const btnCrd of buttonConfig) {
    const button = btnCrd.button;
    if (!button) {
      continue;
    }

    const buttonDetails = {
      button_action: btnCrd.button_action,
      icon: button.icon || '',
      notify: button.notify || '',
      notify_color: button.notify_color || '',
      notify_icon: button.notify_icon || '',
      primary: button.primary || '',
      secondary: button.secondary || [],
      color: button.color || '',
      picture_template: button.picture_template || '',
      state_color: button.state_color || false,
    };

    // const defaultCard = (await getDefaultCard(hass, btnCrd.default_card)) || [];

    const customCard = (await createCardElement(hass, btnCrd.custom_card)) || [];

    const tireCard = (await getTireCard(hass, btnCrd.tire_card ?? DEFAULT_TIRE_CONFIG)) || ({} as TireEntity);

    buttonCardItem.push({
      button: buttonDetails,
      button_type: btnCrd.button_type || 'default',
      card_type: btnCrd.card_type || 'default',
      custom_card: customCard,
      default_card: btnCrd.default_card || [],
      hide_button: btnCrd.hide_button || false,
      tire_card: tireCard,
    });
  }

  return buttonCardItem;
}
