import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import '../../editor/components/panel-editor-ui';
import '../../editor/components/sub-panel-yaml';
import '../../editor/components/panel-tire-config';
import '../../editor/components/panel-base-button';
import '../../editor/components/panel-default-card-category';
import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { PanelBaseButton } from '../../editor/components/panel-base-button';
import { PanelDefaultCard } from '../../editor/components/panel-default-card-category';
import { PanelTireConfig } from '../../editor/components/panel-tire-config';
import {
  HomeAssistant,
  VehicleStatusCardConfig,
  DefaultCardConfig,
  ButtonCardConfig,
  TireTemplateConfig,
  fireEvent,
  BaseButtonConfig,
} from '../../types';
import { Create, showConfirmDialog } from '../../utils';
import { VehicleStatusCardEditor } from '../editor';
import { BUTTON_CARD_ACTIONS, CONFIG_TYPES, NEW_BUTTON_CONFIG, ACTIONS } from '../editor-const';
import { DEFAULT_TIRE_CONFIG } from '../form';

@customElement('panel-button-card')
export class PanelButtonCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;

  @state() _activePreview: string | null = null;

  @state() _activeTabIndex: number = 0;
  @state() _buttonIndex: number | null = null;
  @state() _cardIndex: number | null = null;

  @state() _reindexing: boolean = false;
  @state() _reindexButton: boolean = false;

  @state() _yamlEditorActive: boolean = false;
  @state() _yamlDefaultCardActive: boolean = false;

  private _sortable: Sortable | null = null;
  private _btnSortable: Sortable | null = null;

  @query('vsc-panel-tire-config') _panelTireConfig?: PanelTireConfig;
  @query('vsc-panel-base-button') _panelBaseButton?: PanelBaseButton;
  @query('vsc-panel-default-card') _panelDefaultCard?: PanelDefaultCard;

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
    this.initBtnSortable();
  }

  private initBtnSortable(): void {
    this.updateComplete.then(() => {
      const list = this.shadowRoot?.getElementById('button-list');
      if (!list) {
        console.log('List not found');
        return;
      }

      console.log('Init sortable');
      this._btnSortable = new Sortable(list, {
        handle: '.handle',
        ghostClass: 'sortable-ghost',
        ignore: '.ignore',
        animation: 150,
        onEnd: (evt) => {
          this._btnHandleSortEnd(evt);
        },
      });
    });
  }

  private _btnHandleSortEnd(evt: any): void {
    const { oldIndex, newIndex } = evt;
    const buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    const button = buttonCardConfig[oldIndex];
    buttonCardConfig.splice(oldIndex, 1);
    buttonCardConfig.splice(newIndex, 0, button);
    this.config = { ...this.config, button_card: buttonCardConfig };
    fireEvent(this, 'config-changed', { config: this.config });
    this._reindexButton = true;
    setTimeout(() => {
      this.resetItems();
    }, 50);
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

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_buttonIndex') && this._buttonIndex === null && this._activePreview !== null) {
      this.resetEditorPreview();
    }

    if (changedProps.has('_activeTabIndex') && this._activePreview !== null) {
      this.resetEditorPreview();
      this.cardEditor._cleanConfig();
    }

    if (changedProps.has('_activeTabIndex') && this._activeTabIndex === 1) {
      this.initSortable();
    }
    if (changedProps.has('_activeTabIndex') && this._yamlDefaultCardActive) {
      this._yamlDefaultCardActive = false;
    }
  }

  protected render(): TemplateResult {
    const mainButtonCard = this._renderButtonList();
    const buttonConfig = this._renderButtonCardConfig();

    return this._buttonIndex === null ? mainButtonCard : buttonConfig;
  }

  private _renderButtonList(): TemplateResult {
    const buttons = this.config.button_card ?? [];

    if (this._reindexButton) {
      return html`<ha-circular-progress indeterminate size="small"></ha-circular-progress>`;
    }

    let foundHiddenDivider = false;

    return html`
      <div class="card-config">
        ${this._renderSubHeader(
          'Button List',
          [],
          false,
          html`<ha-button @click=${this.toggleAction('add-new-button')}>Add New Button</ha-button>`
        )}
        ${!buttons.length
          ? html`<span>No buttons added</span>`
          : html`
              <div class="button-list" id="button-list">
                ${buttons.map((button, index) => {
                  const isHidden = button.hide_button;
                  // Add a divider before the first hidden button
                  if (isHidden && !foundHiddenDivider) {
                    foundHiddenDivider = true;
                    return html`
                      <div class="sub-header divider">
                        <div>Hidden Buttons</div>
                      </div>
                      ${this._renderButton(button, index)}
                    `;
                  }
                  return this._renderButton(button, index);
                })}
              </div>
            `}
      </div>
    `;
  }

  private _renderButton(button: any, index: number): TemplateResult {
    let actionMap = [
      { title: 'Show Button', action: ACTIONS.SHOW_BUTTON, icon: 'mdi:eye' },
      { title: 'Duplicate', action: ACTIONS.DUPLICATE_BUTTON, icon: 'mdi:content-duplicate' },
      { title: 'Hide on card', action: ACTIONS.HIDE_BUTTON, icon: 'mdi:eye-off' },
      { title: 'Unhide on card', action: ACTIONS.UNHIDE_BUTTON, icon: 'mdi:eye' },
      {
        title: 'Delete',
        action: ACTIONS.DELETE_BUTTON,
        icon: 'mdi:delete',
        color: 'var(--error-color)',
      },
    ];

    actionMap = actionMap.filter((action) => {
      if (action.title === 'Show Button' && button.hide_button) {
        return false;
      }
      if (action.title === 'Hide on card' && button.hide_button) {
        return false;
      }

      if (action.title === 'Unhide on card' && !button.hide_button) {
        return false;
      }

      return true;
    });

    return html`
      <div class="item-config-row" data-index="${index}" ?hiddenoncard=${button.hide_button}>
        <div class=${!button.hide_button ? 'handle' : 'ignore'}>
          <ha-icon-button class="action-icon" .path=${ICON.DRAG}></ha-icon-button>
        </div>
        <div class="sub-content">
          <ha-selector
            .hass=${this.hass}
            .value=${button.button.primary}
            .configValue=${'primary'}
            .configType=${'button'}
            .configIndex=${index}
            .label=${`Button #${index + 1}`}
            .selector=${{ text: {} }}
            .required=${false}
            @value-changed=${this._handleTitlePrimaryChanged}
          ></ha-selector>
        </div>
        <div class="item-actions">
          <ha-icon-button
            class="action-icon"
            @click="${this.toggleAction('edit-button', index)}"
            .path=${ICON.PENCIL}
          ></ha-icon-button>
          <ha-button-menu
            .corner=${'TOP_START'}
            .fixed=${true}
            .menuCorner=${'START'}
            .activatable=${true}
            .naturalMenuWidth=${true}
            @closed=${(ev: Event) => ev.stopPropagation()}
          >
            <ha-icon-button class="action-icon" slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
            ${actionMap.map(
              (action) =>
                html`<mwc-list-item
                  @click=${this.toggleAction(action.action, index)}
                  .graphic=${'icon'}
                  style="z-index: 6; ${action.color ? `color: ${action.color}` : ''}"
                >
                  <ha-icon
                    icon=${action.icon}
                    slot="graphic"
                    style="${action.color ? `color: ${action.color}` : ''}"
                  ></ha-icon>
                  ${action.title}
                </mwc-list-item>`
            )}
          </ha-button-menu>
        </div>
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
            : this._renderCardItemList(this._cardIndex, buttonIndex),
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
          `${button.icon}`,

          this._yamlEditorActive
            ? [{ title: 'Close Editor', action: this.toggleAction('yaml-editor'), icon: ICON.CLOSE }]
            : [{ title: 'Back to list', action: this.toggleAction('back-to-list'), icon: ICON.CHEVRON_LEFT }],

          [{ action: this.toggleAction('yaml-editor') }]
        )}

        <div class="sub-panel">
          ${!this._yamlEditorActive
            ? Create.VicTab({
                tabs: configTabs,
                activeTabIndex: this._activeTabIndex,
                onTabChange: (index: number) => (this._activeTabIndex = index),
              })
            : html`<vsc-sub-panel-yaml
                .hass=${this.hass}
                .config=${this.config}
                .cardEditor=${this.cardEditor}
                .configIndex=${buttonIndex}
                .configKey=${'button_card'}
                .configDefault=${buttonCard}
                @yaml-config-changed=${this._handleYamlChange}
              ></vsc-sub-panel-yaml>`}
        </div>
      </div>
    `;
  }

  private _handleYamlChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value, index } = ev.detail;
    if (!isValid || !this.config) {
      return;
    }

    const newConfig = value;
    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[index] };
    console.log('buttonConfig', buttonConfig);
    buttonConfig = { ...buttonConfig, ...newConfig };
    console.log('newConfig', newConfig);
    buttonCardConfig[index] = buttonConfig;
    console.log('buttonCardConfig', buttonCardConfig);
    fireEvent(this, 'config-changed', { config: { ...this.config, button_card: buttonCardConfig } });
  }

  private _renderHeader(
    title: string,
    icon?: string,
    actions?: Array<{ title?: string; action: (ev?: Event) => void; icon?: string }>,
    addedAction?: Array<{ action: (ev?: Event) => void; icon?: string }>
  ): TemplateResult {
    return html` <div class="header-row">
      ${actions?.map(
        (action) =>
          html` <div class="icon-title" @click=${(ev: Event) => action.action(ev)}>
            ${ifDefined(action.icon) ? html`<ha-icon-button .path=${action.icon}></ha-icon-button>` : nothing}
            <span>${action.title}</span>
          </div>`
      )}
      <div class="header-title">${title} ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}</div>
      ${addedAction?.map(
        (action) =>
          html` <ha-icon-button
            class="header-yaml-icon"
            @click=${(ev: Event) => action.action(ev)}
            .path=${ICON.CODE_JSON}
          >
          </ha-icon-button>`
      )}
    </div>`;
  }

  private _renderButtonConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const headerActions = !buttonCard.hide_button
      ? [{ title: 'Show Button', action: this.toggleAction('show-button', buttonIndex) }]
      : [];

    const btnHeader = this._renderSubHeader('Button configuration', headerActions);
    const infoText = CONFIG_TYPES.options.button_card.subpanels.button.description;

    const baseBtnConfig = {
      button: buttonCard.button,
      button_action: buttonCard.button_action,
      button_type: buttonCard.button_type || 'default',
      card_type: buttonCard.card_type,
      hide_button: buttonCard.hide_button,
    } as BaseButtonConfig;

    return html`
      <div class="indicator-config">
        ${btnHeader}
        ${Create.HaAlert({
          message: infoText,
        })}
        <vsc-panel-base-button
          .hass=${this.hass}
          .cardEditor=${this.cardEditor}
          .buttonConfig=${baseBtnConfig}
          @button-config-changed=${this._handleButtonConfigChange}
        ></vsc-panel-base-button>
      </div>
    `;
  }

  private _renderTireCardConfig(buttonCard: ButtonCardConfig, buttonIndex: number): TemplateResult {
    const header = this._renderSubHeader(
      'Tire Card Configuration',
      [],
      false,
      html` <ha-button .outlined=${true} @click=${() => this._togglePreview('tire', buttonIndex)}
        >${this._activePreview !== null ? 'Close Preview' : 'Preview'}</ha-button
      >`
    );

    const tireCard = buttonCard.tire_card || (DEFAULT_TIRE_CONFIG as TireTemplateConfig);
    return html` ${header}
      <vsc-panel-tire-config
        .hass=${this.hass}
        .cardEditor=${this.cardEditor}
        .tireConfig=${tireCard}
        @tire-config-changed=${this._handleTireConfigChange}
      ></vsc-panel-tire-config>`;
  }

  private _renderDefaultCardList(defaultCard: DefaultCardConfig[], buttonIndex: number): TemplateResult {
    const actions = [
      { title: 'Duplicate', action: ACTIONS.CATEGORY_DUPLICATE, icon: 'mdi:content-duplicate' },
      { title: 'Delete', action: ACTIONS.CATEGORY_DELETE, icon: 'mdi:delete', color: 'var(--error-color)' },
    ];
    const defaultCardlist = this._reindexing
      ? html`<span>Reindexing...</span>`
      : html`<div class="default-card-list" id="default-card-list">
          ${repeat(
            defaultCard,
            (card, cardIndex) => html`
              <div class="item-config-row" data-index="${cardIndex}">
                <div class="handle">
                  <ha-icon-button class="action-icon" .path=${ICON.DRAG}></ha-icon-button>
                </div>
                <div class="item-content">
                  <ha-selector
                    .hass=${this.hass}
                    .value=${card.title}
                    .configValue=${'title'}
                    .configType=${'default_card'}
                    .configIndex=${buttonIndex}
                    .cardIndex=${cardIndex}
                    .label=${`Category #${cardIndex + 1}`}
                    .selector=${{ text: {} }}
                    .required=${false}
                    @value-changed=${this._handleTitlePrimaryChanged}
                  ></ha-selector>
                </div>
                <div class="item-actions">
                  <ha-icon-button
                    class="action-icon"
                    .path=${ICON.PENCIL}
                    @click="${this.toggleAction('category-edit', buttonIndex, cardIndex)}"
                  ></ha-icon-button>
                  <ha-button-menu
                    .corner=${'BOTTOM_START'}
                    .fixed=${true}
                    .menuCorner=${'START'}
                    .activatable=${true}
                    .naturalMenuWidth=${true}
                    @closed=${(ev: Event) => ev.stopPropagation()}
                  >
                    <ha-icon-button class="action-icon" .path=${ICON.DOTS_VERTICAL} slot="trigger"></ha-icon-button>
                    ${actions.map(
                      (action) =>
                        html`<mwc-list-item
                          @click=${this.toggleAction(action.action, buttonIndex, cardIndex)}
                          .graphic=${'icon'}
                          style="${action.color ? `color: ${action.color}` : ''}"
                        >
                          <ha-icon
                            icon=${action.icon}
                            slot="graphic"
                            style="${action.color ? `color: ${action.color}` : ''}"
                          ></ha-icon>
                          ${action.title}
                        </mwc-list-item>`
                    )}
                  </ha-button-menu>
                </div>
              </div>
            `
          )}
        </div>`;

    const yamlDefaultEditor = html` <vsc-sub-panel-yaml
      .hass=${this.hass}
      .configDefault=${defaultCard}
      .extraAction=${true}
      .configIndex=${buttonIndex}
      @close-editor=${() => (this._yamlDefaultCardActive = false)}
      @yaml-config-changed=${this._handleYamlDefaultCardChange}
    ></vsc-sub-panel-yaml>`;

    const footerActions = html` <div class="action-footer">
      <ha-button @click=${this.toggleAction('category-add', buttonIndex)}>Add category</ha-button>
      <ha-button @click=${this.toggleAction('yaml-default-card', buttonIndex)} .label=${'Edit YAML'}></ha-button>
    </div>`;

    const cardInfo = CONFIG_TYPES.options.button_card.subpanels.default_cards.description;
    return html`
      ${this._renderSubHeader(
        'Card Content',
        [],
        false,
        html`<ha-button
          .outlined=${true}
          .label=${this._activePreview !== null ? 'Close Preview' : 'Preview'}
          @click=${() => this._togglePreview('default', buttonIndex)}
        ></ha-button>`
      )}
      ${Create.HaAlert({
        message: cardInfo,
      })}
      ${this._yamlDefaultCardActive ? yamlDefaultEditor : html` ${defaultCardlist} ${footerActions} `}
    `;
  }

  private _renderCardItemList(cardIndex: number, buttonIndex: number): TemplateResult {
    if (this._cardIndex === null) return html``;
    const baseCard = this.config.button_card[buttonIndex].default_card[cardIndex] as DefaultCardConfig;

    return html`
      <div class="sub-header">
        <div class="subcard-icon">
          <ha-icon-button-prev @click=${this.toggleAction('category-back')}></ha-icon-button-prev>
        </div>
        <div>${baseCard.title}</div>
        <ha-button .outlined=${true} @click=${() => this._togglePreview('default', buttonIndex)}
          >${this._activePreview !== null ? 'Close Preview' : 'Preview'}</ha-button
        >
      </div>
      <vsc-panel-default-card
        .hass=${this.hass}
        .defaultCardConfig=${baseCard}
        @card-item-changed=${this._handleCardItemChange}
      ></vsc-panel-default-card>
    `;
  }

  private _renderCustomCardConfig(buttonIndex: number): TemplateResult {
    const customCard = this.config.button_card[buttonIndex].custom_card;
    const isHidden = customCard === undefined;

    return html`
      <div class="sub-header">
        <div>Custom Card Configuration</div>
        ${!isHidden
          ? html` <div class="subcard-icon">
              <ha-button @click=${() => this._togglePreview('custom', buttonIndex)}>
                ${this._activePreview === 'custom' ? 'Close Preview' : 'Preview'}</ha-button
              >
            </div>`
          : ''}
      </div>
      <div class="sub-panel">
        <panel-editor-ui
          .hass=${this.hass}
          .config=${this.config}
          .cardEditor=${this.cardEditor}
          .buttonIndex=${buttonIndex}
          .activePreview=${this._activePreview}
        ></panel-editor-ui>
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
      <div>${title}</div>
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
            <ha-icon icon=${ifDefined(action.icon)}></ha-icon>
          </div>`
      )}
      <div>${title}</div>
    </div>`;

    const addedWithIcon = html`<div class="sub-header">
      ${actions?.map(
        (action) =>
          html` <div class="subcard-icon" @click=${(ev: Event) => action.action(ev)}>
            <ha-icon icon=${ifDefined(action.icon)}></ha-icon>
            <ha-button>${ifDefined(action.title)}</ha-button>
          </div>`
      )}
      <div>${title}</div>
      ${addedElement}
    </div>`;

    return use_icon ? withIcon : addedElement ? addedWithIcon : noIcon;
  }

  private toggleAction(action: BUTTON_CARD_ACTIONS, buttonIndex?: number, cardIndex?: number): () => void {
    return () => {
      const updateChange = (updated: any) => {
        this.config = { ...this.config, button_card: updated };
        fireEvent(this, 'config-changed', { config: this.config });
        this._reindexing = this._activePreview === 'default' && this._buttonIndex === buttonIndex;
        this._reindexing ? this.resetItems() : this.resetEditorPreview();
      };

      const handleButtonAction = async () => {
        switch (action) {
          case 'edit-button':
            this._buttonIndex = buttonIndex!;
            break;
          case 'back-to-list':
            this._buttonIndex = null;
            this.initBtnSortable();
            break;
          case 'category-back':
            this._cardIndex = null;
            this._reindexing = true;
            this.resetItems();
            break;
          case 'add-new-button':
            updateChange([...(this.config.button_card || []), NEW_BUTTON_CONFIG]);
            break;
          case 'delete-button':
            if (buttonIndex !== undefined) {
              let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this button?', 'Delete');
              if (!confirm) {
                return;
              }
              const buttonCardConfig = [...(this.config.button_card || [])];
              buttonCardConfig.splice(buttonIndex, 1);
              updateChange(buttonCardConfig);
            }
            break;
          case 'show-button':
            this.cardEditor._dispatchEvent('show-button', { buttonIndex: buttonIndex });
            break;
          case 'category-edit':
            this._cardIndex = cardIndex!;
            break;
          case 'category-delete':
            if (buttonIndex !== undefined && cardIndex !== undefined) {
              let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this category?', 'Delete');
              if (!confirm) {
                return;
              }
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
              defaultCard.splice(cardIndex, 1);
              buttonCardConfig[buttonIndex].default_card = defaultCard;
              updateChange(buttonCardConfig);
            }
            break;
          case 'category-duplicate':
            if (buttonIndex !== undefined && cardIndex !== undefined) {
              console.log('Duplicate category', buttonIndex, cardIndex);
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCards = buttonCardConfig[buttonIndex]?.default_card || [];
              console.log('Default cards', defaultCards);
              const newCard = JSON.parse(JSON.stringify(defaultCards[cardIndex]));
              console.log('New card', newCard);
              this.config = {
                ...this.config,
                button_card: [
                  ...buttonCardConfig.slice(0, buttonIndex),
                  { ...buttonCardConfig[buttonIndex], default_card: [...defaultCards, newCard] },
                  ...buttonCardConfig.slice(buttonIndex + 1),
                ],
              };
              fireEvent(this, 'config-changed', { config: this.config });
            }
            break;
          case 'category-add':
            if (buttonIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              const defaultCard = buttonCardConfig[buttonIndex]?.default_card || [];
              const newCard = { title: 'New Category', collapsed_items: false, items: [] };
              buttonCardConfig[buttonIndex].default_card = [...defaultCard, newCard];
              updateChange(buttonCardConfig);
            }
            break;
          case 'duplicate-button':
            if (buttonIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              const newButton = JSON.parse(JSON.stringify(buttonCardConfig[buttonIndex]));
              buttonCardConfig.push(newButton);
              updateChange(buttonCardConfig);
            }
            break;
          case 'hide-button':
            if (buttonIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              buttonCardConfig[buttonIndex].hide_button = !buttonCardConfig[buttonIndex].hide_button;
              // move the button to the end of the list
              const button = buttonCardConfig.splice(buttonIndex, 1);
              buttonCardConfig.push(button[0]);
              updateChange(buttonCardConfig);
            }
            break;
          case 'unhide-button':
            if (buttonIndex !== undefined) {
              const buttonCardConfig = [...(this.config.button_card || [])];
              buttonCardConfig[buttonIndex].hide_button = false;
              // move the button to the end of visible buttons
              const button = buttonCardConfig.splice(buttonIndex, 1);
              const visibleButtons = buttonCardConfig.filter((button) => !button.hide_button);
              buttonCardConfig.splice(visibleButtons.length, 0, button[0]);

              updateChange(buttonCardConfig);
            }
            break;

          case 'yaml-editor':
            this._yamlEditorActive = !this._yamlEditorActive;
            break;
          case 'yaml-default-card':
            this._yamlDefaultCardActive = !this._yamlDefaultCardActive;
            break;
        }
      };

      handleButtonAction();
    };
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
        this.cardEditor._dispatchEvent('toggle-preview', { cardType: null });
      });
    }
  }

  private resetItems(): void {
    setTimeout(() => {
      this._reindexing = false;
      this._reindexButton = false;
      // console.log('Reindexing done');
      if (this._activeTabIndex === 1) {
        // console.log('Reinit sortable');
        this.initSortable();
      }
      if (!this._activePreview) {
        this.initBtnSortable();
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
      this.cardEditor._dispatchEvent('toggle-preview', { cardType: cardType });
    };

    if (this._activePreview !== null) {
      this._activePreview = null;
      sentEvent(this._activePreview);
      this.cardEditor._cleanConfig();
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

  private _copyToPreview(defaultCard: DefaultCardConfig[]): void {
    if (this._activePreview === 'default' && this.config?.default_card_preview) {
      this.config = { ...this.config, default_card_preview: defaultCard };
      fireEvent(this, 'config-changed', { config: this.config });
    } else {
      console.log('Not copied to preview');
      return;
    }
  }

  private _handleTitlePrimaryChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const cardIndex = ev.target.cardIndex;
    const buttonIndex = ev.target.configIndex;
    const configValue = ev.target.configValue;
    const configType = ev.target.configType;
    const newValue = ev.detail.value;

    const updates: Partial<VehicleStatusCardConfig> = {};

    let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    if (configType === 'default_card') {
      let buttonCard = { ...buttonCardConfig[buttonIndex] };
      let defaultCard = [...buttonCard.default_card];
      let card = { ...defaultCard[cardIndex] };
      card[configValue] = newValue;
      defaultCard[cardIndex] = card;
      buttonCard.default_card = defaultCard;
      buttonCardConfig[buttonIndex] = buttonCard;
      updates.button_card = buttonCardConfig;
      this._copyToPreview(defaultCard);
    } else if (configType === 'button') {
      let buttonCard = { ...buttonCardConfig[buttonIndex] };
      let button = { ...buttonCard.button };
      button[configValue] = newValue;
      buttonCard.button = button;
      buttonCardConfig[buttonIndex] = buttonCard;
      updates.button_card = buttonCardConfig;
    }

    if (Object.keys(updates).length > 0) {
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
    }
  }

  private _handleYamlDefaultCardChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value, index } = ev.detail;
    if (!isValid || !this.config) {
      return;
    }
    const newConfig = value;
    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[index] };
    buttonConfig.default_card = newConfig;
    buttonCardConfig[index] = buttonConfig;
    this._copyToPreview(newConfig);
    this.config = { ...this.config, button_card: buttonCardConfig };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _handleCardItemChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const cardItemConfig = ev.detail.config;
    const buttonIndex = this._buttonIndex!;
    const cardIndex = this._cardIndex!;
    let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    let buttonCard = { ...buttonCardConfig[buttonIndex] };
    let defaultCard = [...buttonCard.default_card];
    let card = { ...defaultCard[cardIndex] };
    card = cardItemConfig;
    defaultCard[cardIndex] = card;
    buttonCard.default_card = defaultCard;
    buttonCardConfig[buttonIndex] = buttonCard;
    this.config = { ...this.config, button_card: buttonCardConfig };
    this._copyToPreview(defaultCard);
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _handleButtonConfigChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const buttonConfig = ev.detail.config;
    const buttonIndex = this._buttonIndex!;
    let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    let buttonCard = { ...buttonCardConfig[buttonIndex] };
    buttonCard = {
      ...buttonCard,
      ...buttonConfig,
    };
    buttonCardConfig[buttonIndex] = buttonCard;
    this.config = { ...this.config, button_card: buttonCardConfig };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _handleTireConfigChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const tireConfig = ev.detail.config;
    const buttonIndex = this._buttonIndex!;
    let buttonCardConfig = JSON.parse(JSON.stringify(this.config.button_card || []));
    let buttonCard = { ...buttonCardConfig[buttonIndex] };
    // this._copyTireConfigToPreview(tireConfig);
    buttonCard.tire_card = tireConfig;
    buttonCardConfig[buttonIndex] = buttonCard;
    this.config = { ...this.config, button_card: buttonCardConfig };
    if (this._activePreview === 'tire' && this.config?.tire_preview) {
      this.config = { ...this.config, tire_preview: tireConfig };
      // fireEvent(this, 'config-changed', { config: this.config });
    } else {
      console.log('Not copied to preview');
      return;
    }
    fireEvent(this, 'config-changed', { config: this.config });
  }
}
