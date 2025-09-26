import { capitalize } from 'es-toolkit';
import { omit } from 'es-toolkit/compat';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { fireEvent } from '../../../ha';
import { ButtonArea } from '../../../types/config-area';
import { BaseButtonCardItemConfig, CardType } from '../../../types/config/card/button-card';
import '../../../utils/editor/sub-editor-header';
import { Create } from '../../../utils';
import { createSecondaryCodeLabel } from '../../../utils/editor/sub-editor-header';
import { ButtonCardBaseEditor, PreviewType } from '../../button-card-base';
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
        .extraActions=${this._computePreviewBtn()}
      ></sub-editor-header>
      <div class="base-config gap">${this._yamlActive ? this._renderYamlEditor() : this._renderSelectedArea()}</div>
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

  private _renderYamlEditor(): TemplateResult {
    const area = this._selectedArea;
    const btnConfig = this._btnConfig!;
    if (area === ButtonArea.BASE) {
      return this._computeYamlEditor(btnConfig);
    }
    const data = btnConfig?.sub_card?.[area];
    const key = 'sub_card';
    const subKey = area;
    return this._computeYamlEditor(data, key, subKey);
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

  private _computePreviewBtn(): TemplateResult {
    if (this._selectedArea === ButtonArea.BASE) {
      return html``;
    }
    return html` <span @click=${() => this._handlePreviewClick()}> ${this._renderPreviewBtn()} </span> `;
  }

  private _handlePreviewClick(): void {
    console.debug('Preview button clicked');
    if (this.activePreview !== null) {
      this.activePreview = null;
    } else {
      const area = this._selectedArea;
      let previewType: PreviewType | null = null;
      switch (area) {
        case ButtonArea.SUB_CUSTOM:
          previewType = 'custom';
          break;
        case ButtonArea.SUB_DEFAULT:
          previewType = 'default';
          break;
        case ButtonArea.SUB_TIRE:
          previewType = 'tire';
      }
      this.activePreview = previewType;
    }
    console.debug('Active preview:', this.activePreview);
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

  private _computeYamlEditor(configValue: any, key?: string | number, subKey?: string | number): TemplateResult {
    return html`
      <vsc-yaml-editor
        .hass=${this._hass}
        .configDefault=${configValue}
        .key=${key}
        .subKey=${subKey}
        @yaml-value-changed=${this._subBtnYamlChanged.bind(this)}
      ></vsc-yaml-editor>
    `;
  }

  private _subBtnYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('onYamlChanged (PanelButtonCardMain)');
    const { key, subKey } = ev.currentTarget as any;
    const value = ev.detail;
    console.debug('YAML changed:', { key, subKey, value });
    let newConfig: BaseButtonCardItemConfig = {};
    if (!key && !subKey) {
      newConfig = { ...value };
    } else if (key && subKey) {
      newConfig = {
        ...this._btnConfig,
        sub_card: {
          ...(this._btnConfig?.sub_card || {}),
          [subKey]: value,
        },
      };
    } else if (key && !subKey) {
      newConfig = {
        ...this._btnConfig,
        [key]: value,
      };
    }
    fireEvent(this, 'sub-button-changed', { btnConfig: newConfig });
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
