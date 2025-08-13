import type { RangeInfoConfig } from '../../types/config';

import { HomeAssistant } from '../../ha';
import { findBatteryChargingEntity, findPowerEntities, findEntitiesByClass } from '../../ha';
import { createRandomPallete, randomHexColor } from '../colors';

const createRangeInfoItem = (
  energyEntity: string,
  rangeEntity?: string,
  chargingEntity?: string,
  options: Partial<RangeInfoConfig> = {}
): RangeInfoConfig => ({
  energy_level: {
    entity: energyEntity || '',
    tap_action: { action: 'more-info' },
    value_alignment: options.energy_level?.value_alignment || 'start',
    value_position: options.energy_level?.value_position || 'inside',
  },
  range_level: {
    entity: rangeEntity || '',
    value_position: options.range_level?.value_position || 'outside',
  },
  charging_entity: chargingEntity || '',
  progress_color: randomHexColor(),
  charging_template: chargingEntity ? `{{ true }}` : undefined,
  color_blocks: options.color_blocks || false,
  color_thresholds: options.color_thresholds || [],
});

export const getRangeInfoConfig = (hass: HomeAssistant): RangeInfoConfig[] | void => {
  const entities = Object.values(hass.states);
  const batteryOrPowerEntities = findPowerEntities(hass, entities);
  const chargingEntity = findBatteryChargingEntity(hass, entities);
  const distanceEntities = findEntitiesByClass(hass, entities, 'distance');
  console.log(
    'Battery or Power Entities:',
    batteryOrPowerEntities,
    'Charging Entity:',
    chargingEntity,
    'Distance Entities:',
    distanceEntities
  );
  if (!batteryOrPowerEntities?.length) return;

  const defaultRangeInfo = createRangeInfoItem(
    batteryOrPowerEntities[0].entity_id,
    distanceEntities?.[0]?.entity_id,
    chargingEntity?.entity_id
  );

  const valueInside = createRangeInfoItem(
    batteryOrPowerEntities[1].entity_id,
    distanceEntities?.[1]?.entity_id,
    undefined,
    { energy_level: { value_position: 'inside' }, range_level: { value_position: 'inside' } }
  );

  const randomPallete = createRandomPallete(randomHexColor(), 100);
  const maxEnergyIndex = batteryOrPowerEntities.reduce((maxIndex, entity, index) => {
    const state = hass.states[entity.entity_id]?.state;
    return state && parseFloat(state) > parseFloat(hass.states[batteryOrPowerEntities[maxIndex].entity_id]?.state)
      ? index
      : maxIndex;
  }, 0);

  const colorRangeInfo = createRangeInfoItem(
    batteryOrPowerEntities[maxEnergyIndex].entity_id,
    distanceEntities?.[0]?.entity_id,
    undefined,
    {
      energy_level: { value_position: 'inside', value_alignment: 'end' },
      range_level: { value_position: 'off' },
      color_thresholds: randomPallete,
      color_blocks: true,
    }
  );

  return [defaultRangeInfo, valueInside, colorRangeInfo];
};
