import { capitalize } from 'es-toolkit';
import { isEmpty, omit } from 'es-toolkit/compat';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import { fireEvent } from '../../../ha';
import { ButtonArea } from '../../../types/config-area';
import '../../../utils/editor/sub-editor-header';
import {
  BaseButtonCardItemConfig,
  PreviewType,
  PREVIEW,
  ButtonCardSubCardConfig,
} from '../../../types/config/card/button-card';
import { computeVerticalStackConfig, Create } from '../../../utils';
import { createSecondaryCodeLabel } from '../../../utils/editor/sub-editor-header';
import { SubElementEditorConfig } from '../../../utils/editor/types';
import { ButtonCardBaseEditor } from '../../button-card-base';
import '../../shared/vsc-sub-element-editor';
import './panel-button-card-default';
import './panel-button-card-tire';
import { SUB_PANEL } from '../../editor-const';
import { MAIN_BUTTON_SCHEMA } from '../../form';
import { PanelButtonDefaultCard } from './panel-button-card-default';

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
  @state() private _subLabelSecondary?: { label: string; secondary: string | null };

  @query(SUB_PANEL.BTN_DEFAULT_CARD) _defaultCardPanel?: PanelButtonDefaultCard;

  constructor() {
    super();
  }
  connectedCallback(): void {
    super.connectedCallback();
    console.debug('PanelButtonCardMain connected:', this.buttonArea);
  }
  disconnectCallback(): void {
    super.disconnectedCallback();
    console.debug('PanelButtonCardMain disconnected:', this.buttonArea);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_selectedArea')) {
      this.currentArea = this._selectedArea;
    }
    const oldArea = _changedProperties.get('_selectedArea');
    if (oldArea !== undefined && oldArea !== this._selectedArea && this.activePreview !== null) {
      // reset preview and highlight when switching area
      console.debug('Reset preview and highlight due to area change:', oldArea, '->', this._selectedArea);
      this.activePreview = null;
      this._togglePreview(this.activePreview);
      if (!this._customCardConfig) {
        this._customCardConfig = undefined;
      }
    }
  }
  disconnectedCallback(): void {
    // reset preview when editor is closed
    super._togglePreview(null);
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    const infoState = this._computeInfoState();
    const isDefaultCardActive = this._subLabelSecondary !== undefined;

    return html`
      <sub-editor-header
        ._label=${infoState.label}
        .secondary=${infoState.secondary}
        .hidePrimaryAction=${this._yamlActive}
        .hidePrimaryIcon=${isDefaultCardActive}
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
      [ButtonArea.CUSTOM_CARD]: this._renderCustomCardEditor(),
      [ButtonArea.DEFAULT_CARD]: this._renderDefaultCardEditor(),
      [ButtonArea.TIRE_CARD]: this._renderTireCardEditor(),
    };
    return areaMap[area];
  }

  private _renderYamlEditor(): TemplateResult {
    const area = this._selectedArea;
    const btnConfig = this._btnConfig!;
    if (area === ButtonArea.BASE) {
      return this._createVscYamlEditor(btnConfig, undefined, undefined, false);
    }
    const data = btnConfig?.sub_card?.[area];
    const key = 'sub_card';
    const subKey = area;
    return this._createVscYamlEditor(data, key, subKey, false);
  }

  private _renderBaseEditor(): TemplateResult {
    let data = omit(this._btnConfig || {}, ['sub_card']);
    data = {
      ...data,
      button_type: data.button_type ?? 'default',
      card_type: data.card_type ?? 'default',
      icon_type: data.icon_type ?? 'icon',
      primary_info: data.primary_info ?? 'name',
      layout: data.layout ?? 'horizontal',
    };
    const baseButtonSchema = MAIN_BUTTON_SCHEMA(data);
    const baseForm = this._createVscForm(data, baseButtonSchema, 'base');

    return html` ${baseForm} ${this._renderSubCardSelect()} `;
  }

  private _renderCustomCardEditor(): TemplateResult {
    if (this._selectedArea !== ButtonArea.CUSTOM_CARD) {
      return html``;
    }
    return html`
      <vsc-sub-element-editor
        hide-header
        ._hass=${this._hass}
        ._store=${this._store}
        ._config=${this._customCardConfig}
        @sub-element-config-changed=${this._handleCustomCardConfigChanged}
      ></vsc-sub-element-editor>
    `;
  }

  private _renderDefaultCardEditor(): TemplateResult {
    if (this._selectedArea !== ButtonArea.DEFAULT_CARD) {
      return html``;
    }
    const defaultConfig = (this._customCardConfig!.elementConfig as ButtonCardSubCardConfig['default_card']) || [];
    return html`
      <panel-button-card-default
        ._hass=${this._hass}
        ._store=${this._store}
        ._defaultCardConfig=${defaultConfig}
        @default-card-changed=${this._handleCustomCardConfigChanged}
        @card-item-label-secondary-changed=${this._handleLabelSecondaryChanged}
      ></panel-button-card-default>
    `;
  }

  private _renderTireCardEditor(): TemplateResult {
    if (this._selectedArea !== ButtonArea.TIRE_CARD) {
      return html``;
    }
    return html`
      <panel-button-card-tire
        ._hass=${this._hass}
        ._store=${this._store}
        .tireConfig=${(this._customCardConfig!.elementConfig as ButtonCardSubCardConfig['tire_card']) || {}}
        @tire-card-changed=${this._handleCustomCardConfigChanged}
      ></panel-button-card-tire>
    `;
  }

  private _renderSubCardSelect(): TemplateResult {
    const currentCardType = this._btnConfig?.card_type ?? 'default';
    const isSelected = (type: PreviewType) => {
      return type === `${currentCardType}_card`;
    };
    const infoMessage = this._createAlert('Currently selected sub-card type is highlighted.');
    const content = html`
      <div class="base-config gap">
        ${infoMessage}
        <div class="sub-card-types">
          ${PREVIEW.map((type) => {
            const variant = isSelected(type) ? 'success' : 'brand';
            const iconSlot = isSelected(type)
              ? html`<ha-icon icon="mdi:check-circle" slot="start"></ha-icon>`
              : nothing;
            return html`
              <ha-button
                size="small"
                variant=${variant}
                appearance="filled"
                @click=${() => this._handleSelectSubCard(type)}
              >
                ${iconSlot} ${type.replace('_', ' ').toUpperCase()}
              </ha-button>
            `;
          })}
        </div>
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
    let label = isBase ? 'Main Configuration' : capitalize(area.replace('_', ' '));
    let secondary = isBase ? btnIndexLabel : `${btnIndexLabel} · Sub-Card`;
    const icon = isBase ? 'close' : 'back';
    if (area === ButtonArea.DEFAULT_CARD && !isEmpty(this._subLabelSecondary)) {
      label = this._subLabelSecondary.label;
      if (this._subLabelSecondary.secondary) {
        // label += ` · ${this._subLabelSecondary.secondary}`;
        secondary = this._subLabelSecondary.secondary;
      }
    }

    return { label, secondary, icon };
  }

  private _handleLabelSecondaryChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._subLabelSecondary = isEmpty(ev.detail) ? undefined : ev.detail;
  }

  private _handleSelectSubCard(cardType: PreviewType): void {
    const subCardConfig = this._btnConfig?.sub_card;
    const typeKey = cardType === 'custom_card' ? 'vertical-stack' : cardType;
    const subConfig =
      cardType === 'custom_card'
        ? computeVerticalStackConfig(subCardConfig?.custom_card || [])
        : subCardConfig?.[cardType];
    // set sub-element config
    this._customCardConfig = {
      type: typeKey,
      sub_card_type: cardType,
      elementConfig: subConfig,
    } as SubElementEditorConfig;
    // switch to sub-element editor
    this._selectedArea = ButtonArea[cardType.toUpperCase() as keyof typeof ButtonArea];
  }

  private _computePreviewBtn(): TemplateResult {
    if (this._selectedArea === ButtonArea.BASE) {
      return html` <span> ${this._renderPreviewBtn()} </span> `;
    }
    return html` <span @click=${() => this._handlePreviewClick()}> ${this._renderPreviewBtn()} </span> `;
  }

  private _handlePreviewClick(): void {
    console.debug('Preview button clicked');
    if (this.activePreview !== null) {
      this.activePreview = null;
    } else {
      const area = this._selectedArea;
      const previewType = area as PreviewType;
      this.activePreview = previewType;
    }
    console.debug('Active preview:', this.activePreview);
    this._togglePreview(this.activePreview);
  }

  public _reoloadPreview(): void {
    if (this.activePreview !== null) {
      console.debug('Reload preview (PanelButtonCardSec)');
      this._togglePreview(this.activePreview);
    }
    this._toggleHighlightButton(true);
  }

  private _goBack(): void {
    const currentArea = this._selectedArea;
    switch (currentArea) {
      case ButtonArea.BASE:
        this._dispatchEditorEvent('highlight-button', { buttonIndex: null });
        fireEvent(this, 'sub-button-closed');
        break;
      default:
        this._selectedArea = ButtonArea.BASE;
        this._customCardConfig = undefined;
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
    console.debug('Sub-Card Config (PanelButtonCardMain)');
    const currentElementConfig = { ...this._customCardConfig.elementConfig } as any;
    const incoming = ev.detail.config as any;
    if (JSON.stringify(currentElementConfig) === JSON.stringify(incoming)) {
      console.debug('No changes detected in custom card config');
      return;
    }
    // update sub-element config
    console.debug('Custom card config changed, updating elementConfig...');
    // re-add sub_card if exists
    this._customCardConfig = {
      ...this._customCardConfig,
      elementConfig: incoming,
    };

    const subKey = this._customCardConfig.sub_card_type as 'custom_card' | 'default_card' | 'tire_card';
    let value = incoming;
    if (subKey === 'custom_card') {
      value = incoming.cards || [];
    }

    console.debug('Updating button config sub_card:', subKey);
    // update button config
    const btnConfig = { ...(this._btnConfig || {}) } as BaseButtonCardItemConfig;
    btnConfig.sub_card = {
      ...(btnConfig.sub_card || {}),
      [subKey]: value,
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
    if (!ev.detail || !this._btnConfig) {
      return;
    }
    const currentConfig = { ...(this._btnConfig ?? {}) } as BaseButtonCardItemConfig;
    const incoming = ev.detail.value as Partial<Omit<BaseButtonCardItemConfig, 'sub_card'>>;
    // strip out sub_card from current config
    const baseConfig = omit(currentConfig, ['sub_card']);
    // Check if there are actual changes before proceeding
    if (JSON.stringify(baseConfig) === JSON.stringify(incoming)) {
      // console.debug('No changes detected in base config');
      return;
    }
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
      return;
    }
    // if changed, update the button config
    console.debug('Base config changed, updating...');
    // re-add sub_card if exists
    const newConfig: BaseButtonCardItemConfig = {
      ...baseConfig,
      sub_card: currentConfig.sub_card ? { ...currentConfig.sub_card } : undefined,
    };
    // delete show_name | show_primary from config
    if ('show_name' in newConfig) {
      delete newConfig.show_name;
    }
    if ('show_state' in newConfig) {
      delete newConfig.show_state;
    }
    this._btnConfigChanged(newConfig);
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
