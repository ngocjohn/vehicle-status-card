import { capitalize } from 'es-toolkit';
import { omit } from 'es-toolkit/compat';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import { fireEvent } from '../../../ha';
import { ButtonArea } from '../../../types/config-area';
import { BaseButtonCardItemConfig, CardType } from '../../../types/config/card/button-card';
import '../../../utils/editor/sub-editor-header';
import { Create } from '../../../utils';
import { createSecondaryCodeLabel } from '../../../utils/editor/sub-editor-header';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { SUB_PANEL } from '../../editor-const';
import { MAIN_BUTTON_SCHEMA } from '../../form';

declare global {
  interface HASSDomEvents {
    'sub-button-closed': undefined;
    'sub-button-changed': { btnConfig: BaseButtonCardItemConfig };
  }
}

@customElement(SUB_PANEL.BTN_MAIN)
export class PanelButtonCardMain extends ButtonCardBaseEditor {
  @property({ attribute: false }) public _btnConfig!: BaseButtonCardItemConfig;
  @state() private _selectedArea: ButtonArea = ButtonArea.BASE;
  @state() private _yamlActive: boolean = false;

  constructor() {
    super();
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_selectedArea')) {
      this.currentArea = this._selectedArea;
    }
  }

  protected render(): TemplateResult {
    const infoState = this._computeInfoState();
    return html`
      <sub-editor-header
        ._label=${infoState.label}
        .secondary=${infoState.secondary}
        .hidePrimaryAction=${this._yamlActive}
        .primaryIcon=${infoState.icon}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        @primary-action=${this._goBack}
        @secondary-action=${this._toggleYamlMode}
      ></sub-editor-header>
      <div class="base-config gap">${this._renderSelectedArea()}</div>
    `;
  }

  private _renderSelectedArea(): TemplateResult {
    const area = this._selectedArea;
    const areaMap = {
      [ButtonArea.BASE]: this._renderBaseEditor(),
      [ButtonArea.SUB_CUSTOM]: this._renderCustomCardEditor(),
      [ButtonArea.SUB_DEFAULT]: this._renderDefaultCardEditor(),
      [ButtonArea.SUB_TIRE]: this._renderTireCardEditor(),
    };
    return areaMap[area];
  }
  private _renderBaseEditor(): TemplateResult {
    const data = omit(this._btnConfig || {}, ['sub_card']);
    const baseButtonSchema = MAIN_BUTTON_SCHEMA(data);
    const baseForm = this._createVscForm(data, baseButtonSchema);

    return html` ${baseForm} ${this._renderSubCardSelect()} `;
  }

  private _renderCustomCardEditor(): TemplateResult {
    return html`This is custom card editor.`;
  }
  private _renderDefaultCardEditor(): TemplateResult {
    return html`This is default card editor.`;
  }
  private _renderTireCardEditor(): TemplateResult {
    return html`This is tire card editor.`;
  }

  private _renderSubCardSelect(): TemplateResult {
    const content = html`
      <div class="sub-card-types">
        ${CardType.map(
          (type) => html`
            <ha-button
              size="small"
              appearance="filled"
              @click=${() => (this._selectedArea = `${type}_card` as ButtonArea)}
            >
              ${capitalize(type)} Card
            </ha-button>
          `
        )}
      </div>
    `;
    const expansionOpts = {
      header: 'Sub Card Configuration',
      icon: 'mdi:cards-outline',
    };

    return Create.ExpansionPanel({
      content,
      options: expansionOpts,
    });
  }

  private _computeInfoState() {
    const area = this._selectedArea;
    const label = area === ButtonArea.BASE ? 'BUTTON' : 'SUB-CARD';
    const secondary = area === ButtonArea.BASE ? '' : capitalize(area.replace('_', ' '));
    const icon = area === ButtonArea.BASE ? 'close' : 'back';

    return { label: capitalize(label), secondary, icon };
  }

  private _goBack() {
    const currentArea = this._selectedArea;
    switch (currentArea) {
      case ButtonArea.BASE:
        fireEvent(this, 'sub-button-closed');
        break;
      default:
        this._selectedArea = ButtonArea.BASE;
        this.currentArea = this._selectedArea;
        break;
    }
  }

  private _toggleYamlMode() {
    this._yamlActive = !this._yamlActive;
  }

  protected _onValueChanged(ev: CustomEvent): void {
    console.debug('onValueChanged (PanelButtonCardMain)');
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    const newConfig = { ...this._btnConfig, ...value };
    fireEvent(this, 'sub-button-changed', { btnConfig: newConfig });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          display: block;
          height: 100%;
        }
        .sub-card-types {
          display: flex;
          flex-direction: row;
          gap: 8px;
          justify-content: space-evenly;
        }
        .sub-card-types ha-button {
          flex: 1 1 auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-card-main': PanelButtonCardMain;
  }
}
