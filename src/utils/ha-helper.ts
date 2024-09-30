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
  DefaultCardEntity,
  TireTemplateConfig,
  TireEntity,
  ButtonCardConfig,
  IndicatorConfig,
  IndicatorGroupConfig,
  RangeInfoConfig,
} from '../types';

export async function getTemplateBoolean(hass: HomeAssistant, templateConfig: string): Promise<boolean> {
  if (!hass || !templateConfig) {
    return true;
  }

  try {
    // Prepare the body with the template
    const result = await hass.callApi<string>('POST', 'template', { template: templateConfig });
    if (result.trim().toLowerCase() === 'true') {
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Error evaluating template: ${error}`);
  }
}

export async function getTemplateValue(hass: HomeAssistant, templateConfig: string): Promise<string> {
  if (!hass || !templateConfig) {
    return '';
  }

  try {
    // Prepare the body with the template
    const result = await hass.callApi<string>('POST', 'template', { template: templateConfig });
    return result;
  } catch (error) {
    throw new Error(`Error evaluating template: ${error}`);
  }
}

export async function getSingleIndicators(
  hass: HomeAssistant,
  single: IndicatorConfig[]
): Promise<IndicatorEntity | void> {
  const singleIndicator: IndicatorEntity = [];

  // Use Promise.all to handle each indicator concurrently
  await Promise.all(
    single.map(async (indicator) => {
      if (!indicator.entity) {
        return;
      }

      const entity = indicator.entity;
      const stateObj = hass.states[entity];
      if (!stateObj) {
        return;
      }

      const iconValue = indicator.icon_template
        ? await getTemplateValue(hass, indicator.icon_template)
        : indicator.icon
          ? indicator.icon
          : '';

      const state = indicator.state_template
        ? await getTemplateValue(hass, indicator.state_template)
        : indicator.attribute
          ? hass.formatEntityAttributeValue(stateObj, indicator.attribute)
          : hass.formatEntityState(stateObj);

      const visibility = indicator.visibility ? await getTemplateBoolean(hass, indicator.visibility) : true;

      singleIndicator.push({ entity, icon: iconValue, state, visibility });
    })
  );

  return singleIndicator;
}

export async function getGroupIndicators(
  hass: HomeAssistant,
  groups: IndicatorGroupConfig[]
): Promise<IndicatorGroupEntity | void> {
  const groupIndicator: IndicatorGroupEntity = [];

  for (const group of groups) {
    groupIndicator.push({
      icon: group.icon,
      items: [],
      name: group.name,
      visibility: await getTemplateBoolean(hass, group.visibility),
    });

    if (group.items) {
      const itemPromises = group.items.map(async (item) => {
        if (!item.entity) {
          return null;
        }

        const entity = item.entity;
        const stateObj = hass.states[entity];
        if (!stateObj) {
          return null;
        }

        const itemIcon = item.icon_template ? await getTemplateValue(hass, item.icon_template) : item.icon || '';

        const state = item.state_template
          ? await getTemplateValue(hass, item.state_template)
          : item.attribute
            ? hass.formatEntityAttributeValue(stateObj, item.attribute)
            : hass.formatEntityState(stateObj);

        return {
          entity: item.entity,
          icon: itemIcon,
          name: item.name,
          state,
        };
      });
      // Resolve all item promises and filter out nulls
      groupIndicator[groupIndicator.length - 1].items = (await Promise.all(itemPromises)).filter(
        (item) => item !== null
      );
    }
  }
  return groupIndicator;
}

// export async function getRangeInfo(
//   hass: HomeAssistant,
//   rangeConfig: RangeInfoConfig[]
// ): Promise<RangeInfoEntity | void> {
//   const rangeInfo: RangeInfoEntity = [];

//   for (const range of rangeConfig) {
//     if (!range.energy_level || !range.range_level) {
//       continue;
//     }

//     const energyLevel = range.energy_level[0];
//     const rangeLevel = range.range_level[0];
//     const progressColor = range.progress_color;

//     let energyState = '';
//     let rangeState = '';
//     let energyIcon = '';
//     let levelState = 0;

//     if (!energyLevel.entity) continue;
//     const energyEntity = energyLevel.entity;
//     const energyStateObj = hass.states[energyEntity];
//     if (!energyStateObj) continue;
//     energyState = energyLevel.attribute
//       ? hass.formatEntityAttributeValue(energyStateObj, energyLevel.attribute)
//       : hass.formatEntityState(energyStateObj);

//     energyIcon = energyLevel.icon ? energyLevel.icon : energyStateObj.attributes.icon || 'mdi:fuel';

//     levelState = parseInt(energyState);

//     if (!rangeLevel.entity) continue;

//     const rangeEntity = rangeLevel.entity;
//     const rangeStateObj = hass.states[rangeEntity];
//     if (!rangeStateObj) continue;

//     rangeState = rangeLevel.attribute
//       ? hass.formatEntityAttributeValue(rangeStateObj, rangeLevel.attribute)
//       : hass.formatEntityState(rangeStateObj);

//     rangeInfo.push({
//       energy: energyState,
//       energy_entity: energyEntity,
//       icon: energyIcon,
//       level: levelState,
//       level_entity: rangeEntity,
//       progress_color: progressColor,
//       range: rangeState,
//     });
//   }
//   return rangeInfo;
// }

export async function getRangeInfo(
  hass: HomeAssistant,
  rangeConfig: RangeInfoConfig[]
): Promise<RangeInfoEntity | void> {
  const rangeInfoPromises = rangeConfig.map(async (range) => {
    if (!range.energy_level || !range.range_level) {
      return null;
    }

    const energyLevel = range.energy_level[0];
    const rangeLevel = range.range_level[0];
    const progressColor = range.progress_color;

    let energyState = '';
    let rangeState = '';
    let energyIcon = '';
    let levelState = 0;

    if (!energyLevel.entity) return null;
    const energyEntity = energyLevel.entity;
    const energyStateObj = hass.states[energyEntity];
    if (!energyStateObj) return null;

    energyState = energyLevel.attribute
      ? hass.formatEntityAttributeValue(energyStateObj, energyLevel.attribute)
      : hass.formatEntityState(energyStateObj);

    energyIcon = energyLevel.icon ? energyLevel.icon : energyStateObj.attributes.icon || 'mdi:fuel';
    levelState = parseInt(energyState);

    if (!rangeLevel.entity) return null;
    const rangeEntity = rangeLevel.entity;
    const rangeStateObj = hass.states[rangeEntity];
    if (!rangeStateObj) return null;

    rangeState = rangeLevel.attribute
      ? hass.formatEntityAttributeValue(rangeStateObj, rangeLevel.attribute)
      : hass.formatEntityState(rangeStateObj);

    return {
      energy: energyState,
      energy_entity: energyEntity,
      icon: energyIcon,
      level: levelState,
      level_entity: rangeEntity,
      progress_color: progressColor,
      range: rangeState,
    };
  });

  // Resolve all promises and filter out null results
  const rangeInfo = (await Promise.all(rangeInfoPromises)).filter((info) => info !== null);
  // console.log('Range Info:', rangeInfo);
  return rangeInfo;
}

export async function getDefaultCard(
  hass: HomeAssistant,
  defaultCard: DefaultCardConfig[]
): Promise<DefaultCardEntity[] | void> {
  if (!defaultCard) {
    return;
  }

  const defaultCardItem: DefaultCardEntity[] = [];

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

export async function getTireCard(
  hass: HomeAssistant,
  tireCard: TireTemplateConfig
): Promise<Partial<void | TireEntity>> {
  if (!tireCard) {
    return;
  }

  let tireCardItem: TireEntity = {} as TireEntity;

  const frontLeftEntity = tireCard?.front_left?.entity;
  const frontRightEntity = tireCard?.front_right?.entity;
  const rearLeftEntity = tireCard?.rear_left?.entity; // Missing entity check here
  const rearRightEntity = tireCard?.rear_right?.entity;

  // If the rear_left entity is missing, set default "N/A" state
  const rearLeftState = rearLeftEntity
    ? hass.states[rearLeftEntity]
      ? tireCard.rear_left.attribute
        ? hass.formatEntityAttributeValue(hass.states[rearLeftEntity], tireCard.rear_left.attribute)
        : hass.formatEntityState(hass.states[rearLeftEntity])
      : 'N/A' // If the entity exists but has no state, set 'N/A'
    : 'N/A'; // If the entity is missing, set 'N/A'

  const frontLeftState =
    frontLeftEntity && hass.states[frontLeftEntity]
      ? tireCard.front_left.attribute
        ? hass.formatEntityAttributeValue(hass.states[frontLeftEntity], tireCard.front_left.attribute)
        : hass.formatEntityState(hass.states[frontLeftEntity])
      : 'N/A';

  const frontRightState =
    frontRightEntity && hass.states[frontRightEntity]
      ? tireCard.front_right.attribute
        ? hass.formatEntityAttributeValue(hass.states[frontRightEntity], tireCard.front_right.attribute)
        : hass.formatEntityState(hass.states[frontRightEntity])
      : 'N/A';

  const rearRightState =
    rearRightEntity && hass.states[rearRightEntity]
      ? tireCard.rear_right.attribute
        ? hass.formatEntityAttributeValue(hass.states[rearRightEntity], tireCard.rear_right.attribute)
        : hass.formatEntityState(hass.states[rearRightEntity])
      : 'N/A';

  const frontLeftName = tireCard.front_left?.name || 'Front Left';
  const frontRightName = tireCard.front_right?.name || 'Front Right';
  const rearLeftName = tireCard.rear_left?.name || 'Rear Left';
  const rearRightName = tireCard.rear_right?.name || 'Rear Right';

  tireCardItem = {
    title: tireCard.title || '',
    background: tireCard.background || '',
    image_size: tireCard.image_size || 100,
    value_size: tireCard.value_size || 100,
    top: tireCard.top || 50,
    left: tireCard.left || 50,
    tires: {
      front_left: { state: frontLeftState, name: frontLeftName },
      front_right: { state: frontRightState, name: frontRightName },
      rear_left: { state: rearLeftState, name: rearLeftName },
      rear_right: { state: rearRightState, name: rearRightName },
    },
    horizontal: tireCard.horizontal || false,
  };

  return tireCardItem;
}

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
      primary: button.primary || '',
      secondary: button.secondary || [],
    };

    // const defaultCard = (await getDefaultCard(hass, btnCrd.default_card)) || [];

    const customCard = (await createCardElement(hass, btnCrd.custom_card)) || [];

    const tireCard = btnCrd.tire_card ? await getTireCard(hass, btnCrd.tire_card) : {};

    buttonCardItem.push({
      button: buttonDetails,
      button_type: btnCrd.button_type || 'default',
      card_type: btnCrd.card_type || 'default',
      custom_card: customCard,
      default_card: btnCrd.default_card || [],
      hide_button: btnCrd.hide_button || false,
      tire_card: tireCard as TireEntity,
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
