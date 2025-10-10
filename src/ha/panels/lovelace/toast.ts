import { fireEvent } from '../../common/dom/fire_event';

export interface ShowToastParams {
  // Unique ID for the toast. If a new toast is shown with the same ID as the previous toast, it will be replaced to avoid flickering.
  id?: string;
  message: string;
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
}

export interface ToastActionParams {
  action: () => void;
  text: string;
}

export const showToast = (el: HTMLElement, params: ShowToastParams) => fireEvent(el, 'hass-notification', params);

declare global {
  interface HASSDomEvents {
    'hass-notification': ShowToastParams;
  }
}
