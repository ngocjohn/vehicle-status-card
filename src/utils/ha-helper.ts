import { hasAction, LovelaceCardConfig } from 'custom-card-helpers';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
import memoizeOne from 'memoize-one';

import { DEFAULT_CONFIG } from '../const/const';
import { DEFAULT_TIRE_CONFIG } from '../editor/form';
import {
  ButtonCardEntity,
  DefaultCardConfig,
  HomeAssistant,
  TireTemplateConfig,
  TireEntity,
  ButtonCardConfig,
  VehicleStatusCardConfig,
  MapData,
  Address,
  MiniMapConfig,
  PREVIEW_TYPE,
  ButtonActionConfig,
} from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';

import type { ExtraMapCardConfig, MapEntityConfig } from 'extra-map-card/dist/types/config';
import type { HassEntity } from 'home-assistant-js-websocket';

export function computeDarkMode(hass?: HomeAssistant): boolean {
  if (!hass) return false;
  return (hass.themes as any).darkMode as boolean;
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
    background_entity: tireCard.background_entity || '',
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
    hide_rotation_button: tireCard.hide_rotation_button || false,
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
      notify_color: button.notify_color || '',
      notify_icon: button.notify_icon || '',
      primary: button.primary || '',
      secondary: button.secondary || [],
      color: button.color || '',
      picture_template: button.picture_template || '',
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
      tire_card: tireCard as TireEntity,
    });
  }

  return buttonCardItem;
}

type IMAGE = {
  url: string;
  name: string;
};

export async function uploadImage(hass: HomeAssistant, file: File): Promise<IMAGE | null> {
  console.log('Uploading image:', file.name);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await hass.fetchWithAuth('/api/image/upload', {
      method: 'POST',
      body: formData,
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

    return {
      url: `/api/image/serve/${imageId}/original`,
      name: file.name,
    };
  } catch (err) {
    console.error('Error during image upload:', err);
    throw err;
  }
}

export async function previewHandler(cardType: PREVIEW_TYPE | null, card: VehicleStatusCard): Promise<void> {
  if (!cardType && !card.isEditorPreview) return;
  const hass = card._hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;
  let cardConfig: LovelaceCardConfig[] | DefaultCardConfig[] | TireTemplateConfig;
  let cardElement: LovelaceCardConfig[] | DefaultCardConfig[] | TireEntity | undefined;

  switch (cardType) {
    case PREVIEW_TYPE.CUSTOM:
      cardConfig = config?.card_preview as LovelaceCardConfig[];
      if (!cardConfig) return;
      cardElement = (await createCardElement(hass, cardConfig)) as LovelaceCardConfig[];
      card._cardPreviewElement = cardElement;
      break;
    case PREVIEW_TYPE.DEFAULT:
      cardConfig = config?.default_card_preview as DefaultCardConfig[];
      if (!cardConfig) return;
      cardElement = cardConfig;
      card._defaultCardPreview = cardElement;
      break;
    case PREVIEW_TYPE.TIRE:
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

  if (config.button_card && config.button_card.length > 0) {
    card._buttonReady = false;
    card._buttonCards = await getButtonCard(hass, config.button_card);
    card._buttonReady = true;
  }

  card.MapData = _getMapData(card) as MapData;
}

export function _getMapData(card: VehicleStatusCard): MapData | void {
  const config = card._config as VehicleStatusCardConfig;
  if (
    config.layout_config?.hide?.mini_map === true ||
    !config.mini_map?.device_tracker ||
    config.mini_map?.device_tracker === ''
  ) {
    return;
  }
  // console.log('Getting map data');
  const hass = card._hass as HomeAssistant;
  const deviceTracker = config.mini_map?.device_tracker;
  const mapData = {} as MapData;
  const deviceStateObj = hass.states[deviceTracker];
  if (!deviceStateObj) return;
  const { latitude, longitude } = deviceStateObj.attributes as { latitude: number; longitude: number };
  mapData.lat = latitude;
  mapData.lon = longitude;
  return mapData;
}

export const _getMapAddress = memoizeOne(
  async (card: VehicleStatusCard, lat: number, lon: number): Promise<Address | undefined> => {
    if (card._config.layout_config?.hide?.map_address) return undefined;

    // console.log('Getting map address');

    const maptilerKey = card._config.mini_map?.maptiler_api_key;
    const apiKey = card._config.mini_map?.google_api_key;

    const address = maptilerKey
      ? await getAddressFromMapTiler(lat, lon, maptilerKey)
      : apiKey
      ? await getAddressFromGoggle(lat, lon, apiKey)
      : await getAddressFromOpenStreet(lat, lon);

    if (!address) return undefined;

    let formattedAddress: string;
    if (card._config.mini_map?.us_format) {
      formattedAddress = `${address.streetNumber} ${address.streetName}`;
    } else {
      formattedAddress = `${address.streetName} ${address.streetNumber}`;
    }
    address.streetName = formattedAddress;

    return address;
  }
);

export async function _setUpPreview(card: VehicleStatusCard): Promise<void> {
  if (!card._currentPreview && !card.isEditorPreview) return;

  // Ensure a card preview is configured during the first update if applicable
  if (!card._currentPreview && card._config?.card_preview) {
    card._currentPreview = PREVIEW_TYPE.CUSTOM;
  } else if (!card._currentPreview && card._config?.default_card_preview) {
    card._currentPreview = PREVIEW_TYPE.DEFAULT;
  } else if (!card._currentPreview && card._config?.tire_preview) {
    card._currentPreview = PREVIEW_TYPE.TIRE;
  }

  if (card._currentPreview !== null) {
    console.log('Setting up preview');
    await previewHandler(card._currentPreview, card);
  } else {
    card._currentPreview = null;
  }
}

export async function _setMapPopup(card: VehicleStatusCard): Promise<LovelaceCardConfig[]> {
  const config = card._config as VehicleStatusCardConfig;
  const hass = card._hass as HomeAssistant;
  console.log('Setting map popup');
  const miniMap = config.mini_map || {};
  const cardConfig: LovelaceCardConfig[] = [
    {
      type: 'map',
      default_zoom: miniMap.default_zoom || 14,
      hours_to_show: miniMap.hours_to_show || 0,
      theme_mode: miniMap.theme_mode || 'auto',
      auto_fit: miniMap.auto_fit || false,
      aspect_ratio: miniMap.aspect_ratio || '',
      entities: [
        {
          entity: miniMap.device_tracker,
          label_mode: miniMap?.label_mode,
          attribute: miniMap?.attribute,
        },
      ],
    },
  ];

  const cardElement = (await createCardElement(hass, cardConfig)) as LovelaceCardConfig[];

  return cardElement;
}

export async function createSingleMapCard(card: VehicleStatusCard): Promise<LovelaceCardConfig[] | void> {
  if (!card._config?.mini_map.maptiler_api_key && !card._config?.mini_map.device_tracker) {
    return;
  }
  const hass = card._hass as HomeAssistant;
  const mapConfig = card._config.mini_map;

  const extra_entities = mapConfig.extra_entities || [];
  const deviceTracker = {
    entity: mapConfig.device_tracker,
    color: mapConfig.path_color || '',
    label_mode: mapConfig.label_mode,
    attribute: mapConfig.attribute || '',
    focus: true,
  };

  let extraMapConfig: ExtraMapCardConfig = _convertToExtraMapConfig(mapConfig, [
    ...(extra_entities as MapEntityConfig[]),
    deviceTracker,
  ]);

  if (!extraMapConfig.entities?.length || extraMapConfig.entities.length === 0) {
    extraMapConfig.entities = [deviceTracker];
  }

  const mapElement = (await createCardElement(hass, [extraMapConfig])) as LovelaceCardConfig[];
  if (!mapElement) {
    console.error('Failed to create map element');
    return;
  }
  return mapElement;
}
export const _convertToExtraMapConfig = (
  config: MiniMapConfig,
  entities: (MapEntityConfig | string)[] = []
): ExtraMapCardConfig => {
  return {
    type: 'custom:extra-map-card',
    api_key: config.maptiler_api_key,
    entities,
    custom_styles: config.map_styles,
    aspect_ratio: config.aspect_ratio,
    auto_fit: config.auto_fit,
    fit_zones: config.fit_zones,
    default_zoom: config.default_zoom,
    hours_to_show: config.hours_to_show,
    theme_mode: config.theme_mode,
    history_period: config.history_period,
    use_more_info: config.use_more_info,
  };
};

export async function getAddressFromMapTiler(lat: number, lon: number, apiKey: string): Promise<Address | null> {
  // console.log('Getting address from MapTiler');
  const filterParams: Record<string, keyof Address> = {
    address: 'streetName', // Street name
    locality: 'sublocality', // Sublocality
    municipality: 'city', // City
  };

  const url = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch address from MapTiler');
    }

    const data = await response.json();
    if (data && data.features && data.features.length > 0) {
      let address: Partial<Address> = {};

      // Iterate through each feature
      data.features.forEach((feature: any) => {
        const placeType = feature.place_type[0]; // e.g. "address", "locality", "municipality"
        if (filterParams[placeType]) {
          const key = filterParams[placeType];
          const text = feature.text;

          // Check if the place type is an address and street number is available
          if (placeType === 'address') {
            address.streetNumber = feature.address ? `${feature.address}` : '';
          }
          // Assign filtered data to the corresponding property in the address object
          address[key] = `${text}`;
          // console.log(`Found ${key}:`, address[key], 'from', placeType);
        }
      });

      // Validate if the necessary parts of the address were found
      if (address.streetName && address.city) {
        return address as Address;
      }
    }

    return null;
  } catch (error) {
    console.warn('Error fetching address from MapTiler:', error);
    return null;
  }
}

export async function getAddressFromOpenStreet(lat: number, lon: number): Promise<Address | null> {
  console.log('Getting address from OpenStreetMap');
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`);

    if (!response.ok) {
      throw new Error('Failed to fetch address from OpenStreetMap');
    }

    const data = await response.json();
    const { house_number, road, suburb, village, city, town, neighbourhood } = data.address;
    // console.log('Address:', data.address);

    return {
      streetNumber: house_number || '',
      streetName: road || '',
      sublocality: neighbourhood || village || '',
      city: suburb || city || town || '',
    };
  } catch (error) {
    console.warn('Error fetching address:', error);
    return null;
  }
}
async function getAddressFromGoggle(lat: number, lon: number, apiKey: string): Promise<Address | null> {
  // console.log('Getting address from Google');
  const filterParams: Record<string, keyof Address> = {
    street_number: 'streetNumber',
    route: 'streetName',
    neighborhood: 'sublocality',
  };

  const filterCity = ['locality', 'administrative_area_level_2', 'administrative_area_level_1'];

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error('No results found');
    }

    const addressComponents = data.results[0].address_components;
    let address: Partial<Address> = {};

    addressComponents.forEach((comp) => {
      const placeType = comp.types[0];
      if (filterParams[placeType]) {
        const key = filterParams[placeType];
        const text = comp.short_name;

        address[key] = text;
        // console.log(`Found ${key}:`, text, 'from', placeType);
      } else if (filterCity.some((type) => comp.types.includes(type)) && !address.city) {
        address.city = comp.short_name;
        // console.log('Found city:', address.city);
      }
    });

    if (address.streetName && address.city) {
      return address as Address;
    }

    return null;
  } catch (error) {
    console.warn('Error fetching address from Google:', error);
    return null;
  }
}

export const getDefaultConfig = (hass: HomeAssistant) => {
  const deviceTrackers = Object.keys(hass.states)
    .filter((entity) => entity.startsWith('device_tracker.'))
    .filter((entity) => hass.states[entity].attributes.source_type === 'gps');
  console.log('deviceTrackers:', deviceTrackers);
  if (deviceTrackers.length > 0) {
    return {
      ...DEFAULT_CONFIG,
      mini_map: {
        device_tracker: deviceTrackers[0],
      },
      layout_config: {
        ...DEFAULT_CONFIG.layout_config,
        hide: {
          ...DEFAULT_CONFIG.layout_config.hide,
          mini_map: false,
        },
      },
    };
  }
  return DEFAULT_CONFIG;
};

/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string => entityId.substr(entityId.indexOf('.') + 1);

export const computeStateNameFromEntityAttributes = (entityId: string, attributes: Record<string, any>): string =>
  attributes.friendly_name === undefined
    ? computeObjectId(entityId).replace(/_/g, ' ')
    : (attributes.friendly_name ?? '').toString();

export const computeStateName = (stateObj: HassEntity): string =>
  computeStateNameFromEntityAttributes(stateObj.entity_id, stateObj.attributes);

export const hasLocation = (stateObj: HassEntity) =>
  'latitude' in stateObj.attributes && 'longitude' in stateObj.attributes;

export const hasActions = (config: ButtonActionConfig): boolean => {
  return Object.keys(config)
    .filter((key) => key !== 'entity')
    .some((action) => hasAction(config[action]));
};
