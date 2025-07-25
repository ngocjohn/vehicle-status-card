import type {
  TireTemplateConfig,
  TireEntity,
  TireTemplateEntities,
  TireEntityConfig,
  TireItem,
  TiresConfig,
} from '../../types/config';

import { HomeAssistant } from '../../ha';

/**
 *
 * @param hass Home Assistant instance
 * @param tireCard Tire card configuration
 * @returns Promise that resolves to a TireEntity object containing tire information
 */
export async function getTireCard(hass: HomeAssistant, tireCard: TireTemplateConfig): Promise<TireEntity> {
  let tireCardItem: TireEntity = {} as TireEntity;

  const tires: TiresConfig = {
    front_left: createTireItem(hass, 'front_left', tireCard.front_left),
    front_right: createTireItem(hass, 'front_right', tireCard.front_right),
    rear_left: createTireItem(hass, 'rear_left', tireCard.rear_left),
    rear_right: createTireItem(hass, 'rear_right', tireCard.rear_right),
  };

  tireCardItem = {
    title: tireCard.title || '',
    background: tireCard.background || '',
    background_entity: tireCard.background_entity || '',
    image_size: tireCard.image_size || 100,
    value_size: tireCard.value_size || 100,
    top: tireCard.top || 50,
    left: tireCard.left || 50,
    horizontal: tireCard.horizontal || false,
    hide_rotation_button: tireCard.hide_rotation_button || false,
    tires: tires,
  };

  return tireCardItem;
}

const createTireItem = (hass: HomeAssistant, key: keyof TireTemplateEntities, item: TireEntityConfig): TireItem => {
  const { entity, attribute, name, color } = item;

  const state =
    entity && hass.states[entity]
      ? attribute
        ? hass.formatEntityAttributeValue(hass.states[entity], attribute)
        : hass.formatEntityState(hass.states[entity])
      : 'N/A'; // If the entity exists but has no state, set 'N/A'

  const itemName = name || key.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
  return {
    state,
    name: itemName,
    color: color || '',
  };
};
