import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { styleMap } from 'lit-html/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import YAML from 'yaml';

import {
  HomeAssistantExtended as HomeAssistant,
  VehicleStatusCardConfig,
  ButtonConfig,
  DefaultCardConfig,
  ButtonCardConfig,
  TireTemplateConfig,
  TireEntityConfig,
} from '../../types';

import {
  BUTTON_CARD_ACTIONS,
  ACTIONSELECTOR,
  CARD_TYPES,
  BUTTON_TYPE,
  CONFIG_VALUES,
  CONFIG_TYPES,
  NEW_BUTTON_CONFIG,
} from '../editor-const';

import editorcss from '../../css/editor.css';
import { fireEvent } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';

import Sortable from 'sortablejs';

import * as Create from '../../utils/create';

import { uploadImage } from '../../utils/ha-helper';

@customElement('panel-button-card')
export class PanelButtonCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) editor?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;

  @state() _activePreview: string | null = null;

  @state() _activeTabIndex: number = 0;
  @state() _activeTireEntityIndex: number = 0;
  @state() _buttonIndex: number | null = null;
  @state() _cardIndex: number | null = null;
  @state() _itemIndex: number | null = null;

  @state() _yamlConfig: any[] = [];
  @state() _newItemName: Map<string, string> = new Map();
  @state() _selectedAction: string = 'tap_action';

  @state() _reindexing: boolean = false;

  private _sortable: Sortable | null = null;

  private _debouncedCustomBtnChanged = debounce(this.configChanged.bind(this), 500);

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        .hidden {
          display: none !important;
        }
      `,
    ];
  }

  constructor() {
    super();
    this.toggleAction = this.toggleAction.bind(this);
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._loadYamlConfig();
  }

  private initSortable(): void {
    this.updateComplete.then(() => {
      const list = this.shadowRoot?.getElementById('default-card-list');
      if (!list) {
        console.log('List not found');
        return;
      }

      console.log('Init sortable');
      this._sortable = new Sortable(list, {
        handle: '.handle',
        ghostClass: 'sortable-ghost',
        animation: 150,
        onEnd: (evt) => {
          this._handleSortEnd(evt);
        },
      });
    });
  }

  private _handleSortEnd(evt: any): void {
    const { oldIndex, newIndex } = evt;
    const cardIndex = evt.item.getAttribute('data-index');
    if (cardIndex === null) {
      return;
    }

    const buttonIndex = this._buttonIndex;
    if (buttonIndex === null) {
      return;
    }

    let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    let defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
    const card = defaultCard[cardIndex];
    defaultCard.splice(oldIndex, 1);
    defaultCard.splice(newIndex, 0, card);
    buttonCardConfig[buttonIndex].default_card = defaultCard;
    this.config = { ...this.config, button_card: buttonCardConfig };
    fireEvent(this, 'config-changed', { config: this.config });

    this._reindexing = true;
    setTimeout(() => {
      this.resetItems();
    }, 50);
  }

  private async _loadYamlConfig() {
    if (!this.config.button_card) {
      return;
    }
    for (const button_card of this.config.button_card) {
      const yamlConfig = button_card.custom_card;
      const yaml = YAML.stringify(yamlConfig);
      this._yamlConfig.push(yaml);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_buttonIndex') && this._buttonIndex === null && this._activePreview !== null) {
      this.resetEditorPreview();
    }

    if (changedProps.has('_activeTabIndex') && this._activePreview !== null) {
      this.editor._cleanConfig();
    }

    if (changedProps.has('_buttonIndex') || changedProps.has('_cardIndex') || changedProps.has('_activeTabIndex')) {
      this.hideClearButton();
    }

    if (changedProps.has('_activeTabIndex') && this._activeTabIndex === 1) {
      this.initSortable();
    }
  }

  protected render(): TemplateResult {
    const mainButtonCard = this._renderButtonList();
    const buttonConfig = this._renderButtonCardConfig();

    return this._buttonIndex === null ? mainButtonCard : buttonConfig;
  }

  private _renderButtonList(): TemplateResult {
    const footerActions = html` <div class="action-footer">
      <ha-button @click=${this.toggleAction('add-new-button')}>Add New Button</ha-button>
      ${this.config?.button_card?.length !== 0
        ? html`<ha-button class="showdelete delete-btn" @click=${this.toggleAction('show-delete')}>Delete</ha-button>`
        : ''}
    </div>`;

    const buttons = this.config.button_card;
    if (!buttons) {
      return footerActions;
    }

    return html`
      <div class="card-config">
        ${this._renderSubHeader('Button List')}
        <div class="button-list" id="button-list">
          ${repeat(
            buttons,
            (button, index) => html`
              <div class="item-config-row" data-index="${index}">
                <div class="sub-content">
                  ${Create.Picker({
                    component: this,
                    label: `Button #${index + 1}`,
                    value: button.button.primary,
                    configType: 'button',
                    configIndex: index,
                    configValue: 'primary',
                    pickerType: 'textfield' as 'textfield',
                  })}
                </div>
                <div class="item-actions">
                  <div class="action-icon delete-icon hidden" @click="${this.toggleAction('delete-button', index)}">
                    <ha-icon icon="mdi:close"></ha-icon>
                  </div>

                  <div class="action-icon" @click="${this.toggleAction('edit-button', index)}">
                    <ha-icon icon="mdi:pencil"></ha-icon>
                  </div>
                </div>
              </div>
            `
          )}
        </div>
        ${footerActions}
      </div>
    `;
  }

  private _renderButtonCardConfig(): TemplateResult {
    if (this._buttonIndex === null) {
      return html``;
    }

    const buttonIndex = this._buttonIndex;

    const buttonCard = this.config.button_card[buttonIndex];
    const button = buttonCard.button;
    const defaultCard = buttonCard.default_card;
    const configTabs = [
      {
        key: `button-${buttonIndex}`,
        label: 'Button',
        content: this._renderButtonConfig(buttonCard, buttonIndex),
      },
      {
        key: `default-card-${buttonIndex}`,
        label: 'Default Card',
        content:
          this._cardIndex === null
            ? this._renderDefaultCardList(defaultCard, buttonIndex)
            : this._itemIndex === null
              ? this._renderCardItemList(this._cardIndex, buttonIndex)
              : this._renderItemConfig(this._itemIndex, this._cardIndex, buttonIndex),
      },
      {
        key: `custom-card-${buttonIndex}`,
        label: 'Custom Card',
        content: this._renderCustomCardConfig(buttonIndex),
      },
      {
        key: `tire-card-${buttonIndex}`,
        label: 'Tire Card',
        content: this._renderTireCardConfig(buttonCard, buttonIndex),
      },
    ];

    return html`
      <div class="card-config">
        ${this._renderHeader(
          `#${buttonIndex + 1}: ${button.primary.toUpperCase()}`,
          [{ title: 'Back to list', action: this.toggleAction('back-to-list'), icon: 'mdi:chevron-left' }],
          `${button.icon}`
        )}

        <div class="sub-panel">
          ${Create.TabBar({
            tabs: configTabs,
            activeTabIndex: this._activeTabIndex,
            onTabChange: (index: number) => (this._activeTabIndex = index),
          })}
        </div>
      </div>
    `;
  }

  private _renderHeader(
    title: string,
    actions?: Array<{ title?: string; action: (ev?: Event) => void; icon?: string }>,
    icon?: string
  ): TemplateResult {
    const styleTitle = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--vic-gutter-gap)',
      color: 'var(--secondary-text-color)',
    };
    return html` <div class="header-row">
      ${actions?.map(
        (action) =>
          html` <div class="icon-title" @click=${(ev: Event) => action.action(ev)}>
            <ha-icon icon=${action.icon}></ha-icon>
            <span>${action.title}</span>
          </div>`
      )}
      <div class="title" style=${styleMap(styleTitle)}>
        ${title} ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}
      </div>
    </div>`;
  }

  private _renderButtonConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const infoText = CONFIG_TYPES.options.button_card.subpanels.button.description;

    const btnTypeCardType = html` ${this._renderSubHeader('Button configuration', [
        { title: 'Show Button', action: this.toggleAction('show-button', buttonIndex) },
      ])}
      ${Create.HaAlert({
        message: infoText,
      })}
      <div class="sub-content">
        ${Create.Picker({
          component: this,
          label: 'Button type',
          value: buttonCard.button_type || 'default',
          configType: 'base_button',
          configIndex: buttonIndex,
          configValue: 'button_type',
          pickerType: 'attribute' as 'attribute',
          items: BUTTON_TYPE,
        })}
        ${Create.Picker({
          component: this,
          label: 'Card type',
          value: buttonCard.card_type || 'default',
          configType: 'base_button',
          configIndex: buttonIndex,
          configValue: 'card_type',
          pickerType: 'attribute' as 'attribute',
          items: CARD_TYPES,
          options: { disabled: buttonCard.button_type === 'action' },
        })}
      </div>`;

    const baseBtnConfig = this._renderButtonApperanceConfig(buttonCard, buttonIndex);

    const buttonAction = this._renderButtonActionConfig(buttonCard, buttonIndex);

    return html`<div class="indicator-config">${btnTypeCardType} ${baseBtnConfig} ${buttonAction}</div>`;
  }

  private _renderButtonApperanceConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const button = buttonCard.button || ({} as ButtonConfig);
    const sharedConfig = {
      configType: 'button',
      configIndex: buttonIndex,
    };

    const secondary = button.secondary[0];
    const entity = secondary.entity;
    const attribute = secondary.attribute || '';
    const state_template = secondary.state_template;

    const attributes = entity ? Object.keys(this.hass.states[entity].attributes) : [];
    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];

    const pickerPrimaryIcon = [
      { value: button.primary, label: 'Primary title', configValue: 'primary', pickerType: 'textfield' as 'textfield' },
      { value: button.icon, label: 'Icon', configValue: 'icon', pickerType: 'icon' as 'icon' },
    ];

    const notifyTemplate = [
      {
        value: button.notify,
        label: 'Notify',
        configValue: 'notify',
        pickerType: 'template' as 'template',
        options: {
          helperText: 'Use Jinja2 template with result `true` to display notification badge',
          label: 'Notify template',
        },
      },
    ];

    const pickerSecondary = [
      { value: secondary.entity, label: 'Entity', configValue: 'entity', pickerType: 'entity' as 'entity' },
      {
        value: attribute,
        label: 'Attribute',
        configValue: 'attribute',
        pickerType: 'attribute' as 'attribute',
        items: attrOpts,
      },
    ];
    const pickerSecondaryState = [
      {
        value: state_template,
        label: 'State Template',
        configValue: 'state_template',
        pickerType: 'template' as 'template',
        options: { helperText: 'Template to display the state of the entity', label: 'State Template' },
      },
    ];

    const content = html`
      <div>
        ${this._renderSubHeader('Primary and icon', [
          { title: 'Show Button', action: this.toggleAction('show-button', buttonIndex) },
        ])}
        <div class="sub-content">
          ${pickerPrimaryIcon.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}
        </div>
        ${notifyTemplate.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }, 'template-content'))}
        <div class="sub-header">
          <div class="sub-header-title">Secondary state display</div>
        </div>
        <div class="sub-content">
          ${pickerSecondary.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}
        </div>
        ${pickerSecondaryState.map((config) =>
          this.generateItemPicker({ ...config, ...sharedConfig }, 'template-content')
        )}
      </div>
    `;

    return html`${Create.ExpansionPanel({
      content: content,
      options: { header: 'Button Appearance', icon: 'mdi:palette' },
    })}`;
  }

  private _renderButtonActionConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const infoAlert = `You are using 'DEFAULT' button type, select 'ACTION' to use Tap Action features`;

    const infoIconAction = `Action is triggered with ICON and Content`;
    const buttonAction = buttonCard.button_action || {};

    // Entity Picker
    const entityPicker = Create.Picker({
      component: this,
      label: 'Entity to interact with',
      value: buttonAction.entity || '',
      configType: 'button_action',
      configIndex: buttonIndex,
      configValue: 'entity',
      pickerType: 'entity' as 'entity',
    });

    // Action selectors mapped from ACTIONSELECTOR
    const actionSelectors = ACTIONSELECTOR.map((action) => {
      return html`
        <div class="select-action">
          <ha-selector
            .hass=${this.hass}
            .label=${action.label}
            .selector=${{
              ui_action: { default_action: action.defaultAction },
            }}
            .value=${buttonAction[action.name] || action.defaultAction}
            .configValue=${action.name}
            .configType=${'button_action'}
            @value-changed=${(ev: CustomEvent) => this.handleActionTypeUpdate(ev, action?.name, buttonIndex)}
          ></ha-selector>
        </div>
      `;
    });

    // The complete content
    const content = html`
      ${this._renderSubHeader('Configure Icon tap behavior', [], false)}
      ${buttonCard.button_type === undefined || buttonCard.button_type === 'default'
        ? html` <div class="sub-content">
            <ha-alert
              alert-type="warning"
              dismissable
              @alert-dismissed-clicked=${(ev: CustomEvent) => this._handlerAlert(ev)}
              >${infoAlert}</ha-alert
            >
          </div>`
        : nothing}
      <div class="sub-content">
        <ha-alert alert-type="info">${infoIconAction}</ha-alert>
      </div>
      <div class="indicator-config">${entityPicker} ${actionSelectors}</div>
    `;

    return Create.ExpansionPanel({
      content: content,
      options: { header: 'Tap interactions', icon: 'mdi:gesture-tap' },
    });
  }

  private _renderTireCardConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const tireCard = buttonCard.tire_card || {
      title: 'Tire Pressures',
      background: '',
      horizontal: false,
      image_size: 100,
      value_size: 100,
      top: 50,
      left: 50,
      front_left: {} as TireEntityConfig,
      front_right: {} as TireEntityConfig,
      rear_left: {} as TireEntityConfig,
      rear_right: {} as TireEntityConfig,
    };

    const info = `The image should be square with a maximum resolution of 450x450 pixels. A transparent background is recommended.`;

    const cardTitle = html`<div class="item-content">
      ${Create.Picker({
        component: this,
        label: 'Card Title',
        value: tireCard.title || '',
        configType: 'tire_base',
        configIndex: buttonIndex,
        configValue: 'title',
        pickerType: 'textfield' as 'textfield',
      })}
    </div>`;

    const imageSizeDirection = [
      {
        value: tireCard.image_size || 100,
        label: 'Base image size',
        configValue: 'image_size',
        pickerType: 'number' as 'number',
        options: { selector: { number: { max: 200, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.value_size || 100,
        label: 'Name & Value size',
        configValue: 'value_size',
        pickerType: 'number' as 'number',
        options: { selector: { number: { max: 150, min: 50, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.top || 50,
        label: `${tireCard.horizontal ? 'Horizontal' : 'Vertical'} position`,
        configValue: 'top',
        pickerType: 'number' as 'number',
        options: { selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.left || 50,
        label: `${tireCard.horizontal ? 'Vertical' : 'Horizontal'} position`,
        configValue: 'left',
        pickerType: 'number' as 'number',
        options: { selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.horizontal || false,
        label: 'Horizontal layout',
        configValue: 'horizontal',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
    ];

    const background = html`
      ${Create.HaAlert({
        message: info,
      })}
      <div class="item-content">
        <ha-textfield
          .label=${'Background image URL'}
          .value=${tireCard.background || ''}
          .buttonIndex=${buttonIndex}
          @change=${(ev: Event) => this.updateTireBackground(ev, buttonIndex)}
        ></ha-textfield>
      </div>
      <ha-button @click=${() => this.shadowRoot?.getElementById('file-upload-new')?.click()}> Upload image </ha-button>
      <input
        style="display: none"
        type="file"
        id="file-upload-new"
        class="file-input"
        @change=${(ev: Event) => this.updateTireBackground(ev, buttonIndex)}
        accept="image/*"
      />
      ${tireCard.background
        ? html`<ha-button style="float: inline-end;" @click=${() => this.updateTireBackground(null, buttonIndex)}
            >Use default</ha-button
          >`
        : ''}
    `;

    const backgroundWrapper = Create.ExpansionPanel({
      content: background,
      options: { header: 'Background Image', icon: 'mdi:image', secondary: 'Configure background image' },
    });

    const sizeAndPosition = Create.ExpansionPanel({
      content: html` <div class="sub-content">
        ${imageSizeDirection.map((config) =>
          this.generateItemPicker({ ...config, configIndex: buttonIndex, configType: 'tire_base' })
        )}
        <ha-button class="item-content" @click=${() => this.resetTireImageSizes(buttonIndex)}
          >Reset <ha-icon icon="mdi:restore"></ha-icon
        ></ha-button>
      </div>`,
      options: { header: 'Size and Position', icon: 'mdi:arrow-expand-all', secondary: 'Configure size and position' },
    });

    const tiresWrapper = Create.ExpansionPanel({
      content: this._renderTiresEntities(tireCard, buttonIndex),
      options: { header: 'Tire Entities', icon: 'mdi:car-tire-alert', secondary: 'Configure tire entities' },
    });

    return html`${this._renderSubHeader(
        'Tire Card Configuration',
        [],
        false,
        html` <ha-button @click=${() => this._togglePreview('tire', buttonIndex)}
          >${this._activePreview !== null ? 'Close Preview' : 'Preview'}</ha-button
        >`
      )}
      <div class="indicator-config">${cardTitle} ${backgroundWrapper} ${sizeAndPosition} ${tiresWrapper}</div>`;
  }

  private _renderTiresEntities(tireCard: TireTemplateConfig, buttonIndex: number): TemplateResult {
    // Generate the tire configuration for each tire
    const frontLeftConfig = this._renderTireConfig(
      tireCard.front_left || ({} as TireEntityConfig),
      'front_left',
      buttonIndex
    );
    const frontRightConfig = this._renderTireConfig(
      tireCard.front_right || ({} as TireEntityConfig),
      'front_right',
      buttonIndex
    );
    const rearLeftConfig = this._renderTireConfig(
      tireCard.rear_left || ({} as TireEntityConfig),
      'rear_left',
      buttonIndex
    );
    const rearRightConfig = this._renderTireConfig(
      tireCard.rear_right || ({} as TireEntityConfig),
      'rear_right',
      buttonIndex
    );

    const tireEntitiesTabs = [
      { key: 'front', label: 'Front', content: html`${frontLeftConfig} ${frontRightConfig}` },
      { key: 'rear', label: 'Rear', content: html`${rearLeftConfig} ${rearRightConfig}` },
    ];

    const tiresWrapper = html`
      <div class="sub-panel">
        ${Create.TabBar({
          tabs: tireEntitiesTabs,
          activeTabIndex: this._activeTireEntityIndex,
          onTabChange: (index: number) => (this._activeTireEntityIndex = index),
        })}
      </div>
    `;
    return tiresWrapper;
  }

  private _renderDefaultCardList(defaultCard: DefaultCardConfig[], buttonIndex: number): TemplateResult {
    const defaultCardlist = this._reindexing
      ? html`<span>Reindexing...</span>`
      : html`<div class="default-card-list" id="default-card-list">
          ${repeat(
            defaultCard,
            (card, cardIndex) => html`
              <div class="item-config-row" data-index="${cardIndex}">
                <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                <div class="item-content">
                  ${Create.Picker({
                    component: this,
                    label: `Category #${cardIndex + 1}`,
                    value: card.title,
                    configType: 'default_card',
                    configIndex: buttonIndex,
                    cardIndex: cardIndex,
                    configValue: 'title',
                    pickerType: 'textfield' as 'textfield',
                  })}
                </div>
                <div class="item-actions">
                  <div
                    class="action-icon delete-icon hidden"
                    @click="${this.toggleAction('category-delete', buttonIndex, cardIndex)}"
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </div>
                  <div class="action-icon" @click="${this.toggleAction('category-edit', buttonIndex, cardIndex)}">
                    <ha-icon icon="mdi:pencil"></ha-icon>
                  </div>
                </div>
              </div>
            `
          )}
        </div>`;

    const footerActions = html` <div class="action-footer">
      <ha-button @click=${this.toggleAction('category-add', buttonIndex)}>Add category</ha-button>
      ${defaultCard.length !== 0
        ? html`<ha-button class="showdelete delete-btn" @click=${this.toggleAction('show-delete')}>Delete</ha-button>`
        : ''}
    </div>`;
    const cardInfo = CONFIG_TYPES.options.button_card.subpanels.default_cards.description;
    return html`
      ${this._renderSubHeader(
        'Card Content',
        [],
        false,
        html`<ha-button @click=${() => this._togglePreview('default', buttonIndex)}
          >${this._activePreview !== null ? 'Close Preview' : 'Preview'}</ha-button
        >`
      )}
      ${Create.HaAlert({
        message: cardInfo,
      })}
      ${defaultCardlist} ${footerActions}
    `;
  }

  private _renderCardItemList(cardIndex: number, buttonIndex: number): TemplateResult {
    if (this._cardIndex === null) return html``;
    const baseCard = this.config.button_card[buttonIndex].default_card[cardIndex];
    const card = this.config.button_card[buttonIndex].default_card[cardIndex].items;

    return html`
      <div class="sub-header">
        <div class="subcard-icon">
          <ha-icon-button-prev @click=${this.toggleAction('category-back')}></ha-icon-button-prev>
          <ha-outlined-button @click=${this.toggleAction('category-back')}>Back</ha-outlined-button>
        </div>
        <div class="sub-header-title">${baseCard.title}</div>
        <ha-button @click=${() => this._togglePreview('default', buttonIndex)}
          >${this._activePreview !== null ? 'Close Preview' : 'Preview'}</ha-button
        >
      </div>
      <div class="default-card-list">
        ${repeat(
          card,
          (item, itemIndex) => html`
            <div class="item-config-row" data-index="${itemIndex}">
              <div class="item-content">
                ${Create.Picker({
                  component: this,
                  label: `Item #${itemIndex + 1}`,
                  value: item.entity,
                  configType: 'card_item',
                  configIndex: buttonIndex,
                  cardIndex: cardIndex,
                  itemIndex: itemIndex,
                  configValue: 'entity',
                  pickerType: 'entity' as 'entity',
                })}
              </div>
              <div class="item-actions">
                <div class="action-icon" @click="${this.toggleAction('edit-item', buttonIndex, cardIndex, itemIndex)}">
                  <ha-icon icon="mdi:pencil"></ha-icon>
                </div>
                <div
                  class="action-icon"
                  @click="${this.toggleAction('delete-item', buttonIndex, cardIndex, itemIndex)}"
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </div>
              </div>
            </div>
          `
        )}
        <div class="item-config-row">
          <div class="item-content">
            <ha-entity-picker
              id="entity-picker-form"
              .hass=${this.hass}
              .value=${this._newItemName.get('entity')}
              .configValue=${'entity'}
              .configType=${'card_item_add'}
              .configIndex=${buttonIndex}
              .cardIndex=${cardIndex}
              .label=${'Add New Item'}
              @change=${this._handleNewItemChange}
              .allowCustomIcons=${true}
            ></ha-entity-picker>
          </div>
          <div style="display: inline-flex;">
            ${Create.Picker({
              component: this,
              label: 'Collapsed items',
              value: baseCard.collapsed_items,
              configType: 'default_card',
              configIndex: buttonIndex,
              cardIndex: cardIndex,
              configValue: 'collapsed_items',
              pickerType: 'selectorBoolean' as 'selectorBoolean',
            })}
          </div>
        </div>
      </div>
    `;
  }

  private _renderItemConfig(itemIndex: number, cardIndex: number, buttonIndex: number): TemplateResult {
    if (this._itemIndex === null) return html``;
    const item = this.config.button_card[buttonIndex].default_card[cardIndex].items[itemIndex];
    const entity = item.entity;
    const name = item?.name || '';
    const icon = item.icon;
    const attribute = item.attribute;
    const state_template = item.state_template;

    const attributes = entity ? Object.keys(this.hass.states[entity].attributes) : [];
    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];
    const sharedConfig = {
      configType: 'sub_card_item',
      configIndex: buttonIndex,
      cardIndex: cardIndex,
      itemIndex: itemIndex,
    };

    const pickerEntity = [
      { value: entity, label: 'Entity', configValue: 'entity', pickerType: 'entity' as 'entity' },
      { value: name, label: 'Name', configValue: 'name', pickerType: 'textfield' as 'textfield' },
      { value: icon, label: 'Icon', configValue: 'icon', pickerType: 'icon' as 'icon' },
      {
        value: attribute,
        label: 'Attribute',
        configValue: 'attribute',
        pickerType: 'attribute' as 'attribute',
        items: attrOpts,
      },
    ];

    const pickerState = [
      {
        value: state_template,
        label: 'State Template',
        configValue: 'state_template',
        pickerType: 'template' as 'template',
        options: { helperText: 'Template to display the state of the entity', label: 'State Template' },
      },
    ];

    return html`
      ${this._renderSubHeader(
        'Item Configuration',
        [{ action: this.toggleAction('item-back'), icon: 'mdi:chevron-left' }],
        false,
        html` <ha-button @click=${() => this._togglePreview('default', buttonIndex)}
          >${this._activePreview === 'default' ? 'Close Preview' : 'Preview'}</ha-button
        >`
      )}

      <div class="sub-content">
        ${pickerEntity.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}
      </div>
      ${pickerState.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }, 'template-content'))}
    `;
  }

  private _renderCustomCardConfig(buttonIndex: number): TemplateResult {
    const yamlCardConfig = this._yamlConfig[buttonIndex];
    const customCard = this.config.button_card[buttonIndex].custom_card;
    const isHidden = customCard === undefined;

    return html`
      <div class="sub-header">
        <div class="sub-header-title">Custom Card Configuration</div>
        ${!isHidden
          ? html` <div class="subcard-icon">
              <ha-button @click=${() => this._togglePreview('custom', buttonIndex)}>
                ${this._activePreview === 'custom' ? 'Close Preview' : 'Preview'}</ha-button
              >
            </div>`
          : ''}
      </div>
      <div class="sub-panel">
        <ha-code-editor
          .autofocus=${true}
          .autocompleteEntities=${true}
          .autocompleteIcons=${true}
          .dir=${'ltr'}
          .mode=${'yaml'}
          .hass=${this.hass}
          .linewrap=${false}
          .value=${yamlCardConfig}
          .configValue=${'custom_card'}
          .configType=${'custom_card'}
          .configIndex=${buttonIndex}
          @value-changed=${(ev: any) => this.handleCustomCardConfig(ev)}
        ></ha-code-editor>
      </div>
    `;
  }

  private _renderTireConfig(
    tireConfig: TireEntityConfig,
    tirePosition: 'front_left' | 'front_right' | 'rear_left' | 'rear_right',
    buttonIndex: number
  ): TemplateResult {
    const sharedConfig = {
      configType: `tire_entity_${tirePosition}`,
      configIndex: buttonIndex,
    };

    const entity = tireConfig?.entity || '';
    const attribute = tireConfig?.attribute || '';
    const name = tireConfig?.name || '';
    const attributeOptions = entity ? Object.keys(this.hass.states[entity]?.attributes || {}) : [];
    const attributeOpts = [...attributeOptions.map((attr) => ({ value: attr, label: attr }))];

    const tirePickers = [
      { value: name, label: 'Name', configValue: 'name', pickerType: 'textfield' as 'textfield' },
      {
        value: entity,
        pickerType: 'entity' as 'entity',
      },
    ];

    const attributePicker = [{ value: attribute, items: attributeOpts, pickerType: 'attribute' as 'attribute' }];

    return html`
      <div class="sub-header">
        <div class="sub-header-title">${tirePosition.replace('_', ' ').toUpperCase()}</div>
      </div>
      <div class="sub-content">
        ${tirePickers.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}
        ${entity ? attributePicker.map((config) => this.generateItemPicker({ ...config, ...sharedConfig })) : nothing}
      </div>
    `;
  }

  private _renderSubHeader(
    title: string,
    actions?: Array<{ title?: string; action: (ev?: Event) => void; icon?: string }>,
    use_icon: boolean = false,
    addedElement?: TemplateResult
  ): TemplateResult {
    const noIcon = html` <div class="sub-header">
      <div class="sub-header-title">${title}</div>
      ${actions?.map(
        (action) =>
          html` <div class="subcard-icon">
            <ha-button @click=${(ev: Event) => action.action(ev)}> ${action.title} </ha-button>
          </div>`
      )}
    </div>`;
    const withIcon = html` <div class="sub-header">
      ${actions?.map(
        (action) =>
          html` <div class="subcard-icon" @click=${(ev: Event) => action.action(ev)}>
            <ha-icon icon=${action.icon}></ha-icon>
          </div>`
      )}
      <div class="sub-header-title">${title}</div>
    </div>`;

    const added = html`<div class="sub-header">
      <div class="sub-header-title">${title}</div>
      <div class="subcard-icon">${addedElement}</div>
    </div>`;

    const addedWithIcon = html`<div class="sub-header">
      ${actions?.map(
        (action) =>
          html` <div class="subcard-icon" @click=${(ev: Event) => action.action(ev)}>
            <ha-icon icon=${action.icon}></ha-icon>
          </div>`
      )}
      <div class="sub-header-title">${title}</div>
      ${addedElement}
    </div>`;

    return use_icon ? withIcon : addedElement ? addedWithIcon : noIcon;
  }

  private toggleAction(
    action: BUTTON_CARD_ACTIONS,
    buttonIndex?: number,
    cardIndex?: number,
    itemIndex?: number
  ): () => void {
    return () => {
      const updateChange = (updated: any) => {
        this.config = { ...this.config, button_card: updated };
        fireEvent(this, 'config-changed', { config: this.config });
        this._reindexing = this._activePreview === 'default' && this._buttonIndex === buttonIndex;
        this._reindexing ? this.resetItems() : this.resetEditorPreview();
      };

      const hideAllDeleteButtons = () => {
        this.shadowRoot?.querySelectorAll('.delete-icon')?.forEach((button) => button.classList.add('hidden'));
      };

      const toggleDeleteIcons = () => {
        const deleteIcons = this.shadowRoot?.querySelectorAll('.delete-icon');
        const isHidden = deleteIcons?.[0]?.classList.contains('hidden');
        const deleteBtn = this.shadowRoot?.querySelector('.showdelete');
        if (deleteBtn) {
          deleteBtn.innerHTML = isHidden ? 'Cancel' : 'Delete';
          deleteIcons?.forEach((item) => item.classList.toggle('hidden'));
        }
      };

      const handleButtonAction = () => {
        switch (action) {
          case 'edit-button':
            this._buttonIndex = buttonIndex!;
            break;
          case 'back-to-list':
            this._buttonIndex = null;
            break;
          case 'category-back':
            this._cardIndex = null;
            this._reindexing = true;
            this.resetItems();
            break;
          case 'add-new-button':
            hideAllDeleteButtons();
            updateChange([...(this.config.button_card || []), NEW_BUTTON_CONFIG]);
            break;
          case 'show-delete':
            toggleDeleteIcons();
            break;
          case 'delete-button':
            if (buttonIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              buttonCardConfig.splice(buttonIndex, 1);
              updateChange(buttonCardConfig);
            }
            break;
          case 'show-button':
            this.editor._dispatchEvent('show-button', { buttonIndex: buttonIndex! });
            break;
          case 'category-edit':
            this._cardIndex = cardIndex!;
            break;
          case 'category-delete':
            if (buttonIndex !== undefined && cardIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
              defaultCard.splice(cardIndex, 1);
              buttonCardConfig[buttonIndex].default_card = defaultCard;
              updateChange(buttonCardConfig);
            }
            break;
          case 'category-add':
            if (buttonIndex !== undefined) {
              hideAllDeleteButtons();
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
              const newCard = { title: 'New Category', collapsed_items: false, items: [] };
              buttonCardConfig[buttonIndex].default_card = [...defaultCard, newCard];
              updateChange(buttonCardConfig);
            }
            break;
          case 'edit-item':
            this._itemIndex = itemIndex!;
            break;
          case 'item-back':
            this._itemIndex = null;
            this.hideClearButton();

            break;

          case 'delete-item':
            if (buttonIndex !== undefined && cardIndex !== undefined && itemIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
              defaultCard[cardIndex].items.splice(itemIndex, 1);
              updateChange(buttonCardConfig);
            }
            break;
        }
      };

      handleButtonAction();
    };
  }

  private generateItemPicker(config: any, wrapperClass = 'item-content'): TemplateResult {
    return html`
      <div class="${wrapperClass}">
        ${Create.Picker({
          ...config,
          component: this,
        })}
      </div>
    `;
  }

  private validateListAndReset(buttonIndex: number): void {
    setTimeout(() => {
      const cardList = this.shadowRoot?.querySelectorAll('.default-card-list .item-config-row').length || 0;
      let configCardListCount: number = 0;
      if (this.config.button_card) {
        configCardListCount = this.config.button_card[buttonIndex].default_card.length;
      }
      console.log('Card list count', cardList, configCardListCount);
      if (cardList !== configCardListCount) {
        this._sortable?.destroy();
        this._reindexing = true;
        this.requestUpdate();
        if (this._activePreview && this._activePreview === 'default') {
          this._togglePreview('default', buttonIndex);
        } else {
          this.resetItems();
        }
      }
    }, 100);
  }

  private resetEditorPreview(): void {
    console.log('Resetting editor preview');

    if (this._activePreview !== null) {
      this._activePreview = null;
      this.requestUpdate();
      this.updateComplete.then(() => {
        this.editor._dispatchEvent('toggle-preview', { cardType: null });
        this.hideClearButton();
      });
    }
  }

  private resetItems(): void {
    setTimeout(() => {
      this._reindexing = false;
      // console.log('Reindexing done');
      if (this._activeTabIndex === 1) {
        // console.log('Reinit sortable');
        this.initSortable();
      }
    }, 50);
    if (this._activePreview === 'default') {
      this._activePreview = null;
      this.requestUpdate();
      this.updateComplete.then(() => {
        this._togglePreview('default', this._buttonIndex);
      });
    }
  }

  private hideClearButton(): void {
    setTimeout(() => {
      const entityPickers = this.shadowRoot?.querySelectorAll('#entity-picker-form');
      if (entityPickers) {
        entityPickers.forEach((entityPicker) => {
          const comboBox = entityPicker.shadowRoot
            ?.querySelector('ha-combo-box')
            ?.shadowRoot?.querySelector('vaadin-combo-box-light > ha-svg-icon.clear-button') as HTMLElement;
          if (comboBox) {
            comboBox.style.display = 'none';
          } else {
            return;
          }
        });
      }
    }, 100);
  }

  private resetTireImageSizes(buttonIndex: number): void {
    const buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    const tireCard = buttonCardConfig[buttonIndex].tire_card;
    tireCard.image_size = 100;
    tireCard.value_size = 100;
    tireCard.top = 50;
    tireCard.left = 50;
    this._copyTireConfigToPreview(tireCard);
    this.config = { ...this.config, button_card: buttonCardConfig };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  /* ----------------------------- PREVIEW METHODS ---------------------------- */

  private _togglePreview = (type: 'default' | 'custom' | 'tire', index: number | null): void => {
    console.log('Toggling preview', type, index);

    const setPreviewConfig = (cardType: string, cardConfig: any) => {
      if (this.config) {
        this.config = { ...this.config, [cardType]: cardConfig };
        fireEvent(this, 'config-changed', { config: this.config });
      }
    };

    const sentEvent = (cardType: string | null) => {
      this.editor._dispatchEvent('toggle-preview', { cardType: cardType });
    };

    if (this._activePreview === type) {
      this._activePreview = null;
      sentEvent(this._activePreview);
      this.editor._cleanConfig();
    } else {
      this._activePreview = type;
      if (type === 'default' && index !== null) {
        let defaultCardConfig = this.config.button_card[index].default_card || [];
        setPreviewConfig('default_card_preview', defaultCardConfig);
      } else if (type === 'custom' && index !== null) {
        let cardConfig = this.config.button_card[index].custom_card || {};
        setPreviewConfig('card_preview', cardConfig);
      } else if (type === 'tire' && index !== null) {
        let tirePreviewConfig = this.config.button_card[index].tire_card || {};
        setPreviewConfig('tire_preview', tirePreviewConfig);
      }
      sentEvent(this._activePreview);
    }
  };

  /* -------------------- HANDLER METHODS FOR CONFIGURATION ------------------- */

  private handleActionTypeUpdate(ev: CustomEvent, action: string, buttonIndex: number): void {
    ev.stopPropagation();
    const actionValue = ev.detail.value;
    this._selectedAction = actionValue;

    // Clone the button card configuration
    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[buttonIndex] };

    // Clone the button action configuration
    let buttonAction = { ...buttonConfig.button_action };

    // Update the action value
    buttonAction[action] = actionValue;

    // Update the button action configuration
    buttonConfig.button_action = buttonAction;

    buttonCardConfig[buttonIndex] = buttonConfig;
    this.config = { ...this.config, button_card: buttonCardConfig };

    fireEvent(this, 'config-changed', { config: this.config });
  }

  public _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }

    const target = ev.target;
    const configType = target.configType;
    const configValue = target.configValue;
    let itemIndex = target.itemIndex;
    let configIndex = target.configIndex;
    let index = target.index;
    let cardIndex = target.cardIndex;

    // Get the new value from the event or the target
    let newValue: any = target.value;

    if (CONFIG_VALUES.includes(configValue)) {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }
    const updates: Partial<VehicleStatusCardConfig> = {};

    let buttonCardConfig = [...(this.config.button_card || [])];

    if (configType === 'button') {
      let buttonConfig = { ...buttonCardConfig[index] };
      let button = { ...buttonConfig.button };

      if (['entity', 'attribute', 'state_template'].includes(configValue)) {
        if (button.secondary[0][configValue] === newValue) {
          console.log('No change');
          return;
        } else {
          const secondary = [...(button.secondary || [])];
          secondary[0] = { ...secondary[0], [configValue]: newValue }; // Update the specific field
          button.secondary = secondary;
        }
      } else {
        button[configValue] = newValue;
      }

      buttonConfig.button = button;
      buttonCardConfig[index] = buttonConfig;
      updates.button_card = buttonCardConfig;
      console.log('updates', updates.button_card[index].button);
    } else if (['base', 'default_card', 'card_item'].includes(configType)) {
      console.log('Config type', configType, 'Config value', configValue, 'New value', newValue);
      const updateButtonConfig = (buttonConfig: any) => {
        if (configType === 'base') {
          buttonConfig[configValue] = newValue;
          console.log('Button config', buttonConfig);
        } else if (configType === 'default_card') {
          let defaultCard = [...buttonConfig.default_card];
          let card = { ...defaultCard[cardIndex] };
          card[configValue] = newValue;
          defaultCard[cardIndex] = card;
          buttonConfig.default_card = defaultCard;
          this._copyToPreview(defaultCard);
        } else if (configType === 'card_item') {
          let defaultCard = [...buttonConfig.default_card];
          let card = { ...defaultCard[cardIndex] };
          let items = [...card.items];
          let item = { ...items[itemIndex] };

          // Only set entity if newValue is valid
          if (configValue === 'entity' && newValue) {
            item.entity = newValue;
          }

          // Only update other properties if newValue is valid
          if (newValue) {
            item[configValue] = newValue;
          }

          items[itemIndex] = item;
          card.items = items;
          defaultCard[cardIndex] = card;
          buttonConfig.default_card = defaultCard;
          this._copyToPreview(defaultCard);
        }
        return buttonConfig;
      };

      let buttonConfig = { ...buttonCardConfig[configType === 'base' ? index : configIndex] };
      buttonCardConfig[configType === 'base' ? index : configIndex] = updateButtonConfig(buttonConfig);
      updates.button_card = buttonCardConfig;
    } else if (configType === 'sub_card_item') {
      configIndex = this._buttonIndex;
      cardIndex = this._cardIndex;
      itemIndex = this._itemIndex;
      let buttonCardConfig = [...(this.config.button_card || [])];
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      let defaultCard = [...buttonConfig.default_card];
      let card = { ...defaultCard[cardIndex] };
      let items = [...card.items];
      let item = { ...items[itemIndex] };

      console.log('Item', item);
      // Only set entity if newValue is valid
      if (item[configValue] === newValue) {
        console.log('No change');
        return;
      } else if (configValue === 'entity' && !newValue) {
        // Remove the item if the entity is empty
        items.splice(itemIndex, 1);
        card.items = items;
        defaultCard[cardIndex] = card;
        buttonConfig.default_card = defaultCard;
        buttonCardConfig[configIndex] = buttonConfig;
        updates.button_card = buttonCardConfig;
        this._copyToPreview(defaultCard);
        console.log('Item removed', item);
      } else {
        item[configValue] = newValue;
        items[itemIndex] = item;
        card.items = items;
        defaultCard[cardIndex] = card;
        buttonConfig.default_card = defaultCard;
        buttonCardConfig[configIndex] = buttonConfig;
        updates.button_card = buttonCardConfig;
        this._copyToPreview(defaultCard);

        console.log('Item updated', item);
      }
    } else if (configType === 'base_button') {
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      buttonConfig[configValue] = newValue;
      if (newValue === 'action') {
        buttonConfig.button_action = {
          entity: '',
          tap_action: { action: 'more-info' },
          hold_action: { action: 'none' },
          double_tap_action: { action: 'none' },
        };
      }
      buttonCardConfig[configIndex] = buttonConfig;
      updates.button_card = buttonCardConfig;

      console.log('Button config', buttonConfig);
    } else if (configType === 'button_action') {
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      let buttonAction = { ...buttonConfig.button_action };
      buttonAction[configValue] = newValue;
      buttonConfig.button_action = buttonAction;
      buttonCardConfig[configIndex] = buttonConfig;
      updates.button_card = buttonCardConfig;
      console.log('Button action', buttonAction);
    } else if (configType === 'tire_base') {
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      let tireCard = buttonConfig.tire_card || ({} as TireTemplateConfig);
      tireCard[configValue] = newValue;
      buttonConfig.tire_card = tireCard;
      buttonCardConfig[configIndex] = buttonConfig;
      updates.button_card = buttonCardConfig;
      this._copyTireConfigToPreview(tireCard);
      // console.log('Tire config', tireCard);
    } else if (configType.startsWith('tire_entity_')) {
      const tirePosition = configType.replace('tire_entity_', '');
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      let tireCard = buttonConfig.tire_card || ({} as TireTemplateConfig);
      let tireConfig = tireCard[tirePosition] || ({} as TireEntityConfig);
      tireConfig[configValue] = newValue;
      tireCard[tirePosition] = tireConfig;
      buttonConfig.tire_card = tireCard;
      buttonCardConfig[configIndex] = buttonConfig;
      updates.button_card = buttonCardConfig;
      this._copyTireConfigToPreview(tireCard);
      // console.log('Tire config', tireConfig);
    }

    // If there are updates, update the config and fire the event
    if (Object.keys(updates).length > 0) {
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
    }
  }

  private _copyToPreview(defaultCard: DefaultCardConfig[]): void {
    if (this._activePreview === 'default' && this.config?.default_card_preview) {
      this.config = { ...this.config, default_card_preview: defaultCard };
      fireEvent(this, 'config-changed', { config: this.config });
    } else {
      console.log('Not copied to preview');
      return;
    }
  }

  private _copyTireConfigToPreview(tireCard: TireTemplateConfig): void {
    if (this._activePreview === 'tire' && this.config?.tire_preview) {
      this.config = { ...this.config, tire_preview: tireCard };
      fireEvent(this, 'config-changed', { config: this.config });
    } else {
      console.log('Not copied to preview');
      return;
    }
  }

  private async updateTireBackground(ev: any, buttonIndex: number): Promise<void> {
    const updateChanged = (value: string) => {
      let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
      let tireCard = buttonCardConfig[buttonIndex].tire_card || {};
      tireCard.background = value;
      buttonCardConfig[buttonIndex].tire_card = tireCard;
      this._copyTireConfigToPreview(tireCard);
      this.config = { ...this.config, button_card: buttonCardConfig };
      fireEvent(this, 'config-changed', { config: this.config });
    };

    if (!ev) {
      updateChanged('');
      return;
    }

    // Handle file upload
    if (ev.target.type === 'file') {
      if (!ev.target.files || ev.target.files.length === 0) {
        return;
      }

      const file = ev.target.files[0];
      const url = await uploadImage(this.hass, file);
      if (url) {
        updateChanged(url);
      }
      return;
    }

    // Handle text input change
    if (ev.target.type === 'text' || ev.target.tagName === 'HA-TEXTFIELD') {
      const value = ev.target.value;
      updateChanged(value);
    } else {
      return;
    }
  }

  private _handleNewItemChange(ev: any): void {
    ev.stopPropagation();
    const { value, cardIndex, configIndex } = ev.target;

    const newItem = new Map(this._newItemName);
    newItem.set('entity', value);
    newItem.set('cardIndex', cardIndex);
    newItem.set('configIndex', configIndex);

    this._newItemName = newItem;

    this.requestUpdate();

    this._handleNewItem();
  }

  private _handleNewItem = () => {
    const reset = () => {
      this._newItemName.clear();
      if (this._activePreview && this._activePreview === 'default' && this._buttonIndex !== null) {
        this._togglePreview('default', this._buttonIndex);
      } else {
        this.resetEditorPreview();
      }
    };

    this.updateComplete.then(() => {
      const entity = this._newItemName.get('entity');
      const cardIndex = this._newItemName.get('cardIndex');
      const configIndex = this._newItemName.get('configIndex');
      if (entity && cardIndex !== undefined && configIndex !== undefined) {
        let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
        let defaultCard = buttonCardConfig[configIndex]?.default_card || [];
        let card = defaultCard[cardIndex];
        let items = card.items || [];
        items.push({ entity });
        card.items = items;
        defaultCard[cardIndex] = card;
        buttonCardConfig[configIndex].default_card = defaultCard;
        this.config = { ...this.config, button_card: buttonCardConfig };
        fireEvent(this, 'config-changed', { config: this.config });
        reset();
      }
    });
  };

  private handleCustomCardConfig(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const target = ev.target;
    const configType = target.configType;
    const configValue = target.configValue;
    const configIndex = target.configIndex;
    const value = target.value;

    console.log('configType', configType, 'configValue', configValue, 'configIndex', configIndex, 'value', value);
    let parsedYaml = [];
    try {
      parsedYaml = YAML.parse(value);
    } catch (e) {
      console.error('Error parsing YAML', e);
      return;
    }

    if (this.config.card_preview && this._activePreview === 'custom') {
      this.config = { ...this.config, card_preview: parsedYaml };
    }

    if (configType === 'custom_card') {
      let buttonCardConfig = [...(this.config.button_card || [])];
      let buttonConfig = { ...buttonCardConfig[configIndex] };
      buttonConfig.custom_card = parsedYaml;
      buttonCardConfig[configIndex] = buttonConfig;
      this.config = { ...this.config, button_card: buttonCardConfig };
      this._debouncedCustomBtnChanged();
    }
  }

  private configChanged(): void {
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _handlerAlert(ev: CustomEvent): void {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
  }
}
