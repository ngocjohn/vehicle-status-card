import { html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { computeStateName, fireEvent } from '../../../ha';
import { isGroupEntity } from '../../../ha/data/group';
import {
  IndicatorBaseItemConfig,
  IndicatorEntityConfig,
  IndicatorRowGroupConfig,
  IndicatorRowItem,
} from '../../../types/config/card/row-indicators';
import { Create } from '../../../utils';
import { createSecondaryCodeLabel, createThirdActionBtn } from '../../../utils/editor/sub-editor-header';
import '../../shared/vsc-editor-form';
import './panel-row-sub-group-item';
import { BaseEditor } from '../../base-editor';
import { SUB_PANEL } from '../../editor-const';
import {
  SUBGROUP_ENTITY_SCHEMA,
  ROW_GROUP_BASE_SCHEMA,
  ROW_INTERACTON_BASE_SCHEMA,
  ENTITY_SINGLE_TYPE_SCHEMA,
} from '../../form';
import { PanelRowSubGroupItem } from './panel-row-sub-group-item';

declare global {
  interface HASSDomEvents {
    'row-sub-item-changed': { itemConfig: IndicatorRowItem };
    'sub-item-closed': undefined;
  }
}

@customElement(SUB_PANEL.ROW_SUB_ITEM)
export class PanelRowSubItem extends BaseEditor {
  @property({ attribute: false }) private _subItemConfig!: IndicatorRowItem;
  @property({ type: Number, attribute: 'row-index', reflect: true }) rowIndex!: number;
  @property({ type: Number, attribute: 'item-index', reflect: true }) itemIndex!: number;

  @state() private _yamlActive = false;
  @state() private _subItemExpanded: boolean = false;
  @state() private _groupPreviewActive: boolean = false;

  @state() private _groupItemIndex: number | null = null;

  @query('ha-expansion-panel') private _expansionPanel?: any;
  @query(SUB_PANEL.ROW_SUB_GROUP_ITEM) _subGroupItemEditor?: PanelRowSubGroupItem;

  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await this.updateComplete;
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_groupItemIndex') && _changedProperties.get('_groupItemIndex') !== undefined) {
      const oldIndex = _changedProperties.get('_groupItemIndex') as number | null;
      const newIndex = this._groupItemIndex;
      if (oldIndex !== newIndex && this._expansionPanel && this.isGroup && newIndex === null) {
        // when closing sub-group item editor, expand the group editor panel again
        if (!this._expansionPanel.expanded) {
          this._expansionPanel.expanded = true;
          // this._groupBaseFormDiv?.classList.toggle('rolled-up', true);
        }
      }
    }
  }

  private get isGroup(): boolean {
    return this._subItemConfig?.type === 'group' || false;
  }

  private _onExpandChanged(event: any): void {
    event.stopPropagation();
    const target = event.target as any;
    if (target !== this._expansionPanel) return;
    const expanded = event.detail.expanded;
    this._subItemExpanded = expanded;
    // console.debug('Group:', target.id, 'expansion changed:', expanded);
  }

  protected render(): TemplateResult {
    if (!this._subItemConfig) {
      return html``;
    }
    const name = this._computeItemLabel(this._subItemConfig);
    const headerLabel = `Row ${this.rowIndex + 1} › ${this.isGroup ? 'Group' : 'Entity'}`;
    this._groupPreviewActive = this._isPreviewGroup;
    return html`
      <sub-editor-header
        ?hidden=${this._groupItemIndex !== null}
        ._label=${headerLabel}
        .secondary=${name}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        .thirdAction=${createThirdActionBtn(this._groupPreviewActive)}
        @primary-action=${this._goBack}
        @secondary-action=${this._toggleYaml}
        @third-action=${this._handleGroupPreviewToggle}
      ></sub-editor-header>
      ${this._renderSubItemEditor()}
    `;
  }

  private _renderSubItemEditor(): TemplateResult {
    if (!this.isGroup) {
      return this._renderEntityForms();
    } else {
      return this._renderGroupEditor();
    }
  }

  private _renderEntityForms(): TemplateResult {
    const config = {
      ...this._subItemConfig,
    } as IndicatorEntityConfig;
    if (this._yamlActive) {
      return this._createVscYamlEditor(config, 'sub-item');
    }
    const SINGLE_ENTITY_SCHEMA = ENTITY_SINGLE_TYPE_SCHEMA(config);
    // const entityForm = this._createHaForm(config, SINGLE_ENTITY_SCHEMA);
    return this._createHaForm(config, SINGLE_ENTITY_SCHEMA);
  }

  private _renderGroupEditor(): TemplateResult {
    if (this._groupItemIndex !== null) {
      return this._renderSubGroupEntityEditor();
    }
    // this._subItemExpanded = this._expansionPanel?.expanded ?? false;

    const config = this._subItemConfig as IndicatorRowGroupConfig;
    const groupItems = config.items;
    const DATA_BASE = { ...config };
    const isGroupEntityType = !!(config.entity && isGroupEntity(this._hass.states[config.entity]));
    const groupBaseForm = this._createHaForm(DATA_BASE, ROW_GROUP_BASE_SCHEMA(config?.entity, isGroupEntityType));

    const groupEntity = isGroupEntityType ? this._hass.states[config.entity!] : undefined;

    const itemsWrapper = Create.ExpansionPanel({
      options: { header: 'Items', icon: 'mdi:format-list-bulleted', elId: 'itemsWrapper' },
      expandedWillChange: (ev: any) => this._onExpandChanged(ev),
      content: html` <panel-row-sub-group-item
        id="group-items-editor"
        ._hass=${this._hass}
        ._store=${this._store}
        ._groupItems=${groupItems}
        ._groupEntityObj=${groupEntity}
        ._groupConfig=${config}
        .configType=${'group-items'}
        @edit-group-item=${this._editGroupItem}
        @group-items-changed=${this._groupItemsChanged}
      ></panel-row-sub-group-item>`,
    });

    const yamlEditor = this._createYamlEditor(config, 'sub-item');

    return html`
      ${this._yamlActive
        ? yamlEditor
        : html`<div class="card-config">
            <div
              id="groupbaseform"
              class=${classMap({
                'rolled-up': this._subItemExpanded,
              })}
            >
              ${groupBaseForm}
            </div>
            ${itemsWrapper}
          </div>`}
    `;
  }

  private _renderSubGroupEntityEditor(): TemplateResult {
    const groupItems = (this._subItemConfig as IndicatorRowGroupConfig).items;
    const subItemData = {
      ...groupItems![this._groupItemIndex!],
    } as IndicatorBaseItemConfig;
    const schema = [...SUBGROUP_ENTITY_SCHEMA(subItemData), ...ROW_INTERACTON_BASE_SCHEMA];
    const yamlEditor = this._createYamlEditor(subItemData, 'group-item');

    const groupName = this._subItemConfig.name || `Group ${this.itemIndex + 1}`;
    const subItemLabel = this._computeItemLabel(subItemData);
    const labels = {
      secondary: subItemLabel,
      primary: `Row ${this.rowIndex + 1} › ${groupName} › Item ${this._groupItemIndex! + 1}`,
    };
    const primaryAction = () => {
      if (this._yamlActive) {
        this._yamlActive = false;
      } else {
        this._groupItemIndex = null;
        this.requestUpdate();
      }
    };
    return html`
      <sub-editor-header
        ._label=${labels.primary}
        .secondary=${labels.secondary}
        @primary-action=${primaryAction}
        @secondary-action=${this._toggleYaml}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
      ></sub-editor-header>
      ${!this._yamlActive ? this._createVscForm(subItemData, schema, 'sub-group-item') : yamlEditor}
    `;
  }

  private _renderPreviewBtn = (previeActive: boolean): TemplateResult => {
    const label = previeActive ? 'CLOSE PREVIEW' : 'PREVIEW';
    const variant = previeActive ? 'warning' : '';
    const previewBtn = Create.HaButton({
      label: label,
      onClick: this._handleGroupPreviewToggle.bind(this),
      option: { appearance: 'outlined', variant: variant },
    });
    return previewBtn;
  };

  private _editGroupItem(event: CustomEvent): void {
    event.stopPropagation();
    const index = event.detail.index;
    console.debug('Editing group item at index:', index);
    this._groupItemIndex = index;
    this.requestUpdate();
  }

  private _groupItemsChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (!this._subItemConfig || this._subItemConfig.type !== 'group') return;
    const updatedConfig = { ...event.detail } as Partial<IndicatorRowGroupConfig>;
    console.debug('Received group items changed event:', updatedConfig);
    const newConfig = { ...(this._subItemConfig as IndicatorRowGroupConfig), ...updatedConfig };
    this._rowChanged(newConfig);
  }

  // Sub-group item value changed handler
  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('onValueChanged (SubItem)');
    const { key, subKey } = ev.target as any;
    const value = { ...ev.detail.value };
    console.debug('Key:', key, 'SubKey:', subKey, 'Value:', value);
    switch (key) {
      case 'sub-group-item':
        this._handleSubGroupItemChanged(ev);
        break;
      case 'test-templates':
        // templates changed
        console.debug('Template values changed:', value);
        break;
      default:
        console.warn('Unhandled value-changed event for key:', key);
    }
  }
  private _handleSubGroupItemChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (!this._subItemConfig || this._groupItemIndex === null) return;

    const currentConfig = { ...(this._subItemConfig as IndicatorRowGroupConfig).items![this._groupItemIndex] };
    const incoming = event.detail.value as Partial<IndicatorBaseItemConfig>;
    if (incoming.entity === undefined || incoming.entity === '') {
      // this is to prevent accidental removal of entity when editing
      console.warn('Entity cannot be empty for entity type row item');
      return;
    }

    let changed = this.mergeWithCleanup(currentConfig, incoming);

    if (!changed) return;
    console.debug('Sub-group item config changed:', changed, this._groupItemIndex, currentConfig);
    const newGroupItems = (this._subItemConfig as IndicatorRowGroupConfig).items!.concat();
    newGroupItems[this._groupItemIndex] = currentConfig;

    const newConfig = { ...(this._subItemConfig as IndicatorRowGroupConfig), items: newGroupItems };
    this._rowChanged(newConfig);
  }

  private _createYamlEditor(
    dataConfig: IndicatorRowItem | IndicatorBaseItemConfig,
    configKey?: string | number
  ): TemplateResult {
    return this._createVscYamlEditor(dataConfig, configKey);
  }

  private _createHaForm(data: any, schema: any, configType?: string | number): TemplateResult {
    return html`
      <vsc-editor-form
        ._hass=${this._hass}
        ._store=${this._store}
        .data=${data}
        .schema=${schema}
        .configType=${configType}
        @value-changed=${this._valueChanged}
      ></vsc-editor-form>
    `;
  }

  // === helpers ===
  private _handleGroupPreviewToggle(): void {
    console.debug('Toggling group preview');
    const group_index = this._isPreviewGroup ? null : this.itemIndex;
    this._showSelectedRow(this.rowIndex, group_index, null);
    this._groupPreviewActive = this._isPreviewGroup;
    this.requestUpdate();
  }

  private _computeItemLabel(config: IndicatorRowItem | IndicatorBaseItemConfig): string {
    if ('name' in config && config.name) return config.name;
    if ('entity' in config && config.entity) {
      const stateObj = this._hass.states[config.entity];
      const computedName = stateObj ? computeStateName(stateObj) : undefined;
      return computedName || config.entity;
    }
    return `Item ${this._groupItemIndex !== null ? this._groupItemIndex + 1 : this.itemIndex + 1}`;
  }

  // === your handler with normalization ===
  private _valueChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (!this._subItemConfig || !this._hass) return;

    const currentConfig = { ...(this._subItemConfig ?? {}) } as IndicatorRowItem;
    const incoming = event.detail.value as Partial<IndicatorRowItem>;

    // console.debug('Current Config:', currentConfig);
    // console.debug('Incoming Changes:', incoming);

    if ((incoming.entity === undefined || incoming.entity === '') && currentConfig.type === 'entity') {
      // this is to prevent accidental removal of entity when editing
      console.warn('Entity cannot be empty for entity type row item');
      return;
    }
    // console.debug('Merging incoming changes into current config:', { currentConfig, incoming });
    let changed = this.mergeWithCleanup(currentConfig, incoming);

    // ---- normalize state_content against include_state_template ----
    const include = !!currentConfig.include_state_template;
    const raw = currentConfig.state_content as string | string[] | undefined;

    const normalized = this._applyTemplateFlagStable(this._toArray(raw), include);
    const normalizedOrUndef = normalized.length ? normalized : undefined;

    // only set/delete if it actually changes something
    const before = Array.isArray(raw) ? raw : this._toArray(raw);
    if (normalizedOrUndef === undefined) {
      if ('state_content' in currentConfig) {
        delete currentConfig.state_content;
        changed = true;
      }
    } else if (!this._arrayEq(before, normalizedOrUndef)) {
      currentConfig.state_content = normalizedOrUndef;
      changed = true;
    }
    // ---------------------------------------------------------------

    if (!changed) return;
    // console.debug('config changed:', changed);
    this._rowChanged(currentConfig); // willUpdate can recompute any derived @state
  }

  protected _onYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('YAML changed (Row Sub Item)');
    const { key, subKey } = ev.target as any;
    const value = ev.detail;
    console.debug('YAML changed:', { key, subKey, value });
    const configKey = key as string | number | undefined;
    console.debug('detail', ev.detail, configKey);
    if (configKey === 'group-item' && this._groupItemIndex !== null) {
      // coming from sub-group item editor
      if (!this._subItemConfig || this._subItemConfig.type !== 'group') return;
      const currentConfig = { ...(this._subItemConfig as IndicatorRowGroupConfig) };
      const newGroupItems = currentConfig.items!.concat();
      newGroupItems[this._groupItemIndex] = value as IndicatorBaseItemConfig;
      const newConfig = { ...currentConfig, items: newGroupItems };
      this._rowChanged(newConfig);
      return;
    }
    if (configKey === 'sub-item' || configKey === undefined) {
      // coming from main sub-item editor
      const newConfig = value as IndicatorRowItem;
      this._rowChanged(newConfig);
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

  private _rowChanged(config: IndicatorRowItem): void {
    fireEvent(this, 'row-sub-item-changed', { itemConfig: config });
  }

  private _toggleYaml(): void {
    this._yamlActive = !this._yamlActive;
  }
  private _goBack(): void {
    fireEvent(this, 'sub-item-closed', undefined);
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        *[hidden] {
          display: none !important;
        }
        .card-config {
          display: flex;
          flex-direction: column;
          gap: var(--vic-gutter-gap);
        }
        #groupbaseform {
          transition: all 0.3s ease-in-out;
          overflow: hidden;
          max-height: fit-content;
        }
        #groupbaseform.rolled-up {
          max-height: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-row-sub-item': PanelRowSubItem;
  }
}
