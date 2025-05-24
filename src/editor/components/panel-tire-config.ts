import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { HomeAssistant, TireTemplateConfig } from '../../types';
import { Create } from '../../utils';
import { uploadImage } from '../../utils/ha-helper';
import { VehicleStatusCardEditor } from '../editor';
import { DEFAULT_TIRE_CONFIG, TIRE_APPEARANCE_SCHEMA, TIRE_BACKGROUND_SCHEMA, TIRE_ENTITY_SCHEMA } from '../form';

@customElement('vsc-panel-tire-config')
export class PanelTireConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
  @property({ attribute: false }) tireConfig!: TireTemplateConfig;

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
    const tireBackground = this._renderBackground();
    const tireAppearance = this._renderAppearance();
    const tireEntities = this._renderEntities();
    return !this.yamlMode
      ? html` <div class="indicator-config">
          ${tireBackground} ${tireAppearance} ${tireEntities}
          <ha-button @click=${() => (this.yamlMode = true)} .label=${'Edit YAML'}></ha-button>
        </div>`
      : this._renderYamlEditor();
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <vsc-sub-panel-yaml
        .hass=${this.hass}
        .configDefault=${this.tireConfig}
        .extraAction=${true}
        @close-editor=${() => (this.yamlMode = false)}
        @yaml-config-changed=${this._handleYamlConfigChanged}
      ></vsc-sub-panel-yaml>
    `;
  }
  private _renderBackground(): TemplateResult {
    const info = `The image should be square with a maximum resolution of 450x450 pixels. A transparent background is recommended.`;

    const bgForm = this._createHaForm(TIRE_BACKGROUND_SCHEMA);
    const content = html`
      ${Create.HaAlert({
        message: info,
      })}
      ${bgForm}
      <div class="sub-content">
        <ha-button
          @click=${() => this.shadowRoot?.getElementById('file-to-upload')?.click()}
          .label=${'Upload image'}
        ></ha-button>
        <input
          style="display: none;"
          type="file"
          id="file-to-upload"
          @change=${(ev: any) => this.handleFilePicked(ev)}
        />
        ${this.tireConfig.background
          ? html`<ha-button @click=${this._handleAction('reset_background')} .label=${'Use Default'}></ha-button>`
          : nothing}
      </div>
    `;

    return Create.ExpansionPanel({
      content,
      options: { header: 'Background image', secondary: 'Change the background image of the tire card' },
    });
  }

  private _renderAppearance(): TemplateResult {
    const positionLabel = this.tireConfig.horizontal ? 'Horizontal' : 'Vertical';
    const appearanceForm = this._createHaForm(TIRE_APPEARANCE_SCHEMA(positionLabel));
    const content = html`
      ${appearanceForm}
      <div class="sub-content">
        <ha-button @click=${this._handleAction('reset_appearance')} .label=${'Reset to Default'}></ha-button>
      </div>
    `;

    return Create.ExpansionPanel({
      content,
      options: {
        header: 'Size & Position',
        secondary: 'Change the size and position of the tire card',
      },
    });
  }

  private _renderEntities(): TemplateResult {
    const _createEntityForm = (tirePosition: string) => {
      const tireEntity = this.tireConfig[tirePosition].entity || '';
      return this._createHaForm(TIRE_ENTITY_SCHEMA(tirePosition, tireEntity));
    };

    const tirePositions = ['front_left', 'front_right', 'rear_left', 'rear_right'];

    const content = html`<div class="indicator-config">
      ${tirePositions.map((position) => _createEntityForm(position))}
    </div>`;

    return Create.ExpansionPanel({
      content,
      options: {
        header: 'Tire Entities',
        secondary: 'Configure the entities for each tire position',
      },
    });
  }
  private _createHaForm = (schema: any) => {
    const DATA = { ...this.tireConfig };
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

  private _handleAction = (action: string) => (ev: Event) => {
    ev.stopPropagation();
    if (!this.tireConfig) return;
    switch (action) {
      case 'reset_background':
        this.tireConfig.background = DEFAULT_TIRE_CONFIG.background;
        this._dispatchConfigChange(this.tireConfig);
        break;
      case 'reset_appearance':
        this.tireConfig = {
          ...this.tireConfig,
          image_size: DEFAULT_TIRE_CONFIG.image_size,
          value_size: DEFAULT_TIRE_CONFIG.value_size,
          top: DEFAULT_TIRE_CONFIG.top,
          left: DEFAULT_TIRE_CONFIG.left,
        };
        this._dispatchConfigChange(this.tireConfig);
        break;
      default:
        console.log('Unknown action');
    }
  };

  private async handleFilePicked(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const url = await uploadImage(this.hass, file);
    if (url) {
      this.tireConfig.background = url;
      this._dispatchConfigChange(this.tireConfig);
    }
  }

  private _handleYamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid) return;
    this._dispatchConfigChange(value);
  }
  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.tireConfig) return;
    const config = ev.detail.value;
    // console.log('Tire config changed:', config);
    this._dispatchConfigChange(config);
  }

  private _dispatchConfigChange(newConfig: TireTemplateConfig): void {
    if (!this.tireConfig) return;
    this.tireConfig = { ...this.tireConfig, ...newConfig };
    const event = new CustomEvent('tire-config-changed', {
      detail: { config: this.tireConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-panel-tire-config': PanelTireConfig;
  }
}
