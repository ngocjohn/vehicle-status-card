/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, CSSResultGroup, nothing, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
// Custom card helpers
import { fireEvent, LovelaceCardConfig, HASSDomEvent, LovelaceConfig } from 'custom-card-helpers';
import { cloneDeep } from 'es-toolkit';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { HA as HomeAssistant, VehicleStatusCardConfig, GUIModeChangedEvent } from '../../types';
import { VehicleStatusCardEditor } from '../editor';

@customElement('panel-editor-ui')
export class PanelEditorUI extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @property({ type: Object })
  protected config!: VehicleStatusCardConfig;
  @state() cardEditor!: VehicleStatusCardEditor;
  @state() cards?: LovelaceCardConfig[] = [];
  @state() buttonIndex!: number;
  @state() activePreview?: string | null;

  @state() protected _clipboard?: LovelaceCardConfig;

  @state() protected _selectedCard = 0;
  @state() protected _GUImode = true;
  @state() protected _guiModeAvailable? = true;
  @state() protected _initialized = false;

  @query('hui-card-picker')
  protected _cardPickerEl?: any;
  @query('hui-card-element-editor')
  protected _cardEditorEl?: any;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        .toolbar {
          display: flex;
          --paper-tabs-selection-bar-color: var(--primary-color);
          --paper-tab-ink: var(--primary-color);
        }
        paper-tabs {
          display: flex;
          font-size: 14px;
          flex-grow: 1;
        }
        #add-card {
          max-width: 32px;
          padding: 0;
        }

        #card-options {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        #editor-container {
          padding-inline: 4px;
          /* border: 1px solid var(--divider-color); */
        }

        @media (max-width: 450px) {
          #editor-container {
            margin: 0 -12px;
          }
        }

        .gui-mode-button {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
      `,
    ];
  }

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }

    this.cards = this.config.button_card[this.buttonIndex].custom_card;

    const selected = this._selectedCard!;
    const cardsLength = this.cards.length;

    const isGuiMode = !this._cardEditorEl || this._GUImode;

    const toolBar = html`
      <div class="toolbar">
        <paper-tabs .selected=${selected} scrollable @iron-activate=${this._handleSelectedCard}>
          ${this.cards.map((_card, i) => html` <paper-tab> ${i + 1} </paper-tab> `)}
        </paper-tabs>
        <paper-tabs
          id="add-card"
          .selected=${selected === cardsLength ? '0' : undefined}
          @iron-activate=${this._handleSelectedCard}
        >
          <paper-tab>
            <ha-svg-icon .path="${ICON.PLUS}"></ha-svg-icon>
          </paper-tab>
        </paper-tabs>
      </div>
    `;

    return html`
      <div class="sub-panel">
        ${toolBar}
        <div id="editor-container" class="button-list">
          ${selected < cardsLength
            ? html`
                <div id="card-options">
                  <ha-icon-button
                    class="gui-mode-button"
                    @click=${this._toggleMode}
                    .disabled=${!this._guiModeAvailable}
                    .label=${'Toggle GUI editor mode'}
                    .path=${isGuiMode ? ICON.CODE_BRACES : ICON.LIST_BOX_OUTLINE}
                  ></ha-icon-button>
                  <ha-icon-button-arrow-prev
                    .disabled=${selected === 0}
                    .label=${'Move before'}
                    @click=${this._handleMove}
                    .move=${-1}
                  ></ha-icon-button-arrow-prev>

                  <ha-icon-button-arrow-next
                    .label=${'Move after'}
                    .disabled=${selected === cardsLength - 1}
                    @click=${this._handleMove}
                    .move=${1}
                  ></ha-icon-button-arrow-next>
                  <ha-icon-button
                    .label=${'Copy'}
                    .path=${ICON.CONTENT_COPY}
                    @click=${this._handleCopyCard}
                  ></ha-icon-button>

                  <ha-icon-button
                    .label=${'Cut'}
                    .path=${ICON.CONTENT_CUT}
                    @click=${this._handleCutCard}
                  ></ha-icon-button>

                  <ha-icon-button
                    .label=${'Delete'}
                    .path=${ICON.DELETE}
                    @click=${this._handleDeleteCard}
                  ></ha-icon-button>
                </div>
                <hui-card-element-editor
                  .hass=${this.hass}
                  .value=${this.cards[selected]}
                  .lovelace=${this.cardEditor.lovelace}
                  @config-changed=${this._handleConfigChanged}
                  @GUImode-changed=${this._handleGUIModeChanged}
                ></hui-card-element-editor>
              `
            : html`
                <hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.cardEditor.lovelace}
                  @config-changed=${this._handleCardPicked}
                  ._clipboard=${this._clipboard}
                >
                </hui-card-picker>
              `}
        </div>
      </div>
    `;
  }

  protected _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  protected _handleConfigChanged(ev: HASSDomEvent<any>): void {
    ev.stopPropagation();
    if (!this._initialized) {
      this._initialized = true;
      return;
    }

    if (!this.config) {
      return;
    }

    const cards = [...(this.cards || [])];
    cards[this._selectedCard] = ev.detail.config as LovelaceCardConfig;

    if (this.config.card_preview && this.activePreview === 'custom') {
      this.config = { ...this.config, card_preview: cards };
    }

    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this.config = { ...this.config, button_card: buttonCardConfig };

    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, 'config-changed', { config: this.config });
  }

  protected _handleCardPicked(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const config = ev.detail.config;
    const cards = [...(this.cards || []), config];

    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };

    this._copyToPreview(cards);
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this.config = { ...this.config, button_card: buttonCardConfig };

    fireEvent(this, 'config-changed', { config: this.config });
  }

  protected _handleMove(ev: Event) {
    if (!this.config) {
      return;
    }

    const move = (ev.currentTarget as any).move;
    const source = this._selectedCard;
    const target = source + move;
    const cards = [...(this.cards || [])];
    const movedCard = cards.splice(source, 1)[0];
    cards.splice(target, 0, movedCard);

    // Update the button card config
    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };

    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this._copyToPreview(cards);
    this.config = { ...this.config, button_card: buttonCardConfig };

    this._selectedCard = target;
    fireEvent(this, 'config-changed', { config: this.config });
  }

  protected _handleCopyCard(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }

    this._clipboard = cloneDeep(this.cards![this._selectedCard]);
  }

  protected _handleCutCard(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }

    this._handleCopyCard(ev);
    this._handleDeleteCard(ev);
  }

  protected _handleDeleteCard(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }

    const cards = [...(this.cards || [])];
    cards.splice(this._selectedCard, 1);
    const buttonCardConfig = [...(this.config.button_card || [])];
    const buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this._copyToPreview(cards);
    this.config = { ...this.config, button_card: buttonCardConfig };

    this._selectedCard = Math.max(0, this._selectedCard - 1);
    fireEvent(this, 'config-changed', { config: this.config });
  }

  protected _handleSelectedCard(ev): void {
    if (ev.target.id === 'add-card') {
      this._selectedCard = this.cards!.length;
      return;
    }

    this._setMode(true);
    this._guiModeAvailable = true;
    this._selectedCard = parseInt(ev.detail.selected, 10);
  }

  protected _setMode(value: boolean): void {
    this._GUImode = value;
    if (this._cardEditorEl) {
      this._cardEditorEl!.GUImode = value;
    }
  }

  protected _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  protected _copyToPreview(cards: LovelaceCardConfig[]): void {
    if (!this.config.card_preview && this.activePreview !== 'custom') {
      return;
    }

    this.config = { ...this.config, card_preview: cards };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-editor-ui': PanelEditorUI;
  }
}
