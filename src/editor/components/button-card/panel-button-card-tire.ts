import { pick } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues, nothing } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { TireItems, TireLayoutKeys, TireTemplateConfig } from '../../../types/config';
import { ButtonArea } from '../../../types/config-area';
import { Create } from '../../../utils';
import { ExpansionPanelParams } from '../../../utils/editor/create';
import { SubElementEditorConfig } from '../../../utils/editor/types';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { ELEMENT, SUB_PANEL } from '../../editor-const';
import { DEFAULT_LAYOUT, TIRE_APPEARANCE_SCHEMA, TIRE_BACKGROUND_SCHEMA, TIRE_ENTITY_SCHEMA } from '../../form';
import '../../shared/vsc-sub-element-editor';
enum PANEL {
  BACKGROUND = 0,
  APPEARANCE,
  TIRES,
  ELEMENTS,
}

declare global {
  interface HASSDomEvents {
    'tire-card-changed': { config: TireTemplateConfig };
  }
}

@customElement(SUB_PANEL.BTN_TIRE_CARD)
export class PanelButtonCardTire extends ButtonCardBaseEditor {
  constructor() {
    super(ButtonArea.TIRE_CARD);
  }
  @property({ attribute: false }) tireConfig!: TireTemplateConfig;
  @state() private _tireConfig?: TireTemplateConfig;
  @state() private _subElementConfig?: SubElementEditorConfig;

  @queryAll(ELEMENT.HA_EXPANSION_PANEL) _expansionPanels?: Element[];

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    // keep default value for missing keys
    if (_changedProperties.has('tireConfig')) {
      this._tireConfig = {
        ...this.tireConfig,
      };
    }
  }

  protected render(): TemplateResult {
    const isSubElementEditor = !!this._subElementConfig;
    const btnLabel = isSubElementEditor ? 'Back to Tire Card Configuration' : 'Custom Elements Configuration';
    const editElBtn = html`
      <ha-button appearance="filled" @click=${() => this._editElements()}>${btnLabel}</ha-button>
    `;
    const backgroundEl = this._renderBackground();
    const appearanceEl = this._renderAppearance();
    const entitiesEl = this._renderTires();
    const elementsEl = this._renderElementsEditor();

    return html`
      <div class="base-config gap">
        ${!isSubElementEditor ? html`${backgroundEl} ${appearanceEl} ${entitiesEl}` : nothing} ${editElBtn}
        ${elementsEl}
      </div>
    `;
  }

  private _renderBackground(): TemplateResult {
    const DATA = pick(this._tireConfig || {}, ['background', 'background_entity']);
    const bgForm = this._createVscForm(DATA, TIRE_BACKGROUND_SCHEMA);

    return this._createPanel(PANEL.BACKGROUND, 'Background', 'mdi:image', bgForm);
  }

  private _createPanel(key: PANEL, title: string, icon: string, content: TemplateResult) {
    const options: ExpansionPanelParams['options'] = {
      header: title,
      icon: icon,
      elId: `tire-${PANEL[key]}`,
    };
    return Create.ExpansionPanel({
      content: content,
      options: options,
      expandedWillChange: this._handlePanelChange,
    });
  }

  private _renderAppearance(): TemplateResult {
    const isHorizontal = this._tireConfig?.horizontal || false;
    const DATA = pick(this._tireConfig || {}, [...TireLayoutKeys]);
    // Check if there is any difference from default layout, only defined values are compared
    const hasDiff = Object.entries(DEFAULT_LAYOUT).some(([key, value]) => {
      const v = DATA[key as keyof TireTemplateConfig];
      return v !== undefined && v !== value;
    });
    // console.log('hasDiff', DEFAULT_LAYOUT, DATA, hasDiff);
    const appearanceForm = this._createVscForm(DATA, TIRE_APPEARANCE_SCHEMA(isHorizontal));
    const resetButton = Create.HaButton({
      label: 'Reset to defaults',
      onClick: this._handleResetAppearance.bind(this),
      option: { disabled: !hasDiff, style: 'display: flex; margin-top: 1em;' },
    });

    const content = html`${appearanceForm}${resetButton}`;

    return this._createPanel(PANEL.APPEARANCE, 'Appearance', 'mdi:move-resize', content);
  }

  private _renderTires(): TemplateResult {
    const DATA = { ...this._tireConfig };
    const createEntityForm = (tirePos: string) => {
      const tireEntity = this._tireConfig?.[tirePos]?.entity || '';
      const useCustomPosition = this._tireConfig?.[tirePos]?.use_custom_position || false;
      const isHorizontal = this._tireConfig?.horizontal || false;
      return this._createVscForm(DATA, TIRE_ENTITY_SCHEMA(tirePos, tireEntity, useCustomPosition, isHorizontal));
    };

    const entitiesForm = html`${repeat(
      TireItems,
      (item) => item,
      (item) => createEntityForm(item)
    )}`;

    return this._createPanel(
      PANEL.TIRES,
      'Tire Entities',
      'mdi:car-tire-alert',
      html`<div class="base-config gap">${entitiesForm}</div>`
    );
  }

  private _renderElementsEditor(): TemplateResult | null {
    if (!this._subElementConfig) return null;
    const docURL = html`For more information, see
      <a href="https://www.home-assistant.io/dashboards/picture-elements#elements" target="_blank" rel="noreferrer"
        >HA Picture Elements Documentation</a
      >.`;
    return html` ${this._createAlert(docURL)}
      <vsc-sub-element-editor
        hide-header
        ._hass=${this.hass}
        ._store=${this._store}
        ._config=${this._subElementConfig}
        @sub-element-config-changed=${this._onSubElementConfigChanged}
      ></vsc-sub-element-editor>`;
  }

  private _editElements(): void {
    if (this._subElementConfig) {
      this._subElementConfig = undefined;
      return;
    }
    const elementsConfig = {
      type: 'picture-elements',
      image: 'https://demo.home-assistant.io/stub_config/floorplan.png',
      elements: this._tireConfig?.elements || [],
    };
    this._subElementConfig = {
      type: elementsConfig.type,
      elementConfig: elementsConfig,
    };
  }

  private _onSubElementConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._tireConfig || !this._subElementConfig) return;
    const value = { ...ev.detail.config };
    // console.debug('Sub Element Config Changed', value);
    const hasChanged = JSON.stringify(this._subElementConfig.elementConfig) !== JSON.stringify(value);
    console.debug('Has Changed:', hasChanged);
    if (!hasChanged) return;
    this._subElementConfig = {
      ...this._subElementConfig,
      elementConfig: value,
    };
    const newConfig = {
      ...this._tireConfig,
      elements: value.elements || [],
    };
    this._tireConfig = newConfig;

    fireEvent(this, 'tire-card-changed', { config: newConfig });
  }

  private _handleResetAppearance(): void {
    const newConfig = {
      ...this._tireConfig,
      ...DEFAULT_LAYOUT,
    };
    fireEvent(this, 'tire-card-changed', { config: newConfig });
  }

  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    const newConfig = {
      ...this._tireConfig,
      ...value,
    };
    fireEvent(this, 'tire-card-changed', { config: newConfig });
  }

  private _handlePanelChange(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._expansionPanels) return;
    const panel = ev.target as any;
    const panelId = panel.id;
    const panels = Array.from(this._expansionPanels).filter(
      (p) => p.id !== panelId && panelId.startsWith('tire-')
    ) as any[];

    panels.forEach((p) => {
      if (p.expanded) {
        p.expanded = false;
      }
    });
  }

  static get styles(): CSSResultGroup {
    return [super.styles, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-card-tire': PanelButtonCardTire;
  }
}
