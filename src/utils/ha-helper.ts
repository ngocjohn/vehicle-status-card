const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

import { LovelaceCardConfig, domainIcon, computeStateDomain } from 'custom-card-helpers';
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleStatusCardConfig,
  IndicatorEntity,
  IndicatorGroupEntity,
  RangeInfoEntity,
  ButtonCardEntity,
  SecondaryInfoConfig,
  DefaultCardConfig,
  CardItemEntity,
} from '../types';

export async function getTemplateValue(hass: HomeAssistant, templateConfig: string): Promise<string> {
  const response = await fetch('/api/template', {
    method: 'POST',
    body: JSON.stringify({ template: templateConfig }),
    headers: {
      Authorization: `Bearer ${hass.auth.data.access_token}`,
      'Content-Type': 'application/json',
    },
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
    method: 'POST',
    body: JSON.stringify({ template: templateConfig }),
    headers: {
      Authorization: `Bearer ${hass.auth.data.access_token}`,
      'Content-Type': 'application/json',
    },
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
    } else {
      iconValue = stateObj.attributes.icon || '';
    }

    const state = indicator.state_template
      ? await getTemplateValue(hass, indicator.state_template)
      : indicator.attribute
        ? hass.formatEntityAttributeValue(stateObj, indicator.attribute)
        : hass.formatEntityState(stateObj);

    singleIndicator.push({ icon: iconValue, state });
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
      name: group.name,
      icon: group.icon,
      visibility: await getBooleanTemplate(hass, group.visibility),
      items: [],
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
          : (stateObj.attributes.icon ?? group.icon);

      const state = item.state_template
        ? await getTemplateValue(hass, item.state_template)
        : item.attribute
          ? hass.formatEntityAttributeValue(stateObj, item.attribute)
          : hass.formatEntityState(stateObj);

      groupIndicator[groupIndicator.length - 1].items.push({ name: item.name, icon: itemIcon, state });
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
      range: rangeState,
      progress_color: progressColor,
      icon: energyIcon,
      level: levelState,
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
): Promise<{ title: string; collapsed_items: boolean; items: CardItemEntity[] }[] | void> {
  if (!defaultCard) {
    return;
  }

  const defaultCardItem: { title: string; collapsed_items: boolean; items: CardItemEntity[] }[] = [];

  for (const card of defaultCard) {
    const title = card.title;
    const collapsed_items = card.collapsed_items || false;

    // Initialize `items` array for each card separately
    let items: CardItemEntity[] = [];

    for (const item of card.items) {
      if (!item.entity) {
        continue;
      }

      const entity = item.entity;
      const stateObj = hass.states[entity];
      if (!stateObj) {
        continue;
      }

      let state = item.state_template
        ? await getTemplateValue(hass, item.state_template)
        : item.attribute
          ? hass.formatEntityAttributeValue(stateObj, item.attribute)
          : hass.formatEntityState(stateObj);

      let icon = item.icon || stateObj.attributes.icon || domainIcon(computeStateDomain(stateObj));
      let name = item.name || stateObj.attributes.friendly_name || '';

      items.push({ entity, name, icon, state });
    }

    // Now that items are populated, add them to the card
    defaultCardItem.push({ title, collapsed_items, items });
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
      primary: button.primary || '',
      secondary: (await _getSecondaryStates(hass, button.secondary)) || '',
      icon: button.icon || '',
      notify: button.notify ? await getBooleanTemplate(hass, button.notify) : false,
    };

    const defaultCard = (await getDefaultCard(hass, btmCrd.default_card)) || [];

    const customCard = (await createCardElement(hass, btmCrd.custom_card)) || [];

    buttonCardItem.push({
      button: buttonDetails,
      hide_button: btmCrd.hide_button || false,
      card_type: btmCrd.card_type || 'default',
      default_card: defaultCard,
      custom_card: customCard,
    });
  }
  return buttonCardItem;
}

export async function uploadImage(hass: HomeAssistant, file: File): Promise<string | null> {
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
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${hass.auth.data.access_token}`,
      },
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
