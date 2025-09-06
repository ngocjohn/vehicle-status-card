import type { IndicatorsConfig, IndicatorItemConfig, IndicatorGroupConfig } from '../../types/config/card/indicators';

import { findGroupEntity, getEntitiesByDomain, hasTemplate, HomeAssistant } from '../../ha';
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

export const migrateLegacyIndicatorsConfig = (oldConfig: IndicatorsConfig): IndicatorRowConfig => {
  const newConfig: IndicatorRowConfig = {
    row_items: [],
  };
  const rowItems: IndicatorRowItem[] = [];

  if (oldConfig.single && oldConfig.single.length > 0) {
    rowItems.push(...oldConfig.single.map((single) => convertToNewFormat<IndicatorEntityConfig>(single, 'entity')));
  }

  if (oldConfig.group && oldConfig.group.length > 0) {
    rowItems.push(...oldConfig.group.map((group) => convertOldGroupConfig(group)));
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

export const ensureEntityConfig = <T extends IndicatorEntityConfig>(items: (T | string)[]): T[] => {
  return items.map((item) => {
    if (typeof item === 'string') {
      return {
        ...DEFAULT_ENTITY_CONFIG,
        entity: item,
      } as T;
    }
    return {
      ...DEFAULT_ENTITY_CONFIG,
      ...item,
    } as T;
  });
};

export const convertToNewFormat = <T>(singleItem: IndicatorItemConfig, type?: string): T => {
  const newConfig = { ...singleItem } as Record<string, any>;
  if (type) {
    newConfig.type = type;
  }
  newConfig.show_name = true;
  newConfig.show_state = true;
  newConfig.show_icon = true;
  if ('action_config' in newConfig && newConfig.action_config) {
    for (const actionKey of Object.keys(newConfig.action_config)) {
      if (['tap_action', 'hold_action', 'double_tap_action'].includes(actionKey)) {
        newConfig[actionKey] = newConfig.action_config[actionKey];
      }
    }
    delete newConfig.action_config;
  }
  if ('color' in newConfig && newConfig.color) {
    if (hasTemplate(newConfig.color)) {
      newConfig.color_template = newConfig.color;
      delete (newConfig as any).color;
    }
  }
  if ('state_template' in newConfig && newConfig.state_template) {
    newConfig.include_state_template = true;
  }

  if ('attribute' in newConfig && newConfig.attribute) {
    console.debug('attribute found in old config, migrating to state_content:', singleItem);
    newConfig.state_content = [newConfig.attribute];
    delete (newConfig as any).attribute;
  }

  return newConfig as T;
};

export const convertOldGroupConfig = (oldGroup: IndicatorGroupConfig): IndicatorRowGroupConfig => {
  const newGroup: Partial<IndicatorRowGroupConfig> = {
    type: 'group',
    show_name: true,
    show_icon: true,
  };
  for (const [key, value] of Object.entries(oldGroup)) {
    if (key && (value === undefined || value !== '')) {
      newGroup[key as keyof IndicatorRowGroupConfig] = value;
    }
  }
  const items: IndicatorBaseItemConfig[] = [];
  if (oldGroup.items && oldGroup.items.length > 0) {
    for (const item of oldGroup.items) {
      items.push(convertToNewFormat<IndicatorBaseItemConfig>(item));
    }
  }
  if (items.length > 0) {
    newGroup.items = items;
  }

  if ('color' in newGroup && newGroup.color) {
    if (hasTemplate(newGroup.color)) {
      newGroup.color_template = newGroup.color;
      delete (newGroup as any).color;
    }
  }
  console.debug('Converted old group config to new format:', { oldGroup, newGroup });
  return newGroup as IndicatorRowGroupConfig;
};
