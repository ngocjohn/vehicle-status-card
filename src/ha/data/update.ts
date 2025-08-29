import type { HassEntities, HassEntityAttributeBase, HassEntityBase } from 'home-assistant-js-websocket';

import type { HomeAssistant } from '../types';

import { computeStateDomain } from '../common/entity/compute_state_domain';
import { supportsFeature } from '../common/entity/supports-feature';
import { formatNumber } from '../common/number/format_number';
import { caseInsensitiveStringCompare } from '../common/string/compare';

/** Binary States */
export const BINARY_STATE_ON = 'on';
export const BINARY_STATE_OFF = 'off';

export enum UpdateEntityFeature {
  INSTALL = 1,
  SPECIFIC_VERSION = 2,
  PROGRESS = 4,
  BACKUP = 8,
  RELEASE_NOTES = 16,
}

interface UpdateEntityAttributes extends HassEntityAttributeBase {
  auto_update: boolean | null;
  display_precision: number;
  installed_version: string | null;
  in_progress: boolean;
  latest_version: string | null;
  release_summary: string | null;
  release_url: string | null;
  skipped_version: string | null;
  title: string | null;
  update_percentage: number | null;
}

export interface UpdateEntity extends HassEntityBase {
  attributes: UpdateEntityAttributes;
}

export const updateUsesProgress = (entity: UpdateEntity): boolean =>
  supportsFeature(entity, UpdateEntityFeature.PROGRESS) && entity.attributes.update_percentage !== null;

export const updateCanInstall = (entity: UpdateEntity, showSkipped = false): boolean =>
  (entity.state === BINARY_STATE_ON || (showSkipped && Boolean(entity.attributes.skipped_version))) &&
  supportsFeature(entity, UpdateEntityFeature.INSTALL);

export const latestVersionIsSkipped = (entity: UpdateEntity): boolean =>
  !!(entity.attributes.latest_version && entity.attributes.skipped_version === entity.attributes.latest_version);

export const updateButtonIsDisabled = (entity: UpdateEntity): boolean =>
  entity.state === BINARY_STATE_OFF && !latestVersionIsSkipped(entity);

export const updateIsInstalling = (entity: UpdateEntity): boolean => !!entity.attributes.in_progress;

export const updateReleaseNotes = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<string | null>({
    type: 'update/release_notes',
    entity_id: entityId,
  });

const HOME_ASSISTANT_CORE_TITLE = 'Home Assistant Core';
const HOME_ASSISTANT_SUPERVISOR_TITLE = 'Home Assistant Supervisor';
const HOME_ASSISTANT_OS_TITLE = 'Home Assistant Operating System';

export const filterUpdateEntities = (entities: HassEntities, language?: string) =>
  (Object.values(entities).filter((entity) => computeStateDomain(entity) === 'update') as UpdateEntity[]).sort(
    (a, b) => {
      if (a.attributes.title === HOME_ASSISTANT_CORE_TITLE) {
        return -3;
      }
      if (b.attributes.title === HOME_ASSISTANT_CORE_TITLE) {
        return 3;
      }
      if (a.attributes.title === HOME_ASSISTANT_OS_TITLE) {
        return -2;
      }
      if (b.attributes.title === HOME_ASSISTANT_OS_TITLE) {
        return 2;
      }
      if (a.attributes.title === HOME_ASSISTANT_SUPERVISOR_TITLE) {
        return -1;
      }
      if (b.attributes.title === HOME_ASSISTANT_SUPERVISOR_TITLE) {
        return 1;
      }
      return caseInsensitiveStringCompare(
        a.attributes.title || a.attributes.friendly_name || '',
        b.attributes.title || b.attributes.friendly_name || '',
        language
      );
    }
  );

export const filterUpdateEntitiesWithInstall = (entities: HassEntities, showSkipped = false) =>
  filterUpdateEntities(entities).filter((entity) => updateCanInstall(entity, showSkipped));

// When updating, and entity does not support % show "Installing"
// When updating, and entity does support % show "Installing (xx%)"
// When update available, show "Update available"
// When the latest version is skipped, show the latest version
// When update is not available, show "Up-to-date"
// When update is not available and there is no latest_version show "Unavailable"
export const computeUpdateStateDisplay = (stateObj: UpdateEntity, hass: HomeAssistant): string => {
  const state = stateObj.state;
  const attributes = stateObj.attributes;

  if (state === 'off') {
    const isSkipped = attributes.latest_version && attributes.skipped_version === attributes.latest_version;
    if (isSkipped) {
      return attributes.latest_version!;
    }
    return hass.formatEntityState(stateObj);
  }

  if (state === 'on') {
    if (updateIsInstalling(stateObj)) {
      const supportsProgress =
        supportsFeature(stateObj, UpdateEntityFeature.PROGRESS) && attributes.update_percentage !== null;
      if (supportsProgress) {
        return hass.localize('ui.card.update.installing_with_progress', {
          progress: formatNumber(attributes.update_percentage!, hass.locale, {
            maximumFractionDigits: attributes.display_precision,
            minimumFractionDigits: attributes.display_precision,
          }),
        });
      }
      return hass.localize('ui.card.update.installing');
    }
  }

  return hass.formatEntityState(stateObj);
};

export type UpdateType = 'addon' | 'home_assistant' | 'home_assistant_os' | 'generic';
