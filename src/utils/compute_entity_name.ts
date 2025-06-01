import { computeStateName } from 'extra-map-card';

import type { HomeAssistant } from '../types';

import { stripPrefixFromEntityName } from './strip_prefix_from_entity_name';

import type { HassEntity } from 'home-assistant-js-websocket';

type EntityCategory = 'config' | 'diagnostic';

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: EntityCategory;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
  has_entity_name?: boolean;
}

export interface EntityRegistryEntry {
  id: string;
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  config_entry_id: string | null;
  config_subentry_id: string | null;
  device_id: string | null;
  area_id: string | null;
  labels: string[];
  disabled_by: 'user' | 'device' | 'integration' | 'config_entry' | null;
  hidden_by: Exclude<EntityRegistryEntry['disabled_by'], 'config_entry'>;
  entity_category: EntityCategory | null;
  has_entity_name: boolean;
  original_name?: string;
  unique_id: string;
  translation_key?: string;
  options: any;
  categories: Record<string, string>;
}

export const computeDeviceName = (device: any): string | undefined => (device.name_by_user || device.name)?.trim();

export const computeEntityName = (stateObj: HassEntity, hass: HomeAssistant): string | undefined => {
  const entry = hass.entities[stateObj.entity_id] as EntityRegistryDisplayEntry | undefined;

  if (!entry) {
    // Fall back to state name if not in the entity registry (friendly name)
    return computeStateName(stateObj);
  }
  return computeEntityEntryName(entry, hass);
};

export const computeEntityEntryName = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  hass: HomeAssistant
): string | undefined => {
  const name = entry.name || ('original_name' in entry ? entry.original_name : undefined);

  const device = entry.device_id ? hass.devices[entry.device_id] : undefined;

  if (!device) {
    if (name) {
      return name;
    }
    const stateObj = hass.states[entry.entity_id] as HassEntity | undefined;
    if (stateObj) {
      return computeStateName(stateObj);
    }
    return undefined;
  }

  const deviceName = computeDeviceName(device);

  // If the device name is the same as the entity name, consider empty entity name
  if (deviceName === name) {
    return undefined;
  }

  // Remove the device name from the entity name if it starts with it
  if (deviceName && name) {
    return stripPrefixFromEntityName(name, deviceName) || name;
  }

  return name;
};
