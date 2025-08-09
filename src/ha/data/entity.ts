import { HassEntities, HassEntity } from 'home-assistant-js-websocket';

import { arrayLiteralIncludes } from '../common/array/literal-includes';
import { computeDomain } from '../common/entity/compute_domain';
import { HomeAssistant } from '../types';
import { isGroupEntity } from './group';

const PERCENT_UNIT = ['%', 'PERCENT', 'PERCENTAGE'];
const unavailableStates = ['unavailable', 'unknown', 'none'];

export function hasPercent(stateObj: HassEntity): boolean {
  return [...PERCENT_UNIT, 'unit_of_measurement'].some(
    (unit) => stateObj.attributes.unit_of_measurement === unit || stateObj.attributes.unit === unit
  );
}

export function hasLocation(stateObj: HassEntity): boolean {
  return 'latitude' in stateObj.attributes && 'longitude' in stateObj.attributes;
}

export function hasEntityPicture(stateObj: HassEntity): boolean {
  return stateObj.attributes.entity_picture !== undefined && stateObj.attributes.entity_picture !== '';
}

export function isAvailable(stateObj: HassEntity): boolean {
  return stateObj && typeof stateObj.state === 'string' && !unavailableStates.includes(stateObj.state);
}

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
  const poweEntities = entities
    .filter(
      (entity) =>
        hass.states[entity.entity_id] &&
        powerDeviceClasses.some(
          (deviceClass) => hass.states[entity.entity_id].attributes.device_class === deviceClass
        ) &&
        batteryPriorities.includes(computeDomain(entity.entity_id)) &&
        !unavailableStates.includes(hass.states[entity.entity_id].state)
    )
    .sort(
      (a, b) =>
        batteryPriorities.indexOf(computeDomain(a.entity_id)) - batteryPriorities.indexOf(computeDomain(b.entity_id))
    );
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

export const findGroupEntity = <T extends { entity_id: string }>(hass: HomeAssistant, entities: T[]): T | undefined => {
  const groupEntities = entities.filter(
    (entity) =>
      hass.states[entity.entity_id] &&
      isGroupEntity(hass.states[entity.entity_id]) &&
      !unavailableStates.includes(hass.states[entity.entity_id].state)
  );
  if (groupEntities.length > 0) {
    return groupEntities[0];
  }
  return undefined;
};

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

export function getEntitiesByDomain(entities: HassEntities, max: number, domain: string[]): string[] {
  const entityIds: string[] = [];

  const getEntities = (domain: string): string[] => {
    let ent = Object.keys(entities).filter((e) => computeDomain(e) === domain);
    if (domain === 'person') {
      ent = ent.filter((e) => {
        return hasEntityPicture(entities[e]);
      });
    } else if (domain === 'device_tracker') {
      ent = ent.filter((e) => {
        return hasLocation(entities[e]);
      });
    }

    ent = ent.filter((e) => isAvailable(entities[e]));
    return ent.slice(0, max);
  };

  domain.forEach((d) => {
    entityIds.push(...getEntities(d));
  });
  return entityIds;
}

export const UNAVAILABLE = 'unavailable';
export const UNKNOWN = 'unknown';

export const ON = 'on';
export const OFF = 'off';

export const OFF_STATES = [UNAVAILABLE, UNKNOWN, OFF];
export const UNAVAILABLE_STATES = [UNAVAILABLE, UNKNOWN] as const;

export function isActive(stateObj: HassEntity) {
  if (!stateObj) {
    return false;
  }
  const domain = computeDomain(stateObj.entity_id);
  const state = stateObj.state;

  if (['button', 'input_button', 'scene'].includes(domain)) {
    return state !== UNAVAILABLE;
  }

  if (OFF_STATES.includes(state)) {
    return false;
  }

  // Custom cases
  switch (domain) {
    case 'cover':
    case 'valve':
      return !['closed', 'closing'].includes(state);
    case 'device_tracker':
    case 'person':
      return state !== 'not_home';
    case 'media_player':
      return state !== 'standby';
    case 'vacuum':
      return !['idle', 'docked', 'paused'].includes(state);
    case 'plant':
      return state === 'problem';
    default:
      return true;
  }
}

export function isOff(stateObj: HassEntity) {
  return stateObj.state === OFF;
}

export function isUnknown(stateObj: HassEntity) {
  return stateObj.state === UNKNOWN;
}

export function getEntityPicture(stateObj: HassEntity) {
  return (stateObj.attributes.entity_picture_local as string | undefined) || stateObj.attributes.entity_picture;
}

export const isUnavailableState = arrayLiteralIncludes(UNAVAILABLE_STATES);
export const isOffState = arrayLiteralIncludes(OFF_STATES);
