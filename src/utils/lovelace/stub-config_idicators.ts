import type { IndicatorGroupConfig, IndicatorItemConfig, IndicatorsConfig } from '../../types/config';

import { HomeAssistant, computeEntityName, getEntitiesByDomain, findEntitiesByClass } from '../../ha';

const SINGLE_SENSORS = ['sensor', 'binary_sensor', 'switch'];

const createSingle = (entities: string[]): IndicatorItemConfig[] => {
  return entities.map((entity) => ({
    entity,
    action_config: { tap_action: { action: 'more-info' } },
  }));
};

const createGroupIndicator = (
  hass: HomeAssistant,
  title: string,
  icon: string,
  entities: string[]
): IndicatorGroupConfig => ({
  name: title,
  icon,
  items: entities.map((entity) => ({
    entity,
    name: computeEntityName(hass.states[entity], hass),
  })),
});

export const getIndicatorsConfig = (hass: HomeAssistant): IndicatorsConfig => {
  const singleIndicators = createSingle(getEntitiesByDomain(hass.states, 1, SINGLE_SENSORS));

  const lights = getEntitiesByDomain(hass.states, 4, ['light']);
  const motions = [
    ...(findEntitiesByClass(hass, Object.values(hass.states), 'motion', 4)?.map((e) => e.entity_id) || []),
  ];

  const groups: IndicatorGroupConfig[] = [];
  if (lights.length) {
    groups.push(createGroupIndicator(hass, 'Lights', 'mdi:lightbulb-group', lights));
  }
  if (motions.length) {
    groups.push(createGroupIndicator(hass, 'Motions', 'mdi:motion-sensor', motions));
  }
  return {
    single: singleIndicators,
    group: groups,
  };
};
