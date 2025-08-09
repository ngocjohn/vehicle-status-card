import type { HassEntity } from 'home-assistant-js-websocket';

export const supportsFeature = (stateObj: HassEntity, feature: number): boolean =>
  supportsFeatureFromAttributes(stateObj.attributes, feature);

export const supportsFeatureFromAttributes = (attributes: Record<string, any>, feature: number): boolean =>
  (attributes.supported_features! & feature) !== 0;
