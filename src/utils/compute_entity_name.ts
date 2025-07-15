import { Connection } from 'home-assistant-js-websocket';
import memoizeOne from 'memoize-one';

import type { HomeAssistant } from '../types';

import { computeDomain } from './find-entities';
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

export const fetchEntityRegistry = (conn: Connection) =>
  conn.sendMessagePromise<EntityRegistryEntry[]>({
    type: 'config/entity_registry/list',
  });

export const getEntityPlatformLookup = (entities: EntityRegistryEntry[]): Record<string, string> => {
  const entityLookup = {};
  for (const confEnt of entities) {
    if (!confEnt.platform) {
      continue;
    }
    entityLookup[confEnt.entity_id] = confEnt.platform;
  }
  return entityLookup;
};

export const entityRegistryByEntityId = memoizeOne((entries: EntityRegistryEntry[]) => {
  const entities: Record<string, EntityRegistryEntry> = {};
  for (const entity of entries) {
    entities[entity.entity_id] = entity;
  }
  return entities;
});

const batteryPriorities = ['sensor', 'binary_sensor'];
export const findBatteryEntity = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[]
): T | undefined => {
  const batteryEntities = entities
    .filter(
      (entity) =>
        hass.states[entity.entity_id] &&
        hass.states[entity.entity_id].attributes.device_class === 'battery' &&
        batteryPriorities.includes(computeDomain(entity.entity_id))
    )
    .sort(
      (a, b) =>
        batteryPriorities.indexOf(computeDomain(a.entity_id)) - batteryPriorities.indexOf(computeDomain(b.entity_id))
    );
  if (batteryEntities.length > 0) {
    return batteryEntities[0];
  }

  return undefined;
};

const powerDeviceClasses = ['battery', 'power_factor'];
export const findPowerEntities = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[]
): T[] | undefined => {
  const poweEntities = entities.filter(
    (entity) =>
      hass.states[entity.entity_id] &&
      powerDeviceClasses.some((deviceClass) => hass.states[entity.entity_id].attributes.device_class === deviceClass) &&
      batteryPriorities.includes(computeDomain(entity.entity_id))
  );
  // .sort(
  //   (a, b) =>
  //     batteryPriorities.indexOf(computeDomain(a.entity_id)) - batteryPriorities.indexOf(computeDomain(b.entity_id))
  // );
  if (poweEntities.length > 0) {
    return poweEntities;
  }

  return undefined;
};

export const findBatteryChargingEntity = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[]
): T | undefined =>
  entities.find(
    (entity) =>
      hass.states[entity.entity_id] && hass.states[entity.entity_id].attributes.device_class === 'battery_charging'
  );

const unavailableStates = ['unavailable', 'unknown', 'none'];
export const findEntitiesByClass = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[],
  deviceClass: string,
  maxLimit?: number
): T[] | undefined => {
  const entitiesClass = entities.filter(
    (entity) =>
      hass.states[entity.entity_id] &&
      hass.states[entity.entity_id].attributes.device_class === deviceClass &&
      !unavailableStates.includes(hass.states[entity.entity_id].state)
  );
  if (entitiesClass.length > 0) {
    return entitiesClass.slice(0, maxLimit);
  }
  return undefined;
};

export const computeDeviceName = (device: any): string | undefined => (device.name_by_user || device.name)?.trim();

export const computeEntityName = (stateObj: HassEntity, hass: HomeAssistant): string | undefined => {
  const entry = hass.entities[stateObj.entity_id] as EntityRegistryDisplayEntry | undefined;

  if (!entry) {
    // Fall back to state name if not in the entity registry (friendly name)
    return computeStateName(stateObj);
  }
  return computeEntityEntryName(entry, hass);
};

/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string => entityId.substr(entityId.indexOf('.') + 1);

export const computeStateNameFromEntityAttributes = (entityId: string, attributes: Record<string, any>): string =>
  attributes.friendly_name === undefined
    ? computeObjectId(entityId).replace(/_/g, ' ')
    : (attributes.friendly_name ?? '').toString();

export const computeStateName = (stateObj: HassEntity): string =>
  computeStateNameFromEntityAttributes(stateObj.entity_id, stateObj.attributes);

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
