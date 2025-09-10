import { HomeAssistant, LovelaceConfig } from '../../ha';
import { IndicatorRowItem, LovelaceMapPopupConfig } from '../../types/config';

export interface LovelaceMapPopupEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceMapPopupConfig): void;
}

export interface LovelaceIndicatorRowEditor extends LovelaceGenericElementEditor {
  setConfig(config: IndicatorRowItem): void;
}

export interface LovelaceGenericElementEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  setConfig(config: any): void;
  focusYamlEditor?: () => void;
}
