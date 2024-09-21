/* eslint-disable @typescript-eslint/no-explicit-any */
const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

import { LovelaceCardConfig } from 'custom-card-helpers';

import {
  ButtonCardEntity,
  CardItemEntity,
  DefaultCardConfig,
  HomeAssistantExtended as HomeAssistant,
  IndicatorEntity,
  IndicatorGroupEntity,
  RangeInfoEntity,
  SecondaryInfoConfig,
  VehicleStatusCardConfig,
} from '../types';

export async function getTemplateValue(hass: HomeAssistant, templateConfig: string): Promise<string> {
  const response = await fetch('/api/template', {
    body: JSON.stringify({ template: templateConfig }),
    headers: {
      Authorization: `Bearer ${hass.auth.data.access_token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    return '';
  }

  const data = await response.text();
  return data;
}

export async function getBooleanTemplate(hass: HomeAssistant, templateConfig: string): Promise<boolean> {
  if (!templateConfig) {
    return true;
  }

  // console.log('Template:', templateConfig);
  const response = await fetch('/api/template', {
    body: JSON.stringify({ template: templateConfig }),
    headers: {
      Authorization: `Bearer ${hass.auth.data.access_token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.text();
  return data.trim().toLowerCase() === 'true';
}

export async function getSingleIndicators(
  hass: HomeAssistant,
  config: VehicleStatusCardConfig
): Promise<IndicatorEntity | void> {
  const singleIndicator: IndicatorEntity = [];
  if (!config.indicators.single) {
    return;
  }

  for (const indicator of config.indicators.single) {
    if (!indicator.entity) {
      continue;
    }

    const entity = indicator.entity;
    const stateObj = hass.states[entity];
    if (!stateObj) {
      continue;
    }
    let iconValue = '';

    if (indicator.icon_template) {
      iconValue = await getTemplateValue(hass, indicator.icon_template);
    } else if (indicator.icon) {
      iconValue = indicator.icon;
    }

    const state = indicator.state_template
      ? await getTemplateValue(hass, indicator.state_template)
      : indicator.attribute
        ? hass.formatEntityAttributeValue(stateObj, indicator.attribute)
        : hass.formatEntityState(stateObj);

    singleIndicator.push({ entity, icon: iconValue, state });
  }
  return singleIndicator;
}

export async function getGroupIndicators(
  hass: HomeAssistant,
  config: VehicleStatusCardConfig
): Promise<IndicatorGroupEntity | void> {
  const groupIndicator: IndicatorGroupEntity = [];
  if (!config.indicators.group) {
    return;
  }

  for (const group of config.indicators.group) {
    groupIndicator.push({
      icon: group.icon,
      items: [],
      name: group.name,
      visibility: await getBooleanTemplate(hass, group.visibility),
    });

    if (!group.items) {
      continue;
    }

    const items = group.items;
    for (const item of items) {
      if (!item.entity) {
        continue;
      }

      const entity = item.entity;
      const stateObj = hass.states[entity];
      if (!stateObj) {
        continue;
      }

      const itemIcon = item.icon_template
        ? await getTemplateValue(hass, item.icon_template)
        : item.icon
          ? item.icon
          : '';

      const state = item.state_template
        ? await getTemplateValue(hass, item.state_template)
        : item.attribute
          ? hass.formatEntityAttributeValue(stateObj, item.attribute)
          : hass.formatEntityState(stateObj);

      groupIndicator[groupIndicator.length - 1].items.push({
        entity: item.entity,
        icon: itemIcon,
        name: item.name,
        state,
      });
    }
  }
  return groupIndicator;
}

export async function getRangeInfo(
  hass: HomeAssistant,
  config: VehicleStatusCardConfig
): Promise<RangeInfoEntity | void> {
  if (!config.range_info) {
    return;
  }
  const rangeInfo: RangeInfoEntity = [];

  for (const range of config.range_info) {
    if (!range.energy_level || !range.range_level) {
      continue;
    }

    const energyLevel = range.energy_level[0];
    const rangeLevel = range.range_level[0];
    const progressColor = range.progress_color;

    let energyState = '';
    let rangeState = '';
    let energyIcon = '';
    let levelState = 0;

    if (!energyLevel.entity) continue;
    const energyEntity = energyLevel.entity;
    const energyStateObj = hass.states[energyEntity];
    if (!energyStateObj) continue;
    energyState = energyLevel.attribute
      ? hass.formatEntityAttributeValue(energyStateObj, energyLevel.attribute)
      : hass.formatEntityState(energyStateObj);

    energyIcon = energyLevel.icon ? energyLevel.icon : energyStateObj.attributes.icon || 'mdi:fuel';

    levelState = parseInt(energyState);

    if (!rangeLevel.entity) continue;

    const rangeEntity = rangeLevel.entity;
    const rangeStateObj = hass.states[rangeEntity];
    if (!rangeStateObj) continue;

    rangeState = rangeLevel.attribute
      ? hass.formatEntityAttributeValue(rangeStateObj, rangeLevel.attribute)
      : hass.formatEntityState(rangeStateObj);

    rangeInfo.push({
      energy: energyState,
      icon: energyIcon,
      level: levelState,
      progress_color: progressColor,
      range: rangeState,
    });
  }
  return rangeInfo;
}

async function _getSecondaryStates(hass: HomeAssistant, secondary: Array<SecondaryInfoConfig>): Promise<string> {
  let state: string = '';
  for (const item of secondary) {
    if (!item.entity) {
      continue;
    }

    const entity = item.entity;
    const stateObj = hass.states[entity];
    if (!stateObj) {
      continue;
    }

    state = item.state_template
      ? await getTemplateValue(hass, item.state_template)
      : item.attribute
        ? hass.formatEntityAttributeValue(stateObj, item.attribute)
        : hass.formatEntityState(stateObj);
  }
  return state;
}

export async function getDefaultCard(
  hass: HomeAssistant,
  defaultCard: DefaultCardConfig[]
): Promise<{ collapsed_items: boolean; items: CardItemEntity[]; title: string }[] | void> {
  if (!defaultCard) {
    return;
  }

  const defaultCardItem: { collapsed_items: boolean; items: CardItemEntity[]; title: string }[] = [];

  for (const card of defaultCard) {
    const title = card.title;
    const collapsed_items = card.collapsed_items || false;

    // Initialize `items` array for each card separately
    const items: CardItemEntity[] = [];

    for (const item of card.items) {
      if (!item.entity) {
        continue;
      }

      const entity = item.entity;
      const stateObj = hass.states[entity];
      if (!stateObj) {
        continue;
      }

      const state = item.state_template
        ? await getTemplateValue(hass, item.state_template)
        : item.attribute
          ? hass.formatEntityAttributeValue(stateObj, item.attribute)
          : hass.formatEntityState(stateObj);

      const icon = item.icon || '';
      const name = item.name || stateObj.attributes.friendly_name || '';

      items.push({ entity, icon, name, state });
    }

    // Now that items are populated, add them to the card
    defaultCardItem.push({ collapsed_items, items, title });
  }

  return defaultCardItem;
}

export async function createCardElement(
  hass: HomeAssistant,
  cards: LovelaceCardConfig[]
): Promise<LovelaceCardConfig[]> {
  if (!cards) {
    return [];
  }

  // Load the helpers and ensure they are available
  let helpers;
  if ((window as any).loadCardHelpers) {
    helpers = await (window as any).loadCardHelpers();
  } else if (HELPERS) {
    helpers = HELPERS;
  }

  // Check if helpers were loaded and if createCardElement exists
  if (!helpers || !helpers.createCardElement) {
    console.error('Card helpers or createCardElement not available.');
    return [];
  }

  const cardElements = await Promise.all(
    cards.map(async (card) => {
      try {
        const element = await helpers.createCardElement(card);
        element.hass = hass;
        return element;
      } catch (error) {
        console.error('Error creating card element:', error);
        return null;
      }
    })
  );
  return cardElements;
}

export async function getButtonCard(
  hass: HomeAssistant,
  config: VehicleStatusCardConfig
): Promise<ButtonCardEntity | void> {
  if (!config.button_card) {
    return;
  }
  const buttonCardItem: ButtonCardEntity = [];

  for (const btmCrd of config.button_card) {
    const button = btmCrd.button;
    if (!button) {
      continue;
    }

    const buttonDetails = {
      button_action: btmCrd.button_action,
      icon: button.icon || '',
      notify: button.notify ? await getBooleanTemplate(hass, button.notify) : false,
      primary: button.primary || '',
      secondary: (await _getSecondaryStates(hass, button.secondary)) || '',
    };

    const defaultCard = (await getDefaultCard(hass, btmCrd.default_card)) || [];

    const customCard = (await createCardElement(hass, btmCrd.custom_card)) || [];

    buttonCardItem.push({
      button: buttonDetails,
      button_type: btmCrd.button_type || 'default',
      card_type: btmCrd.card_type || 'default',
      custom_card: customCard,
      default_card: defaultCard,
      hide_button: btmCrd.hide_button || false,
    });
  }
  return buttonCardItem;
}

export async function uploadImage(hass: HomeAssistant, file: File): Promise<null | string> {
  console.log('Uploading image:', file.name);

  // Check if hass.auth and hass.auth.data are available
  if (!hass || !hass.auth || !hass.auth.data || !hass.auth.data.access_token) {
    console.error('hass.auth.data or access_token is missing');
    throw new Error('Authorization token is missing');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/image/upload', {
      body: formData,
      headers: {
        Authorization: `Bearer ${hass.auth.data.access_token}`,
      },
      method: 'POST',
    });

    if (!response.ok) {
      console.error('Failed to upload image, response status:', response.status);
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    console.log('Response data:', data);

    const imageId = data.id;
    if (!imageId) {
      console.error('Image ID is missing in the response');
      return null;
    }

    return `/api/image/serve/${imageId}/original`;
  } catch (err) {
    console.error('Error during image upload:', err);
    throw err;
  }
}
