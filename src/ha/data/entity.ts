import { HassEntities, HassEntity } from 'home-assistant-js-websocket';

import { computeDomain } from '../common/entity/compute_domain';
import { HomeAssistant } from '../types';

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
