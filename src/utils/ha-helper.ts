const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
import { LovelaceCardConfig } from 'custom-card-helpers';

import {
  ButtonCardEntity,
  CardItemEntity,
  DefaultCardConfig,
  HA as HomeAssistant,
  RangeInfoEntity,
  DefaultCardEntity,
  TireTemplateConfig,
  TireEntity,
  ButtonCardConfig,
  RangeInfoConfig,
  VehicleStatusCardConfig,
  MapData,
} from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';
import { getAddressFromGoggle, getAddressFromOpenStreet } from './helpers';

export async function getRangeInfo(
  hass: HomeAssistant,
  rangeConfig: RangeInfoConfig[]
): Promise<RangeInfoEntity | void> {
  if (!rangeConfig) {
    return;
  }
  const rangeInfo: RangeInfoEntity = [];

  for (const range of rangeConfig as RangeInfoConfig[]) {
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
      energy_entity: energyEntity,
      icon: energyIcon,
      level: levelState,
      level_entity: rangeEntity,
      progress_color: progressColor,
      range: rangeState,
    });
  }
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
        ? item.state_template
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
): Promise<LovelaceCardConfig[] | void> {
  if (!cards) {
    return;
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
    return;
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

  // If the entity is missing, set default "N/A" state
  const rearLeftState =
    rearLeftEntity && hass.states[rearLeftEntity]
      ? tireCard.rear_left.attribute
        ? hass.formatEntityAttributeValue(hass.states[rearLeftEntity], tireCard.rear_left.attribute)
        : hass.formatEntityState(hass.states[rearLeftEntity])
      : 'N/A'; // If the entity exists but has no state, set 'N/A'

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

  const frontLeftColor = tireCard.front_left?.color || '';
  const frontRightColor = tireCard.front_right?.color || '';
  const rearLeftColor = tireCard.rear_left?.color || '';
  const rearRightColor = tireCard.rear_right?.color || '';

  tireCardItem = {
    title: tireCard.title || '',
    background: tireCard.background || '',
    image_size: tireCard.image_size || 100,
    value_size: tireCard.value_size || 100,
    top: tireCard.top || 50,
    left: tireCard.left || 50,
    tires: {
      front_left: { state: frontLeftState, name: frontLeftName, color: frontLeftColor },
      front_right: { state: frontRightState, name: frontRightName, color: frontRightColor },
      rear_left: { state: rearLeftState, name: rearLeftName, color: rearLeftColor },
      rear_right: { state: rearRightState, name: rearRightName, color: rearRightColor },
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
      color: button.color || '',
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

export async function _getDefaultCardItems(card: VehicleStatusCard): Promise<void> {
  // console.log('Getting default card items');
  const defaultCardItems = new Map<number, DefaultCardEntity[]>();
  // console.log('Getting default card items');
  for (let i = 0; i < card._buttonCards.length; i++) {
    const buttonCard = card._buttonCards[i];
    const cardItems = buttonCard.default_card;
    const items = await getDefaultCard(card._hass, cardItems);
    if (items) {
      defaultCardItems.set(i, items);
    }
  }
  card._defaultItems = defaultCardItems;
  card.requestUpdate();
}

type cardType = 'custom' | 'default' | 'tire' | null;

export async function previewHandler(cardType: cardType, card: VehicleStatusCard): Promise<void> {
  if (!cardType && !card.isEditorPreview) return;
  const hass = card._hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;
  let cardConfig: LovelaceCardConfig[] | DefaultCardConfig[] | TireTemplateConfig;
  let cardElement: LovelaceCardConfig[] | DefaultCardEntity[] | TireEntity | undefined;

  switch (cardType) {
    case 'custom':
      cardConfig = config?.card_preview as LovelaceCardConfig[];
      if (!cardConfig) return;
      cardElement = (await createCardElement(hass, cardConfig)) as LovelaceCardConfig[];
      card._cardPreviewElement = cardElement;
      break;
    case 'default':
      cardConfig = config?.default_card_preview as DefaultCardConfig[];
      if (!cardConfig) return;
      cardElement = (await getDefaultCard(hass, cardConfig)) as DefaultCardEntity[];
      card._defaultCardPreview = cardElement;
      break;
    case 'tire':
      cardConfig = config?.tire_preview as TireTemplateConfig;
      if (!cardConfig) return;
      cardElement = (await getTireCard(hass, cardConfig)) as TireEntity;
      card._tireCardPreview = cardElement as TireEntity;
      break;
    default:
      return;
  }
  if (!cardElement) {
    _resetCardPreviews(card);
    return;
  }

  card._currentPreview = cardType;
  card.requestUpdate();
}

const _resetCardPreviews = (card: VehicleStatusCard): void => {
  card._cardPreviewElement = [];
  card._defaultCardPreview = [];
  card._tireCardPreview = undefined;
  card._currentPreview = null;
  card.requestUpdate();
};

export async function handleFirstUpdated(card: VehicleStatusCard): Promise<void> {
  if (card._currentPreview !== null && !card.isEditorPreview) {
    return;
  }
  const hass = card._hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;

  card._buttonReady = false;
  card._buttonCards = await getButtonCard(hass, config.button_card);
  card._buttonReady = true;
  _getMapData(card);
  _getDefaultCardItems(card);
}

export async function _getMapData(card: VehicleStatusCard): Promise<void> {
  const config = card._config as VehicleStatusCardConfig;
  if (
    config.layout_config?.hide?.mini_map === true ||
    !config.mini_map?.device_tracker ||
    config.mini_map?.device_tracker === ''
  ) {
    return;
  }

  const hass = card._hass as HomeAssistant;
  const deviceTracker = config.mini_map?.device_tracker;
  const apiKey = config.mini_map?.google_api_key;
  const mapData = {} as MapData;
  const deviceStateObj = hass.states[deviceTracker];
  if (!deviceStateObj) return;
  const { latitude, longitude } = deviceStateObj.attributes as { latitude: number; longitude: number };
  mapData.lat = latitude;
  mapData.lon = longitude;
  const adress = apiKey
    ? await getAddressFromGoggle(latitude, longitude, apiKey)
    : await getAddressFromOpenStreet(latitude, longitude);
  if (adress) {
    mapData.address = adress;
  }
  if (config.mini_map?.enable_popup) {
    const popup = await _setMapPopup(card);
    if (popup) {
      mapData.popUpCard = popup;
    }
  }

  card._mapData = mapData;
}

export async function _setUpPreview(card: VehicleStatusCard): Promise<void> {
  if (!card._currentPreview && !card.isEditorPreview) return;

  // Ensure a card preview is configured during the first update if applicable
  if (!card._currentPreview && card._config?.card_preview) {
    card._currentPreview = 'custom'; // Set a default card preview type if none is set
  } else if (!card._currentPreview && card._config?.default_card_preview) {
    card._currentPreview = 'default';
  } else if (!card._currentPreview && card._config?.tire_preview) {
    card._currentPreview = 'tire';
  }

  if (card._currentPreview !== null) {
    console.log('Setting up preview');
    await previewHandler(card._currentPreview, card);
  } else {
    card._currentPreview = null;
  }
}

export async function _setMapPopup(card: VehicleStatusCard): Promise<LovelaceCardConfig[] | void> {
  const config = card._config as VehicleStatusCardConfig;
  const hass = card._hass as HomeAssistant;
  if (
    !config.mini_map?.enable_popup ||
    !config.mini_map?.device_tracker ||
    config.layout_config?.hide?.mini_map !== false
  )
    return;
  // console.log('Setting map popup');
  const miniMap = config.mini_map || {};
  const cardConfig: LovelaceCardConfig[] = [
    {
      type: 'map',
      default_zoom: miniMap.default_zoom || 14,
      hours_to_show: miniMap.hours_to_show || 0,
      theme_mode: miniMap.theme_mode || 'auto',
      entities: [
        {
          entity: miniMap.device_tracker,
        },
      ],
    },
  ];
  const cardElement = (await createCardElement(hass, cardConfig)) as LovelaceCardConfig[];
  card._mapPopupLovelace = cardElement;
  return cardElement;
}
