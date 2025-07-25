import memoizeOne from 'memoize-one';

import type {
  VehicleStatusCardConfig,
  MapData,
  Address,
  MiniMapConfig,
  ExtraMapCardConfig,
  MapEntityConfig,
} from '../../types/config';

import { HomeAssistant, LovelaceCardConfig } from '../../ha';
import { VehicleStatusCard } from '../../vehicle-status-card';
import { createCardElement } from './create-card-element';

export const getMapData = (hass: HomeAssistant, config: VehicleStatusCardConfig): MapData | void => {
  const deviceTracker = config.mini_map?.device_tracker;
  const hiddenMap = config.layout_config?.hide?.mini_map === true;
  if (hiddenMap || !deviceTracker || deviceTracker === '') {
    return;
  }
  const stateObj = hass.states[deviceTracker];
  if (!stateObj) {
    return;
  }
  const mapData = {} as MapData;
  const { latitude, longitude } = stateObj.attributes;
  mapData.lat = latitude;
  mapData.lon = longitude;
  return mapData;
};

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
  // console.log('Getting address from OpenStreetMap');
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

export async function createSingleMapCard(config: MiniMapConfig, hass: HomeAssistant): Promise<LovelaceCardConfig[]> {
  const useMaptiler = config?.maptiler_api_key && config?.maptiler_api_key !== '';
  const mapConfig = config as MiniMapConfig;
  let extra_entities = mapConfig.extra_entities || [];
  // if (extra_entities?.length) {
  //   // filter out the device tracker if it exists in extra_entities
  //   extra_entities = extra_entities.filter((entity) => {
  //     if (typeof entity === 'string') {
  //       return entity !== deviceTrackerEntity;
  //     } else if (typeof entity === 'object' && entity.entity) {
  //       return entity.entity !== deviceTrackerEntity;
  //     }
  //     return true; // keep the entity if it's not a string or object with entity
  //   });
  // }

  const deviceTracker = {
    entity: mapConfig.device_tracker,
    color: mapConfig.path_color || '',
    label_mode: mapConfig.label_mode,
    attribute: mapConfig.attribute || '',
    icon: '',
    focus: true,
  };
  // Ensure deviceTracker is included in extra_entities if not already present
  if (extra_entities.length === 0) {
    extra_entities = [deviceTracker];
  }
  let extraMapConfig: ExtraMapCardConfig = _convertToExtraMapConfig(
    mapConfig,
    [...(extra_entities as MapEntityConfig[])],
    Boolean(useMaptiler)
  ) as ExtraMapCardConfig;

  const mapElement = (await createCardElement(hass, [extraMapConfig])) as LovelaceCardConfig[];
  if (!mapElement) {
    console.error('Failed to create map element');
    return [];
  }
  return mapElement;
}

export const _convertToExtraMapConfig = (
  config: MiniMapConfig,
  entities: (MapEntityConfig | string)[] = [],
  useMaptiler: boolean = false
): ExtraMapCardConfig | LovelaceCardConfig => {
  const sharedConfig = {
    entities: entities,
    aspect_ratio: config.aspect_ratio,
    auto_fit: config.auto_fit,
    fit_zones: config.fit_zones,
    default_zoom: config.default_zoom,
    hours_to_show: config.hours_to_show,
    theme_mode: config.theme_mode,
  };
  const defaultMapConfig = {
    type: 'map',
    ...sharedConfig,
  };
  const maptilerConfig = {
    type: 'custom:extra-map-card',
    api_key: config.maptiler_api_key,
    custom_styles: config.map_styles,
    history_period: config.history_period,
    use_more_info: config.use_more_info,
    ...sharedConfig,
  };
  return useMaptiler ? maptilerConfig : defaultMapConfig;
};
