import { pick } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { TireItems, TireLayoutKeys, TireTemplateConfig } from '../../../types/config';
import { ButtonArea } from '../../../types/config-area';
import { Create } from '../../../utils';
import { ExpansionPanelParams } from '../../../utils/editor/create';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { ELEMENT, SUB_PANEL } from '../../editor-const';
import { TIRE_APPEARANCE_SCHEMA, TIRE_BACKGROUND_SCHEMA, TIRE_ENTITY_SCHEMA } from '../../form';

enum PANEL {
  BACKGROUND = 0,
  APPEARANCE,
  TIRES,
}

declare global {
  interface HASSDomEvents {
    'tire-card-changed': { config: TireTemplateConfig };
  }
}
const DEFAULT_LAYOUT = {
  horizontal: false,
  hide_rotation_button: false,
  image_size: 100,
  value_size: 100,
  top: 50,
  left: 50,
};
@customElement(SUB_PANEL.BTN_TIRE_CARD)
export class PanelButtonCardTire extends ButtonCardBaseEditor {
  constructor() {
    super(ButtonArea.TIRE_CARD);
  }
  @property({ attribute: false }) tireConfig!: TireTemplateConfig;
  @state() private _tireConfig?: TireTemplateConfig;

  @queryAll(ELEMENT.HA_EXPANSION_PANEL) _expansionPanels?: Element[];

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    // keep default value for missing keys
    if (_changedProperties.has('tireConfig')) {
      this._tireConfig = {
        ...DEFAULT_LAYOUT,
        ...this.tireConfig,
      };
    }
  }

  protected render(): TemplateResult {
    const backgroundEl = this._renderBackground();
    const appearanceEl = this._renderAppearance();
    const entitiesEl = this._renderTires();

    return html` <div class="base-config gap">${backgroundEl} ${appearanceEl} ${entitiesEl}</div> `;
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
    const appearanceForm = this._createVscForm(DATA, TIRE_APPEARANCE_SCHEMA(isHorizontal));

    return this._createPanel(PANEL.APPEARANCE, 'Appearance', 'mdi:move-resize', appearanceForm);
  }

  private _renderTires(): TemplateResult {
    const DATA = { ...this._tireConfig };
    const createEntityForm = (tirePos: string) => {
      const tireEntity = this._tireConfig?.[tirePos]?.entity || '';
      return this._createVscForm(DATA, TIRE_ENTITY_SCHEMA(tirePos, tireEntity));
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
