import type { HassEntity } from 'home-assistant-js-websocket';

import memoizeOne from 'memoize-one';

import { hsv2rgb, rgb2hex, rgb2hsv } from '../../../utils';
import { isUnavailableState, OFF, UNAVAILABLE } from '../../data/entity';
import { computeCssColor } from '../color/compute-color';
import { computeDomain } from './compute_domain';
import { stateColorCss } from './state_color';

export function stateActive(stateObj: HassEntity, state?: string): boolean {
  const domain = computeDomain(stateObj.entity_id);
  const compareState = state !== undefined ? state : stateObj?.state;

  if (['button', 'event', 'input_button', 'scene'].includes(domain)) {
    return compareState !== UNAVAILABLE;
  }

  if (isUnavailableState(compareState)) {
    return false;
  }

  // The "off" check is relevant for most domains, but there are exceptions
  // such as "alert" where "off" is still a somewhat active state and
  // therefore gets a custom color and "idle" is instead the state that
  // matches what most other domains consider inactive.
  if (compareState === OFF && domain !== 'alert') {
    return false;
  }

  // Custom cases
  switch (domain) {
    case 'alarm_control_panel':
      return compareState !== 'disarmed';
    case 'alert':
      // "on" and "off" are active, as "off" just means alert was acknowledged but is still active
      return compareState !== 'idle';
    case 'cover':
      return compareState !== 'closed';
    case 'device_tracker':
    case 'person':
      return compareState !== 'not_home';
    case 'lawn_mower':
      return ['mowing', 'error'].includes(compareState);
    case 'lock':
      return compareState !== 'locked';
    case 'media_player':
      return compareState !== 'standby';
    case 'vacuum':
      return !['idle', 'docked', 'paused'].includes(compareState);
    case 'valve':
      return compareState !== 'closed';
    case 'plant':
      return compareState === 'problem';
    case 'group':
      return ['on', 'home', 'open', 'locked', 'problem'].includes(compareState);
    case 'timer':
      return compareState === 'active';
    case 'camera':
      return compareState === 'streaming';
  }

  return true;
}

export const _computeStateColor = memoizeOne((stateObj: HassEntity, color?: string) => {
  if (!stateObj) {
    return undefined;
  }
  // Use custom color if active
  if (color) {
    return stateActive(stateObj) ? computeCssColor(color) : undefined;
  }

  // Use light color if the light support rgb
  if (computeDomain(stateObj.entity_id) === 'light' && stateObj.attributes.rgb_color) {
    const hsvColor = rgb2hsv(stateObj.attributes.rgb_color);

    // Modify the real rgb color for better contrast
    if (hsvColor[1] < 0.4) {
      // Special case for very light color (e.g: white)
      if (hsvColor[1] < 0.1) {
        hsvColor[2] = 225;
      } else {
        hsvColor[1] = 0.4;
      }
    }
    return rgb2hex(hsv2rgb(hsvColor));
  }

  // Fallback to state color
  return stateColorCss(stateObj);
});
