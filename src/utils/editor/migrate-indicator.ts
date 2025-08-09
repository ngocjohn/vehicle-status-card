import type { IndicatorsConfig, IndicatorItemConfig, IndicatorGroupConfig } from '../../types/config/card/indicators';

import { findGroupEntity, getEntitiesByDomain, HomeAssistant } from '../../ha';
import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { computeGroupDomain, GroupEntity } from '../../ha/data/group';
import {
  IndicatorEntityConfig,
  IndicatorRowItem,
  IndicatorRowConfig,
  IndicatorBaseItemConfig,
  IndicatorRowGroupConfig,
  LovelaceRowItemConfig,
} from '../../types/config/card/row-indicators';
const DEFAULT_ENTITY_CONFIG: Partial<IndicatorEntityConfig> = {
  type: 'entity',
  show_name: true,
  show_state: true,
  show_icon: true,
  show_entity_picture: false,
  include_state_template: false,
  tap_action: {
    action: 'more-info',
  },
};

const validKeys: readonly (keyof IndicatorBaseItemConfig)[] = [
  'entity',
  'name',
  'icon',
  'color',
  'show_name',
  'show_state',
  'show_icon',
  'show_entity_picture',
  'include_state_template',
  'state_template',
  'state_content',
  'visibility',
] as const;

const convertToBaseItemConfig = (oldConfig: IndicatorItemConfig): IndicatorBaseItemConfig => {
  const baseItem: Partial<IndicatorBaseItemConfig> = {
    entity: oldConfig.entity,
  };
  for (const [key, value] of Object.entries(oldConfig)) {
    if (key === 'action_config' && value) {
      for (const actionKey of Object.keys(value)) {
        if (['tap_action', 'hold_action', 'double_tap_action'].includes(actionKey)) {
          baseItem[actionKey as keyof IndicatorBaseItemConfig] = value[actionKey];
        }
      }
      continue;
    }
    if (validKeys.includes(key as keyof IndicatorBaseItemConfig) && value !== undefined && value !== '') {
      // Only include valid keys and non-empty values
      // This prevents adding undefined or empty string values to the base item
      baseItem[key] = value;
    }
  }
  return baseItem as IndicatorBaseItemConfig;
};

const convertSingleItem = (oldSingle: IndicatorItemConfig): IndicatorEntityConfig => {
  let newItem = DEFAULT_ENTITY_CONFIG;
  const baseItem = convertToBaseItemConfig(oldSingle);

  newItem = {
    ...newItem,
    ...baseItem,
    show_name: false,
    show_state: true,
  };

  return newItem as IndicatorEntityConfig;
};

const converGroupToRowItem = (oldGroup: IndicatorGroupConfig): IndicatorRowGroupConfig => {
  const newGroup: Partial<IndicatorRowGroupConfig> = {
    type: 'group',
  };
  for (const [key, value] of Object.entries(oldGroup)) {
    if (key === 'items' && Array.isArray(value)) {
      newGroup.items = value.map((item) => convertToBaseItemConfig(item));
      continue;
    }
    if (key && (value === undefined || value !== '')) {
      newGroup[key as keyof IndicatorGroupConfig] = value;
    }
  }
  return newGroup as IndicatorRowGroupConfig;
};

export const migrateLegacyIndicatorsConfig = (oldConfig: IndicatorsConfig): IndicatorRowConfig => {
  const newConfig: IndicatorRowConfig = {
    row_items: [],
  };
  const rowItems: IndicatorRowItem[] = [];

  if (oldConfig.single && oldConfig.single.length > 0) {
    rowItems.push(...oldConfig.single.map(convertSingleItem));
  }

  if (oldConfig.group && oldConfig.group.length > 0) {
    rowItems.push(...oldConfig.group.map(converGroupToRowItem));
  }

  newConfig.row_items = rowItems;
  return newConfig;
};

export const ensureRowItemConfig = (config: Partial<LovelaceRowItemConfig> | string): IndicatorRowItem => {
  if (typeof config === 'string') {
    return {
      ...DEFAULT_ENTITY_CONFIG,
      entity: config,
    } as IndicatorEntityConfig;
  }
  if ('type' in config && config.type) {
    return config as IndicatorRowItem;
  }
  return {
    ...DEFAULT_ENTITY_CONFIG,
    ...config,
  } as IndicatorEntityConfig;
};

export const computeNewRow = (hass: HomeAssistant): IndicatorRowConfig => {
  const rowItems: IndicatorRowItem[] = [];

  const entities = Object.values(hass.states);
  const baseEntities = getEntitiesByDomain(hass.states, 1, ['sensor', 'light']);
  const entityGroup = findGroupEntity(hass, entities);

  if (baseEntities.length > 0) {
    const itemShowName = ensureRowItemConfig({ entity: baseEntities[0], show_name: false });
    rowItems.push(itemShowName as IndicatorEntityConfig);
    rowItems.push(ensureRowItemConfig(baseEntities[1]) as IndicatorEntityConfig);
    rowItems.push({
      type: 'group',
      name: 'Group',
      icon: `mdi:numeric-${baseEntities.length}-circle`,
      items: [
        ...baseEntities.map((entity) => ({
          entity,
        })),
      ],
    } as IndicatorRowGroupConfig);
  }

  if (entityGroup) {
    const entityStateObj = hass.states[entityGroup.entity_id] as GroupEntity;
    const groupConfig: IndicatorRowGroupConfig = {
      type: 'group',
      entity: entityStateObj.entity_id,
      show_name: true,
      name: capitalizeFirstLetter(computeGroupDomain(entityStateObj)!) || 'Group Entity',
    };
    rowItems.push(groupConfig);
  }

  return {
    row_items: rowItems,
  };
};
