import { HomeAssistant } from '../types';

export interface HaPictureUpload extends HTMLElement {
  hass: HomeAssistant;
  _chooseMedia: () => void;
}
