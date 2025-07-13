import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { BaseButtonConfig, HomeAssistant } from '../../types';
import { _dispatchEvent } from '../../utils';
import { BASE_BUTTON_ACTION_SCHEMA, BASE_BUTTON_APPEARANCE_SCHEMA, BASE_BUTTON_SCHEMA } from '../form';

@customElement('vsc-panel-base-button')
export class PanelBaseButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) buttonConfig!: BaseButtonConfig;

  @state() public yamlMode: boolean = false;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .sub-content {
          margin-bottom: unset;
        }
      `,
      editorcss,
    ];
  }

  protected render(): TemplateResult {
    const baseBtnType = this._renderBaseButtonType();
    const btnAppearance = this._renderButtonAppearance();
    const btnAction = this._renderButtonAction();
    return !this.yamlMode
      ? html`<div class="indicator-config">
          ${baseBtnType} ${btnAppearance} ${btnAction}
          <ha-button @click=${() => (this.yamlMode = true)} .label=${'Edit YAML'}></ha-button>
        </div>`
      : this._renderYamlEditor();
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <vsc-sub-panel-yaml
        .hass=${this.hass}
        .configDefault=${this.buttonConfig}
        .extraAction=${true}
        @close-editor=${() => (this.yamlMode = false)}
        @yaml-config-changed=${this._handleYamlConfigChanged}
      ></vsc-sub-panel-yaml>
    `;
  }

  private _renderBaseButtonType(): TemplateResult {
    return this._createHaForm(BASE_BUTTON_SCHEMA(this.buttonConfig?.button_type === 'action'));
  }

  private _renderButtonAppearance(): TemplateResult {
    const buttonEntity = this.buttonConfig?.button?.secondary?.entity || '';
    return this._createHaForm(BASE_BUTTON_APPEARANCE_SCHEMA(buttonEntity));
  }

  private _renderButtonAction(): TemplateResult {
    return this._createHaForm(BASE_BUTTON_ACTION_SCHEMA);
  }

  private _handleYamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid) return;
    console.log('YAML config changed:', value);
    this._dispatchConfigChange(value);
  }

  private _createHaForm = (schema: any) => {
    const DATA = { ...this.buttonConfig };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${DATA}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  };

  private _computeLabel(schema: any) {
    if (schema.name === 'entity') {
      return '';
    }
    return schema.label || schema.name;
  }
  private _computeHelper(schema: any) {
    return schema.helper || '';
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.buttonConfig) return;
    const config = ev.detail.value;
    // console.log('Tire config changed:', config);
    this._dispatchConfigChange(config);
  }

  private _dispatchConfigChange(newConfig: BaseButtonConfig): void {
    if (!this.buttonConfig) return;
    this.buttonConfig = { ...this.buttonConfig, ...newConfig };
    const detail = { config: this.buttonConfig };

    // Dispatch a custom event with the updated configuration
    _dispatchEvent(this, 'button-config-changed', detail);
    // const event = new CustomEvent('button-config-changed', {
    //   detail: { config: this.buttonConfig },
    //   bubbles: true,
    //   composed: true,
    // });
    // this.dispatchEvent(event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-panel-base-button': PanelBaseButton;
  }
}
