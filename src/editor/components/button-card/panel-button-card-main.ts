import { capitalize } from 'es-toolkit';
import { omit } from 'es-toolkit/compat';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { fireEvent } from '../../../ha';
import { ButtonArea } from '../../../types/config-area';
import '../../../utils/editor/sub-editor-header';
import { BaseButtonCardItemConfig, CardType } from '../../../types/config/card/button-card';
import { Create } from '../../../utils';
import { createSecondaryCodeLabel } from '../../../utils/editor/sub-editor-header';
import { SubElementEditorConfig } from '../../../utils/editor/types';
import { computeVerticalStackConfig } from '../../../utils/lovelace/create-custom-card';
import { ButtonCardBaseEditor, PreviewType } from '../../button-card-base';
import '../../shared/vsc-sub-element-editor';
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
  @state() private _customCardConfig?: SubElementEditorConfig;

  constructor() {
    super();
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_selectedArea')) {
      this.currentArea = this._selectedArea;
    }
    const oldArea = _changedProperties.get('_selectedArea');
    if (oldArea !== undefined && oldArea !== this._selectedArea && this.activePreview !== null) {
      this.activePreview = null;
      this._togglePreview(this.activePreview);
    } else if (
      oldArea === ButtonArea.SUB_CUSTOM &&
      this._selectedArea !== ButtonArea.SUB_CUSTOM &&
      this._customCardConfig !== undefined
    ) {
      this._customCardConfig = undefined;
    }
  }
  disconnectedCallback(): void {
    // reset preview when editor is closed
    super._togglePreview(null);
    super.disconnectedCallback();
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
      return this._createVscYamlEditor(btnConfig);
    }
    const data = btnConfig?.sub_card?.[area];
    const key = 'sub_card';
    const subKey = area;
    return this._createVscYamlEditor(data, key, subKey);
  }

  private _renderBaseEditor(): TemplateResult {
    const data = omit(this._btnConfig || {}, ['sub_card']);
    const baseButtonSchema = MAIN_BUTTON_SCHEMA(data);
    const baseForm = this._createVscForm(data, baseButtonSchema, 'base');

    return html` ${baseForm} ${this._renderSubCardSelect()} `;
  }

  private _renderCustomCardEditor(): TemplateResult {
    if (this._selectedArea !== ButtonArea.SUB_CUSTOM) {
      return html``;
    }
    return html`
      <vsc-sub-element-editor
        hide-header
        ._hass=${this._hass}
        ._store=${this._store}
        ._config=${this._customCardConfig}
        @config-changed=${this._handleCustomCardConfigChanged}
      ></vsc-sub-element-editor>
    `;
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
            <ha-button size="small" appearance="filled" @click=${() => this._handleSelectSubCard(type)}>
              ${capitalize(type)} Card
            </ha-button>
          `
        )}
      </div>
    `;
    const expansionOpts = {
      header: 'Sub Card Configuration',
      icon: 'mdi:cards-outline',
      secondary: 'Select a sub-card type to configure',
    };

    return Create.ExpansionPanel({
      content,
      options: expansionOpts,
    });
  }

  private _computeInfoState() {
    const btnIndexLabel = `Button #${this._btnIndex + 1} `;
    const area = this._selectedArea;
    const isBase = area === ButtonArea.BASE;
    let label = isBase ? 'Main Configuration' : `${area.replace('_', ' ').toUpperCase()}`;
    const secondary = isBase ? btnIndexLabel : `${btnIndexLabel} · Sub-Card`;
    const icon = isBase ? 'close' : 'back';
    return { label, secondary, icon };
  }

  private _handleSelectSubCard(type: (typeof CardType)[number]): void {
    console.debug('Select sub card type:', type);
    switch (type) {
      case 'custom':
        const customConfig = this._btnConfig?.sub_card?.custom_card || [];
        const elementConfig = computeVerticalStackConfig(customConfig);
        this._customCardConfig = {
          type: 'Custom Card configuration',
          elementConfig,
        };
        this._selectedArea = ButtonArea.SUB_CUSTOM;
        break;
      case 'default':
        this._selectedArea = ButtonArea.SUB_DEFAULT;
        break;
      case 'tire':
        this._selectedArea = ButtonArea.SUB_TIRE;
        break;
    }
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
    this._togglePreview(this.activePreview);
  }

  public _reoloadPreview(): void {
    if (this.activePreview !== null) {
      this._togglePreview(this.activePreview);
    }
  }

  private _goBack(): void {
    const currentArea = this._selectedArea;
    switch (currentArea) {
      case ButtonArea.BASE:
        fireEvent(this, 'sub-button-closed');
        break;
      default:
        this._selectedArea = ButtonArea.BASE;
        break;
    }
  }

  private _toggleYamlMode() {
    this._yamlActive = !this._yamlActive;
  }

  private _handleCustomCardConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail || !this._btnConfig || !this._customCardConfig) {
      return;
    }
    const config = { ...ev.detail.config } as any;
    console.debug('Custom Card Config Changed:', config);
    this._customCardConfig = {
      ...this._customCardConfig,
      elementConfig: config,
    };
    const btnConfig = { ...(this._btnConfig || {}) } as BaseButtonCardItemConfig;
    btnConfig.sub_card = {
      ...(btnConfig.sub_card || {}),
      custom_card: config.cards || [],
    };
    this._btnConfigChanged(btnConfig);
  }

  protected _onYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail || !this._btnConfig) {
      return;
    }
    console.debug('onYamlChanged (PanelButtonCardMain)');
    const { key, subKey } = ev.currentTarget as any;
    const value = ev.detail;
    // console.debug('YAML changed:', { key, subKey, value });
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
    this._btnConfigChanged(newConfig);
  }

  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('onValueChanged (PanelButtonCardMain)');
    if (!ev.detail || !this._btnConfig) {
      return;
    }
    const key = (ev.currentTarget as any).key;
    const currentConfig = { ...(this._btnConfig ?? {}) } as BaseButtonCardItemConfig;
    const incoming = ev.detail.value as Partial<BaseButtonCardItemConfig>;
    if (key && key === 'base') {
      // Case base config without sub_card
      const baseConfig = omit(currentConfig, ['sub_card']);
      // merge with cleanup
      let changed = this.mergeWithCleanup(baseConfig, incoming);
      // ---- normalize state_content against include_state_template ----
      const include = !!baseConfig.include_state_template;
      const raw = baseConfig.state_content as string | string[] | undefined;

      const normalized = this._applyTemplateFlagStable(this._toArray(raw), include);
      const normalizedOrUndef = normalized.length ? normalized : undefined;

      // only set/delete if it actually changes something
      const before = Array.isArray(raw) ? raw : this._toArray(raw);
      if (normalizedOrUndef === undefined) {
        if ('state_content' in baseConfig) {
          delete baseConfig.state_content;
          changed = true;
        }
      } else if (!this._arrayEq(before, normalizedOrUndef)) {
        baseConfig.state_content = normalizedOrUndef;
        changed = true;
      }
      if (!changed) {
        console.debug('No changes detected in base config');
        return;
      }
      // if changed, update the button config
      console.debug('Base config changed, updating...');
      // re-add sub_card if exists
      const newConfig: BaseButtonCardItemConfig = {
        ...baseConfig,
        sub_card: currentConfig.sub_card ? { ...currentConfig.sub_card } : undefined,
      };
      this._btnConfigChanged(newConfig);
    } else {
      // no change
      console.debug('No changes detected (non-base config)');
      return;
    }
  }

  // helpers
  private mergeWithCleanup = (dest: Record<string, any>, src: Record<string, any>): boolean => {
    let changed = false;
    for (const key of Object.keys(src)) {
      const v = src[key];
      if (v === undefined || v === '') {
        if (key in dest) {
          delete dest[key];
          changed = true;
        }
      } else if (dest[key] !== v) {
        dest[key] = v;
        changed = true;
      }
    }
    return changed;
  };

  private _toArray(v: string | string[] | undefined): string[] {
    return Array.isArray(v) ? v.slice() : v ? [v] : [];
  }

  // keep original order, dedupe by keeping first occurrence
  private _dedupeKeepFirst(arr: string[]): string[] {
    return arr.filter((v, i) => arr.indexOf(v) === i);
  }

  private _applyTemplateFlagStable(arr: string[], include: boolean): string[] {
    const base = this._dedupeKeepFirst(arr.filter(Boolean));
    const has = base.includes('state_template');
    if (include && !has) return [...base, 'state_template'];
    if (!include && has) return base.filter((v) => v !== 'state_template');
    return base;
  }

  private _arrayEq(a?: string[], b?: string[]): boolean {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  private _btnConfigChanged(btnConfig: BaseButtonCardItemConfig): void {
    fireEvent(this, 'sub-button-changed', { btnConfig: btnConfig });
    if (this.activePreview !== null) {
      this._togglePreview(this.activePreview);
    }
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
