import { HomeAssistant, LovelaceCard, LovelaceCardConfig } from '../../ha';
import {
  type VehicleStatusCardConfig,
  type MapData,
  type Address,
  type MiniMapConfig,
  type ExtraMapCardConfig,
  computePopupCardConfig,
} from '../../types/config';
import { createCardElement } from './create-card-element';

export const getMapData = (hass: HomeAssistant, config: VehicleStatusCardConfig): MapData | void => {
  const deviceTracker = config.mini_map?.device_tracker;
  if (!deviceTracker || deviceTracker === '') {
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

const DEV_ADDRESS = {
  streetNumber: '123',
  streetName: 'Example St',
  sublocality: 'Example Suburb',
  city: 'Example City',
} as const;

export const _getMapAddress = async (config: MiniMapConfig, lat: number, lon: number): Promise<Address | undefined> => {
  if (config?.hide_map_address === true) {
    return undefined;
  }
  const address = await (() => {
    if (__DEBUG__) {
      return DEV_ADDRESS;
    } else {
      const maptilerKey = config?.maptiler_api_key;
      const apiKey = config?.google_api_key;

      return maptilerKey
        ? getAddressFromMapTiler(lat, lon, maptilerKey)
        : apiKey
        ? getAddressFromGoggle(lat, lon, apiKey)
        : getAddressFromOpenStreet(lat, lon);
    }
  })();

  if (!address) return undefined;

  // Format address based on us_format setting
  const formattedAddress =
    config?.us_format === true
      ? `${address.streetNumber} ${address.streetName}`
      : `${address.streetName} ${address.streetNumber}`;

  const finalAddress: Address = {
    streetName: formattedAddress.trim(),
    sublocality: address?.sublocality || '',
    city: address?.city || '',
  };

  // utilDebug('Formatted address:', { address, finalAddress });
  return finalAddress;
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
  const mapConfig = config as MiniMapConfig;
  const extraMapConfig = computePopupCardConfig(mapConfig);

  const mapElement = (await createCardElement(hass, [extraMapConfig])) as LovelaceCardConfig[];
  if (!mapElement) {
    console.error('Failed to create map element');
    return [];
  }
  return mapElement;
}

export const createMapCard = (config: MiniMapConfig): LovelaceCard | undefined => {
  if (!config || !config.device_tracker) {
    console.log('No device tracker set, cancelling map card creation');
    return;
  }
  const useMapTiler = config.maptiler_api_key && config.maptiler_api_key !== '';
  if (!useMapTiler) {
    console.log('maptiler_api_key is not set, cancelling map card creation');
    return;
  }

  const mapConfig = computePopupCardConfig(config) as ExtraMapCardConfig;
  console.log('Creating map element...');
  try {
    const tag = 'extra-map-card';
    if (customElements.get(tag)) {
      // @ts-ignore
      const element = document.createElement(tag, config) as LovelaceCard;
      element.setConfig(mapConfig);
      // console.log('Map element already exists, reusing:', element);
      return element;
    }
    // @ts-ignore
    const element = document.createElement(tag) as LovelaceCard;
    customElements.whenDefined(tag).then(() => {
      try {
        customElements.upgrade(element);
        element.setConfig(mapConfig);
      } catch (error: any) {
        console.log(`Error setting config for ${tag}:`, error.message);
      }
    });
    console.log('Map element created:', element);
    return element;
  } catch (err) {
    console.error('Error creating map card:', err);
    return undefined;
  }
};
