import { pick } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues, nothing } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { showFormDialog } from '../../../ha/dialogs/form/show-form-dialog';
import { HaFormSchema } from '../../../ha/panels/ha-form/types';
import {
  TireAdditionalEntityConfig,
  TireItem,
  TireItemsKeys,
  TireLayoutKeys,
  TireTemplateConfig,
} from '../../../types/config';
import { ButtonArea } from '../../../types/config-area';
import { Create } from '../../../utils';
import { ExpansionPanelParams } from '../../../utils/editor/create';
import '../../shared/vsc-sub-element-editor';
import { computeActionList } from '../../../utils/editor/create-actions-menu';
import { SubElementEditorConfig } from '../../../utils/editor/types';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { ELEMENT, SUB_PANEL } from '../../editor-const';
import {
  ADDITIONAL_ENTITY_SCHEMA,
  DEFAULT_LAYOUT,
  TIRE_APPEARANCE_SCHEMA,
  TIRE_BACKGROUND_SCHEMA,
  TIRE_ENTITY_SCHEMA,
} from '../../form';
enum PANEL {
  BACKGROUND = 0,
  APPEARANCE,
  TIRES,
  ELEMENTS,
}

const TIRE_POS_ICON: Record<TireItem, string> = {
  front_left: 'mdi:arrow-top-left',
  front_right: 'mdi:arrow-top-right',
  rear_left: 'mdi:arrow-bottom-left',
  rear_right: 'mdi:arrow-bottom-right',
};

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
    const isHorizontal = this._tireConfig?.horizontal || false;
    // const DATA = { ...this._tireConfig };
    const createEntityForm = (tirePos: TireItem) => {
      const tirePosConfig = this._tireConfig?.[tirePos];
      const useCustomPosition = tirePosConfig?.use_custom_position || false;
      const tireEntitySchemaForm = this._createVscForm(
        { ...tirePosConfig },
        TIRE_ENTITY_SCHEMA(tirePos, useCustomPosition, isHorizontal),
        tirePos
      );
      const additionalEntitiesEl = this._renderTireAdditionalEntities(tirePos);
      return Create.ExpansionPanel({
        content: html` <div class="sub-panel-config">${tireEntitySchemaForm}${additionalEntitiesEl}</div>`,
        options: {
          header: tirePos.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          icon: TIRE_POS_ICON[tirePos],
        },
      });
    };

    const entitiesForm = html`${repeat(
      TireItemsKeys,
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

  private _renderTireAdditionalEntities(tirePos: TireItem) {
    const additionalEntities = this._tireConfig?.[tirePos]?.additional_entities || [];

    const addBtn = Create.HaButton({
      label: 'Add Additional Entity',
      onClick: () => this._addAdditionalEntity(tirePos),
      option: { type: 'add', style: 'display: block; margin-bottom: 8px;' },
    });
    const actions = computeActionList(['edit-item', 'delete-item']);
    const entitiesList =
      additionalEntities.length > 0
        ? html`<div class="row-items">
            ${repeat(additionalEntities, (entity, index) => {
              const entityId = entity.entity;
              return html`<badge-editor-item
                .itemIndex=${index}
                ._menuAction=${actions}
                data-tire-pos=${tirePos}
                @badge-action-item=${this._handleAdditionalEntityAction}
              >
                <ha-badge .label=${entityId}>
                  <span>${entityId}</span>
                </ha-badge>
              </badge-editor-item>`;
            })}
          </div>`
        : nothing;

    return Create.ExpansionPanel({
      content: html`${addBtn}${entitiesList}`,
      options: {
        header: 'Additional Entities (Optional)',
        secondary: 'Entities for secondary info',
      },
    });
  }

  private _updateAdditionalEntities(
    tirePos: TireItem,
    update: (items: TireAdditionalEntityConfig[]) => TireAdditionalEntityConfig[]
  ): void {
    if (!this._tireConfig) return;
    const currentEntities = this._tireConfig[tirePos]?.additional_entities || [];
    const updatedEntities = update(currentEntities);
    const newConfig = {
      ...this._tireConfig,
      [tirePos]: {
        ...this._tireConfig[tirePos],
        additional_entities: updatedEntities,
      },
    };
    this._tireConfig = newConfig;
    fireEvent(this, 'tire-card-changed', { config: newConfig });
  }

  private _handleAdditionalEntityAction = async (ev: CustomEvent) => {
    ev.stopPropagation();
    const action = ev.detail.action;
    const index = (ev.target as any).itemIndex;
    const tirePos = (ev.target as any).dataset.tirePos as TireItem;
    const additionalEntities = this._tireConfig?.[tirePos]?.additional_entities || [];
    const entityConfig = additionalEntities[index];
    if (!entityConfig) return;

    if (action === 'edit-item') {
      const updatedEntityConfig = await showFormDialog(this, {
        title: 'Edit Additional Entity',
        schema: [...ADDITIONAL_ENTITY_SCHEMA] as HaFormSchema[],
        data: entityConfig,
        submitText: 'Update',
      });
      if (!updatedEntityConfig) return;
      this._updateAdditionalEntities(tirePos, (items) => {
        const nextItems = items.concat();
        nextItems[index] = updatedEntityConfig as TireAdditionalEntityConfig;
        return nextItems;
      });
    } else if (action === 'delete-item') {
      this._updateAdditionalEntities(tirePos, (items) => items.filter((_, idx) => idx !== index));
    }
  };

  private _addAdditionalEntity = async (tirePos: TireItem) => {
    if (!this._tireConfig) return;
    const newEntityData: TireAdditionalEntityConfig = {
      entity: this._tireConfig[tirePos]?.entity || '',
      state_content: ['last_updated'],
    };
    const newEntity = await showFormDialog(this, {
      title: 'Add Additional Entity',
      schema: [...ADDITIONAL_ENTITY_SCHEMA] as HaFormSchema[],
      data: newEntityData,
      submitText: 'Add',
    });
    if (!newEntity) return;
    this._updateAdditionalEntities(tirePos, (items) => items.concat(newEntity as TireAdditionalEntityConfig));
  };

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
    const { key } = ev.target as any;
    const value = { ...ev.detail.value };
    const newConfig = {
      ...this._tireConfig,
      ...(key ? { [key]: value } : value),
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
    return [
      super.styles,
      css`
        .row-items {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 8px;
          width: -webkit-fill-available;
          height: auto;
          box-sizing: border-box;
          align-items: center;
          /* background-color: var(--primary-background-color); */
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-card-tire': PanelButtonCardTire;
  }
}
