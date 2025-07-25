import type { HassEntityAttributeBase, HassEntityBase } from 'home-assistant-js-websocket';

import type { EntityConfig } from '../../types/config/entity-config';

interface ImageEntityAttributes extends HassEntityAttributeBase {
  access_token: string;
}

export interface ImageEntity extends HassEntityBase {
  attributes: ImageEntityAttributes;
}

export const computeImageUrl = (entity: ImageEntity): string =>
  `/api/image_proxy/${entity.entity_id}?token=${entity.attributes.access_token}&state=${entity.state}`;

export interface EntitiesEditorEvent extends CustomEvent {
  detail: {
    entities?: EntityConfig[];
    item?: any;
  };
  target: EventTarget | null;
}
