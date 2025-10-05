import { CSSResultGroup, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { LayoutConfig, VehicleStatusCardConfig } from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import {
  CARD_THEME_SCHEMA,
  SECTION_ORDER_SCHEMA_EXPAND,
  BUTTON_GRID_LAYOUT_SCHEMA,
  NAME_SCHEMA,
  HIDE_CARD_NAME_SCHEMA,
  IMAGES_LAYOUT_SCHEMA,
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
    ];
    const createForm = (form: any) => {
      return this._createVscForm(LAYOUT_DATA, form, 'layout_config');
    };

    return html` <div class="sub-panel-config">${nameForm} ${schemasForms.map((form) => createForm(form))}</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-layout-editor': PanelLayoutEditor;
  }
}
