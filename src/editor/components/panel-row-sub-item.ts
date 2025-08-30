import { html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { computeStateName, fireEvent } from '../../ha';
import {
  IndicatorBaseItemConfig,
  IndicatorEntityConfig,
  IndicatorRowGroupConfig,
  IndicatorRowItem,
} from '../../types/config/card/row-indicators';
import { Create } from '../../utils';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { ICON } from '../../utils/mdi-icons';
import { BaseEditor } from '../base-editor';
import '../shared/vsc-editor-form';
import './panel-row-sub-group-item';
import {
  ROW_ENTITY_ITEM_SCHEMA,
  ROW_ENTITY_SCHEMA,
  ROW_GROUP_BASE_SCHEMA,
  ROW_INTERACTON_BASE_SCHEMA,
  ROW_ITEM_CONTENT_SCHEMA,
  ROW_ITEM_TEMPATE_SCHEMA,
} from '../form';

declare global {
  interface HASSDomEvents {
    'row-sub-item-changed': { itemConfig: IndicatorRowItem };
    'sub-item-closed': undefined;
  }
}

@customElement('panel-row-sub-item')
export class PanelRowSubItem extends BaseEditor {
  @property({ attribute: false }) private _subItemConfig!: IndicatorRowItem;
  @property({ type: Number, attribute: 'row-index', reflect: true }) rowIndex!: number;
  @property({ type: Number, attribute: 'item-index', reflect: true }) itemIndex!: number;

  @state() private _yamlActive = false;
  @state() private _computedStateContent?: string[];

  @state() private _groupItemIndex: number | null = null;
  @query('ha-expansion-panel') private _expansionPanel?: any;
  @query('#groupbaseform') private _groupBaseFormDiv?: HTMLDivElement;

  constructor() {
    super();
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (this._expansionPanel && this.isGroup && this._groupItemIndex === null) {
      this._expansionPanel.addEventListener('expanded-changed', this._onExpandChanged.bind(this));
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('_subItemConfig')) {
      const sc = this._subItemConfig?.state_content;
      const include = !!this._subItemConfig?.include_state_template;
      this._computedStateContent = this._computeStateContent(sc, include);
    }
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
          this._groupBaseFormDiv?.classList.toggle('rolled-up', true);
        }

        // re-attach listener
        this._expansionPanel.addEventListener('expanded-changed', this._onExpandChanged.bind(this));
      }
    }
  }

  private get isGroup(): boolean {
    return this._subItemConfig?.type === 'group' || false;
  }

  private _onExpandChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (!this.isGroup) return;
    const expanded = event.detail.expanded as boolean;
    console.debug('Group expansion changed:', expanded);
    this._groupBaseFormDiv?.classList.toggle('rolled-up', expanded);
  }

  protected render(): TemplateResult {
    if (!this._subItemConfig) {
      return html``;
    }
    const name = this._computeItemLabel(this._subItemConfig);
    const headerLabel = `Row ${this.rowIndex + 1} › ${this.isGroup ? 'Group' : 'Entity'}`;
    return html`
      <sub-editor-header
        ?hidden=${this._groupItemIndex !== null}
        ._label=${headerLabel}
        .secondary=${name}
        .primaryIcon=${ICON.CLOSE}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        @primary-action=${this._goBack}
        @secondary-action=${this._toggleYaml}
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

    const ENTITY_DATA = {
      entity: config.entity,
    } as Pick<IndicatorEntityConfig, 'entity'>;

    const baseForm = this._createHaForm(config, ROW_ITEM_CONTENT_SCHEMA(config.entity || ''));
    const stateContentForm = this._renderContentPicker();

    const baseContentWraper = Create.ExpansionPanel({
      options: { header: 'Content', icon: 'mdi:text-short' },
      content: html`${baseForm} ${stateContentForm}`,
    });

    const entityForm = this._createHaForm(ENTITY_DATA, ROW_ENTITY_SCHEMA);
    const actionForm = this._createHaForm(config, ROW_INTERACTON_BASE_SCHEMA);
    const templateWraper = this._createHaForm(config, ROW_ITEM_TEMPATE_SCHEMA);

    const entityForms = html`<div class="card-config">
      ${entityForm} ${baseContentWraper} ${templateWraper} ${actionForm}
    </div>`;

    const yamlEditor = this._createYamlEditor(config, 'sub-item');

    return html` ${this._yamlActive ? yamlEditor : entityForms} `;
  }

  private _renderGroupEditor(): TemplateResult {
    if (this._groupItemIndex !== null) {
      return this._renderSubGroupEntityEditor();
    }

    const config = this._subItemConfig as IndicatorRowGroupConfig;
    const groupItems = config.items;
    const DATA_BASE = { ...config };
    const groupBaseForm = this._createHaForm(DATA_BASE, ROW_GROUP_BASE_SCHEMA(config.entity));

    const previewBtn = Create.HaButton({
      label: this._isPreviewGroup ? 'CLOSE PREVIEW' : 'SHOW ITEMS PREVIEW',
      onClick: () => this._handleGroupPreviewToggle(),
      option: { appearance: 'outlined', variant: this._isPreviewGroup ? 'warning' : '' },
    });

    const itemsWrapper = Create.ExpansionPanel({
      options: { header: 'Group Items', icon: 'mdi:format-list-bulleted' },
      content: html` <panel-row-sub-group-item
        ._hass=${this._hass}
        ._store=${this._store}
        ._groupItems=${groupItems}
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
            <div id="groupbaseform">${groupBaseForm}</div>
            ${itemsWrapper} ${previewBtn}
          </div>`}
    `;
  }

  private _renderSubGroupEntityEditor(): TemplateResult {
    const groupItems = (this._subItemConfig as IndicatorRowGroupConfig).items;
    const subItemData = {
      ...groupItems![this._groupItemIndex!],
    } as IndicatorBaseItemConfig;
    const schema = [...ROW_ENTITY_ITEM_SCHEMA, ...ROW_INTERACTON_BASE_SCHEMA];
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
        .primaryIcon=${ICON.CLOSE}
        @primary-action=${primaryAction}
        @secondary-action=${this._toggleYaml}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
      ></sub-editor-header>
      ${!this._yamlActive
        ? html`
            <vsc-editor-form
              ._hass=${this._hass}
              ._store=${this._store}
              .data=${subItemData}
              .schema=${schema}
              .configType=${'sub-group-item'}
              @value-changed=${this._handleSubGroupItemChanged}
            ></vsc-editor-form>
          `
        : yamlEditor}
    `;
  }

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
    const items = event.detail.items as IndicatorBaseItemConfig[];
    const newConfig = { ...(this._subItemConfig as IndicatorRowGroupConfig), items };
    console.debug('Group items changed:', items);
    this._rowChanged(newConfig);
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
    return html`
      <panel-yaml-editor
        .hass=${this._hass}
        .configDefault=${dataConfig}
        .configKey=${configKey}
        @yaml-config-changed=${this._handleYamlConfigChanged}
      ></panel-yaml-editor>
    `;
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
    const isPreview = this._isPreviewGroup;
    this._setPreviewConfig('row_group_preview', {
      row_index: this.rowIndex,
      group_index: isPreview ? null : this.itemIndex,
    });
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
    console.debug('config changed:', changed);
    this._rowChanged(currentConfig); // willUpdate can recompute any derived @state
  }

  private _handleYamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value, key } = ev.detail;
    if (!isValid) {
      return;
    }
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

  private _renderContentPicker(): TemplateResult {
    const config = this._subItemConfig ?? {};
    const selector = { ui_state_content: { entity_id: config.entity, allow_name: false } };

    return html`
      <ha-selector
        .hass=${this._hass}
        .entityId=${config.entity}
        .value=${this._computedStateContent as string[] | undefined}
        .label=${'State Content'}
        .required=${false}
        .allowName=${false}
        .selector=${selector}
        @value-changed=${this._handleStateContentChanged}
      ></ha-selector>
    `;
  }
  private _handleStateContentChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (!this._subItemConfig || !this._hass) return;

    const raw = event.detail?.value as string | string[] | undefined;
    const normalized = this._dedupeKeepFirst(this._toArray(raw).filter(Boolean));

    const hadTemplate = !!this._subItemConfig.include_state_template;
    const hasTemplateNow = normalized.includes('state_template');

    const next = { ...this._subItemConfig } as IndicatorEntityConfig;
    let changed = false;

    // Update state_content
    const prevArray = Array.isArray(this._subItemConfig.state_content)
      ? (this._subItemConfig.state_content as string[])
      : this._toArray(this._subItemConfig.state_content as string | undefined);

    if (normalized.length === 0) {
      if ('state_content' in next) {
        delete next.state_content;
        changed = true;
      }
    } else if (!this._arrayEq(prevArray, normalized)) {
      next.state_content = normalized;
      changed = true;
    }

    // Sync the include_state_template flag with current selection
    if (hadTemplate !== hasTemplateNow) {
      next.include_state_template = hasTemplateNow;
      changed = true;
    }

    if (!changed) return;
    this._rowChanged(next); // willUpdate recomputes _computedStateContent
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

  private _computeStateContent(raw: string | string[] | undefined, include: boolean): string[] | undefined {
    const next = this._applyTemplateFlagStable(this._toArray(raw), include);
    return next.length ? next : undefined;
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
          max-height: 1000px;
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
