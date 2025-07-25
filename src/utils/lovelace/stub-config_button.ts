import { HassEntity } from 'home-assistant-js-websocket';

import type { ButtonCardConfig, DefaultCardConfig } from '../../types/config';

import { HomeAssistant, computeEntityName, computeDomain, LovelaceCardConfig, getEntitiesByDomain } from '../../ha';

const MAX_BUTTON_CARDS = 8;

const BASE_ENTITIES = ['sun.sun', 'sensor.sun_next_dawn', 'sensor.sun_next_midnight', 'sensor.sun_next_noon'];

const createDefaultCard = (
  title: string,
  collapsed: boolean,
  entities: string[] = BASE_ENTITIES
): DefaultCardConfig => ({
  title,
  collapsed_items: collapsed,
  items: entities.map((entity) => ({
    entity,
  })),
});

const createCustomCard = (title: string, entities: string[] = BASE_ENTITIES): LovelaceCardConfig => ({
  type: 'entities',
  title,
  entities: entities.map((entity) => ({ entity })),
});

const createDefaultAndCustom = (
  contentEntities: string[] = BASE_ENTITIES
): {
  default: DefaultCardConfig[];
  custom: LovelaceCardConfig[];
} => ({
  default: [
    createDefaultCard('Category default expanded', false, contentEntities),
    createDefaultCard('Category collapsed', true, contentEntities),
  ],
  custom: [createCustomCard('Custom Card', contentEntities)],
});

export const createButtonCard = (
  type: 'default' | 'custom' = 'default',
  contentEntities: string[] = BASE_ENTITIES
): ButtonCardConfig => {
  const { default: default_card, custom: custom_card } = createDefaultAndCustom(contentEntities);
  return {
    button: {
      primary: 'New Button',
      icon: 'mdi:new-box',
      secondary: {
        state_template: 'This is a new button',
      },
    },
    button_type: 'default',
    hide_button: false,
    card_type: type,
    default_card,
    custom_card,
  };
};

export const generateButtonConfigArray = (count: number): ButtonCardConfig[] => {
  const buttons: ButtonCardConfig[] = [];
  for (let i = 0; i < count; i++) {
    const base = i % 2 === 0 ? 'default' : 'custom';
    const cloned = JSON.parse(JSON.stringify(createButtonCard(base))) as ButtonCardConfig;
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

    buttons.push(cloned);
  }
  return buttons;
};

export const createButton = (hass: HomeAssistant, entity: string): ButtonCardConfig['button'] => {
  const stateObj = hass.states[entity] as HassEntity;
  const primary = computeEntityName(stateObj, hass) || entity;
  const entityDomain = computeDomain(entity);
  const button: ButtonCardConfig['button'] = {
    primary,
    secondary: { entity },
    state_color: true,
  };
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

const entitiesWithEntityPicture = ['person', 'device_tracker', 'media_player'] as const;

export const generateButtonCardConfig = (hass: HomeAssistant): ButtonCardConfig[] => {
  const entities = [
    ...getEntitiesByDomain(hass.states, 1, [...entitiesWithEntityPicture]),
    ...getEntitiesByDomain(hass.states, 2, ['light', 'binary_sensor']),
  ];

  if (!entities.length) {
    return [];
  }
  const { default: default_card, custom: custom_card } = createDefaultAndCustom(entities);

  const buttonCards: ButtonCardConfig[] = [];
  entities.forEach((entity, index) => {
    const base = index % 2 === 0 ? 'default' : 'custom';
    const button = createButton(hass, entity);
    const entityDomain = computeDomain(entity);
    // Clone the base card and set the button
    const cloned = JSON.parse(JSON.stringify(createButtonCard(base))) as ButtonCardConfig;
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
    cloned.default_card = default_card;
    cloned.custom_card = custom_card;
    buttonCards.push(cloned);
  });

  while (buttonCards.length < MAX_BUTTON_CARDS) {
    const addedCards = generateButtonConfigArray(MAX_BUTTON_CARDS - buttonCards.length);
    buttonCards.push(...addedCards);
  }
  return buttonCards;
};
