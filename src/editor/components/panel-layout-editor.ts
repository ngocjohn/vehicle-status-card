import { CSSResultGroup, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { LayoutConfig, VehicleStatusCardConfig } from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import { Create } from '../../utils';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import {
  CARD_THEME_SCHEMA,
  SECTION_ORDER_SCHEMA_EXPAND,
  BUTTON_GRID_LAYOUT_SCHEMA,
  NAME_SCHEMA,
  HIDE_CARD_NAME_SCHEMA,
  IMAGES_LAYOUT_SCHEMA,
  SINGLE_TIRE_ENABLED_SCHEMA,
  CUSTOM_BACKGROUND_SCHEMA,
} from '../form';

@customElement(PANEL.LAYOUT_EDITOR)
export class PanelLayoutEditor extends BaseEditor {
  @property({ attribute: false }) private _config!: VehicleStatusCardConfig;
  constructor() {
    super(ConfigArea.LAYOUT_CONFIG);
  }
  static get styles(): CSSResultGroup {
    return super.styles;
  }

  protected render(): TemplateResult {
    const config = { ...(this._config || {}) };

    const nameForm = this._createVscForm(
      {
        name: config?.name,
      },
      NAME_SCHEMA
    );

    const LAYOUT_DATA = {
      ...config.layout_config,
    } as LayoutConfig;

    const schemasForms = [
      HIDE_CARD_NAME_SCHEMA(!config?.name || config?.name === ''),
      SECTION_ORDER_SCHEMA_EXPAND,
      BUTTON_GRID_LAYOUT_SCHEMA(!LAYOUT_DATA.button_grid?.swipe, 'button_grid'),
      IMAGES_LAYOUT_SCHEMA(LAYOUT_DATA.images_swipe, 'images_swipe'),
      CARD_THEME_SCHEMA,
      CUSTOM_BACKGROUND_SCHEMA,
    ].map((schema) => this._createVscForm(LAYOUT_DATA, schema, 'layout_config'));

    const singleTireSection = this._renderSingleTireConfig(LAYOUT_DATA);

    return html` <div class="sub-panel-config">${nameForm} ${schemasForms} ${singleTireSection}</div> `;
  }

  private _renderSingleTireConfig(layoutData: LayoutConfig): TemplateResult {
    const enabledForm = this._createVscForm(layoutData, SINGLE_TIRE_ENABLED_SCHEMA, 'layout_config');
    const tireConfig = html`
      <panel-button-card-tire
        ._hass=${this.hass}
        ._store=${this._store}
        .tireConfig=${layoutData.single_tire_card?.tire_card || {}}
        @tire-card-changed=${this._handleTireCardChanged}
      ></panel-button-card-tire>
    `;
    const panelOpts = {
      header: 'Standalone Tire Card',
      icon: 'mdi:car-tire-alert',
      elId: 'tire-card-config',
    };

    return Create.ExpansionPanel({
      content: html`${enabledForm} ${tireConfig}`,
      options: panelOpts,
    });
  }
  private _handleTireCardChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const incoming = ev.detail.config;
    const layoutConfig = {
      ...this._config.layout_config,
      single_tire_card: {
        ...this._config.layout_config?.single_tire_card,
        tire_card: {
          ...incoming,
        },
      },
    };

    this._cardConfigChanged({ layout_config: layoutConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-layout-editor': PanelLayoutEditor;
  }
}
