import { HomeAssistant } from '../types';
import {
  ButtonCardConfig,
  ImageConfig,
  IndicatorConfig,
  IndicatorGroupConfig,
  IndicatorsConfig,
  MiniMapConfig,
  RangeInfoConfig,
  VehicleStatusCardConfig,
} from '../types/config';
import {
  computeEntityName,
  findBatteryChargingEntity,
  findEntitiesByClass,
  findPowerEntities,
} from './compute_entity_name';
import { computeDomain, hasEntityPicture, hasLocation } from './find-entities';

const MAX_BUTTON_CARDS = 8;
const GIT_ASSETS_URL =
  'https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/refs/heads/main/assets/sample-images/';
const SAMPLE_IMAGES = ['sample-car-1.png', 'sample-car-2.png', 'sample-car-3.png'] as const;

const getSampleImages = (): ImageConfig[] => {
  return SAMPLE_IMAGES.map((image) => ({
    title: image,
    url: `${GIT_ASSETS_URL}${image}`,
  }));
};

const computeCards = (entities: string[]) => {
  const defaultCard = [
    {
      collapsed_items: false,
      items: [
        {
          entity: 'sun.sun',
        },
        ...entities.map((entity) => ({
          entity,
        })),
      ],
      title: 'Default Card',
    },
    {
      collapsed_items: true,
      items: [
        {
          entity: 'sun.sun',
        },
        ...entities.map((entity) => ({
          entity,
        })),
      ],
      title: 'Collapsed Card',
    },
  ];
  const customCard = [
    {
      entities: ['sun.sun', ...entities],
      title: 'Custom Card',
      type: 'entities',
    },
  ];
  return {
    default_card: defaultCard,
    custom_card: customCard,
  };
};

const baseButtonCard = (type: 'default' | 'custom' = 'default'): ButtonCardConfig =>
  ({
    button: {
      icon: 'mdi:new-box',
      primary: 'New Button',
      secondary: {
        state_template: 'This is a new button',
      },
    },
    button_type: 'default',
    card_type: type,
    custom_card: [
      {
        entities: ['sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'],
        title: 'Custom Card',
        type: 'entities',
      },
    ],
    default_card: [
      {
        collapsed_items: false,
        items: [
          {
            entity: 'sun.sun',
          },
          {
            entity: 'sensor.sun_next_dawn',
          },
          {
            entity: 'sensor.sun_next_midnight',
          },
          {
            entity: 'sensor.sun_next_noon',
          },
        ],
        title: 'Default Card',
      },
      {
        collapsed_items: true,
        items: [
          {
            entity: 'sun.sun',
          },
          {
            entity: 'sensor.sun_next_dawn',
          },
          {
            entity: 'sensor.sun_next_midnight',
          },
          {
            entity: 'sensor.sun_next_noon',
          },
        ],
        title: 'Collapsed Card',
      },
    ],
    hide_button: false,
  } as ButtonCardConfig);

const createButtonCardArray = (count: number): ButtonCardConfig[] => {
  const buttonCards: ButtonCardConfig[] = [];
  for (let i = 0; i < count; i++) {
    const base = i % 2 === 0 ? 'default' : 'custom';
    const cloned = JSON.parse(JSON.stringify(baseButtonCard(base))) as ButtonCardConfig;
    if (i === 0 || i === 3) {
      cloned.button.notify = `{{ is_state('sun.sun', 'above_horizon') }}`;
      cloned.button.picture_template = `{{ iif (is_state('sun.sun', 'above_horizon'), 'mdi:white-balance-sunny', 'mdi:weather-night') }}`;
      cloned.button.secondary.state_template = `{{ "sun.sun" | state_translated }}`;
      cloned.button.color = `{% set state = states['sun.sun'].state %}
    var(--state-sun-{{ state }}-color)`;
    } else if (i === 1 || i === 2) {
      cloned.button.notify = `{{ states['sun.sun'].state != 'above_horizon' }}`;
      cloned.button.secondary.entity = 'sun.sun';
      cloned.button.icon = '';
      delete cloned.button.secondary.state_template;
    } else {
      cloned.button.icon = `mdi:numeric-${i + 1}-box`;
    }

    buttonCards.push(cloned);
  }
  return buttonCards;
};

const createButton = (hass: HomeAssistant, entity: string): ButtonCardConfig['button'] => {
  const stateObj = hass.states[entity];
  const entityDomain = computeDomain(entity);
  const primary = computeEntityName(stateObj, hass) || entity;
  // const primary = hass.formatEntityAttributeValue(stateObj, 'friendly_name') || stateObj.entity_id;
  const button: ButtonCardConfig['button'] = {
    primary: primary,
    secondary: {
      entity: entity,
    },
    state_color: true,
  } as ButtonCardConfig['button'];
  if (entityDomain === 'person') {
    button.notify_color = `{{ iif (is_state('${entity}', 'home'), 'var(--state-person-home-color)', 'var(--state-person-active-color)') }}`;
    button.notify_icon = `{{ iif (is_state('${entity}', 'home'), 'mdi:home', 'mdi:home-export-outline') }}`;
    button.notify = '{{ true }}';
  }
  if (entityDomain === 'light') {
    button.notify = `{{ true }}`;
    button.notify_color = `{{ iif (is_state('${entity}', 'on'), 'var(--deep-orange-color)', 'var(--disabled-color)') }}`;
    button.notify_icon = `{{ iif (is_state('${entity}', 'on'), 'mdi:lightbulb', 'mdi:lightbulb-off') }}`;
  }
  return button;
};

export const DEFAULT_CONFIG: Partial<VehicleStatusCardConfig> = {
  button_card: [baseButtonCard('default'), baseButtonCard('custom')] as ButtonCardConfig[],
  images: [...getSampleImages()] as ImageConfig[],
  layout_config: {
    button_grid: {
      rows: 2,
      columns: 2,
      swipe: true,
    },
    hide: {
      button_notify: false,
      buttons: false,
      images: false,
      indicators: true,
      range_info: true,
      mini_map: true,
      card_name: false,
      map_address: false,
    },
  },
  name: 'Vehicle Status Card',
  type: 'custom:vehicle-status-card',
};

const findEntities = (hass: HomeAssistant, maxEntities: number, domain: string[]): string[] => {
  const entityIds: string[] = [];

  const getEntities = (domain: string): string[] => {
    let entities = Object.keys(hass.states).filter((entity) => entity.startsWith(`${domain}.`));

    if (domain === 'person') {
      entities = entities.filter((entity) => {
        return hasEntityPicture(hass.states[entity]);
      });
    } else if (domain === 'device_tracker') {
      entities = entities.filter((entity) => {
        return hasLocation(hass.states[entity]);
      });
    }

    return entities.slice(0, maxEntities);
  };

  domain.forEach((d) => {
    const entities = getEntities(d);
    entityIds.push(...entities);
  });

  return entityIds;
};

const entitiesWithEntityPicture = ['person', 'device_tracker', 'media_player'] as const;

const getDefaultButtonCards = (hass: HomeAssistant): ButtonCardConfig[] => {
  const entities = [
    ...findEntities(hass, 1, [...entitiesWithEntityPicture]),
    ...findEntities(hass, 2, ['light', 'binary_sensor']),
  ];
  console.log('entities:', entities.length, entities);
  const buttonCards: ButtonCardConfig[] = [];
  entities.forEach((entity, index) => {
    const base = index % 2 === 0 ? 'default' : 'custom';
    const button = createButton(hass, entity);
    const entityDomain = computeDomain(entity);
    // Clone the base card and set the button
    const cloned = JSON.parse(JSON.stringify(baseButtonCard(base))) as ButtonCardConfig;
    cloned.button = button;
    if ([...entitiesWithEntityPicture, 'light'].includes(entityDomain)) {
      cloned.button_action = {
        entity: entity,
        tap_action: {
          action: ['person', 'device_tracker'].includes(entityDomain) ? 'more-info' : 'toggle',
        },
      };
      cloned.button_type = 'action';
    }
    buttonCards.push(cloned);
  });
  // console.log('buttonCards:', buttonCards.length, buttonCards);
  // Ensure we have at least 8 button cards
  while (buttonCards.length < MAX_BUTTON_CARDS) {
    const sampleButtonCards = createButtonCardArray(MAX_BUTTON_CARDS - buttonCards.length);
    buttonCards.push(...sampleButtonCards);
  }
  if (entities.length) {
    const updatedCards = computeCards(entities);
    buttonCards.forEach((card) => {
      card.default_card = updatedCards.default_card;
      card.custom_card = updatedCards.custom_card;
    });
    // console.log('Updated button cards with computed cards:', updatedCards);
    // console.log('buttonCards after update:', buttonCards);
  }

  return buttonCards;
};

const getRangeInfo = (hass: HomeAssistant): RangeInfoConfig[] | void => {
  const entities = Object.values(hass.states);
  const batteryOrPowerEntity = findPowerEntities(hass, entities);
  const chargingBatteryEntity = findBatteryChargingEntity(hass, entities);
  const distanceEntities = findEntitiesByClass(hass, entities, 'distance');

  if (!batteryOrPowerEntity?.length) return;

  const createRangeInfo = (
    energyIdx: number,
    distanceIdx: number,
    options: Partial<RangeInfoConfig> = {}
  ): RangeInfoConfig => ({
    energy_level: {
      entity: batteryOrPowerEntity[energyIdx]?.entity_id || '',
      icon: hass.states[batteryOrPowerEntity[energyIdx]?.entity_id]?.attributes?.icon || 'mdi:battery',
      tap_action: { action: 'more-info' },
      value_position: options.energy_level?.value_position,
    },
    range_level: {
      entity: distanceEntities?.[distanceIdx]?.entity_id || '',
      value_position: options.range_level?.value_position,
    },
    charging_entity: chargingBatteryEntity?.entity_id || '',
    progress_color: options.progress_color || '#4caf50',
    bar_height: 16,
    bar_radius: 8,
    charging_template: '{{ true }}',
  });

  const defaultRangeInfo = createRangeInfo(0, 0);

  const insideValueRangeInfo = createRangeInfo(1, 1, {
    energy_level: { value_position: 'inside' },
    range_level: { value_position: 'inside' },
    progress_color: '#2196f3',
  });

  // Remove charging_template from second range info
  delete insideValueRangeInfo.charging_template;

  return [defaultRangeInfo, insideValueRangeInfo];
};

const getIndicators = (hass: HomeAssistant): Partial<IndicatorsConfig> | void => {
  const singleIndicators = [...findEntities(hass, 1, ['sensor', 'binary_sensor', 'switch'])];
  console.log('singleIndicators:', singleIndicators.length, singleIndicators);
  if (!singleIndicators.length) return;
  const single: IndicatorConfig[] = singleIndicators.map((entity) => {
    return { entity: entity, action_config: { tap_action: { action: 'more-info' } } };
  });
  // Add single indicator
  const lights = findEntities(hass, 4, ['light']);
  const motions = [
    ...(findEntitiesByClass(hass, Object.values(hass.states), 'motion', 4)?.map((entity) => entity.entity_id) || []),
  ];

  const createGroupIndicator = (name: string, entities: string[]): IndicatorGroupConfig => ({
    name: name,
    items: entities.map((entity) => ({
      entity: entity,
      name:
        computeEntityName(hass.states[entity], hass) ||
        hass.formatEntityAttributeValue(hass.states[entity], 'friendly_name') ||
        '',
    })),
  });

  const groups: IndicatorGroupConfig[] = [];
  if (lights.length) {
    const lightGroup: IndicatorGroupConfig = createGroupIndicator('Lights', lights);
    groups.push(lightGroup);
  }
  if (motions.length) {
    const motionGroup: IndicatorGroupConfig = createGroupIndicator('Motions', motions);
    groups.push(motionGroup);
  }
  console.log('groups:', groups.length, groups);
  return {
    single: single,
    group: groups,
  } as IndicatorsConfig;
};

export const getDefaultConfig = async (hass: HomeAssistant) => {
  const deviceTracker = findEntities(hass, 1, ['device_tracker']);
  const buttonCards: ButtonCardConfig[] = getDefaultButtonCards(hass);
  const rangeInfo = getRangeInfo(hass);
  const indicators = getIndicators(hass);

  let clonedConfig = { ...DEFAULT_CONFIG } as VehicleStatusCardConfig;

  if (deviceTracker.length) {
    const miniMapConfig = { ...(clonedConfig.mini_map || {}) } as MiniMapConfig;
    const layoutConfig = { ...(clonedConfig.layout_config || {}) };
    const layoutHide = { ...(layoutConfig.hide || {}) };
    miniMapConfig.device_tracker = deviceTracker[0];
    miniMapConfig.enable_popup = true;
    clonedConfig.mini_map = miniMapConfig;
    layoutConfig.hide = {
      ...layoutHide,
      mini_map: false,
    };
    clonedConfig.layout_config = layoutConfig;
  }
  if (buttonCards.length) {
    let buttonCardConfig = { ...(clonedConfig.button_card || []) };
    buttonCardConfig = buttonCards;
    clonedConfig.button_card = buttonCardConfig;
  }
  if (rangeInfo) {
    let rangeInfoConfig = { ...(clonedConfig.range_info || []) } as RangeInfoConfig[];
    let layoutHide = { ...(clonedConfig.layout_config?.hide || {}) };
    rangeInfoConfig = rangeInfo;
    clonedConfig.range_info = rangeInfoConfig;
    clonedConfig.layout_config = {
      ...clonedConfig.layout_config,
      hide: {
        ...layoutHide,
        range_info: false,
      },
      range_info_config: {
        layout: 'row',
      },
    };
  }
  if (indicators) {
    let indicatorsConfig = { ...(clonedConfig.indicators || {}) } as IndicatorsConfig;
    let layoutHide = { ...(clonedConfig.layout_config?.hide || {}) };
    indicatorsConfig = indicators;
    clonedConfig.indicators = indicatorsConfig;
    clonedConfig.layout_config = {
      ...clonedConfig.layout_config,
      hide: {
        ...layoutHide,
        indicators: false,
      },
    };
  }

  return clonedConfig as VehicleStatusCardConfig;
};
