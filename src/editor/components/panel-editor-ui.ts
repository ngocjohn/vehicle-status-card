/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
// Custom card helpers
import { fireEvent, LovelaceCardConfig, HASSDomEvent } from 'custom-card-helpers';
// Local types

import { HA as HomeAssistant, VehicleStatusCardConfig, GUIModeChangedEvent } from '../../types';
import { VehicleStatusCardEditor } from '../editor';

import editorcss from '../../css/editor.css';
import { mdiPlus, mdiCodeBraces, mdiListBoxOutline, mdiDelete } from '@mdi/js';

@customElement('panel-editor-ui')
export class PanelEditorUI extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) config!: VehicleStatusCardConfig;
  @property({ type: Object }) editor!: VehicleStatusCardEditor;
  @state() cards!: Array<LovelaceCardConfig>;
  @state() buttonIndex!: number;
  @state() activePreview!: string;

  @state() protected _selectedCard = 0;
  @state() protected _GUImode = true;
  @state() protected _guiModeAvailable? = true;
  @state() private _initialized = false;

  @query('hui-card-element-editor')
  protected _cardEditorEl?: any;

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

  protected render(): TemplateResult {
    if (!this.config || !this.editor) {
      return html``;
    }

    const selected = this._selectedCard;
    const cards = Array.isArray(this.cards) ? this.cards : [];
    const cardsLength = cards.length;

    const isGuiMode = !this._cardEditorEl || this._GUImode;

    const toolBar = html`
      <div class="toolbar">
        <paper-tabs .selected=${selected} scrollable @iron-activate=${this._handleSelectedCard}>
          ${cards.map((_, i) => {
            return html` <paper-tab> ${i + 1} </paper-tab> `;
          })}
        </paper-tabs>
        <paper-tabs
          id="add-card"
          .selected=${selected === cardsLength ? '0' : undefined}
          @iron-activate=${this._handleSelectedCard}
        >
          <paper-tab>
            <ha-svg-icon .path="${mdiPlus}}"></ha-svg-icon>
          </paper-tab>
        </paper-tabs>
      </div>
    `;

    return html`
      <div class="sub-panel">
        ${toolBar}
        <div id="editor-container">
          ${selected < cardsLength
            ? html`
                <div id="card-options">
                  <ha-icon-button
                    class="gui-mode-button"
                    @click=${this._toggleMode}
                    .disabled=${!this._guiModeAvailable}
                    .path=${isGuiMode ? mdiCodeBraces : mdiListBoxOutline}
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
                    .label=${'Delete'}
                    .path=${mdiDelete}
                    @click=${this._handleDeleteCard}
                  ></ha-icon-button>
                </div>
                <hui-card-element-editor
                  .hass=${this.hass}
                  .value=${this.cards[selected]}
                  .lovelace=${this.editor.lovelace}
                  @config-changed=${this._handleConfigChanged}
                  @GUImode-changed=${this._handleGUIModeChanged}
                ></hui-card-element-editor>
              `
            : html`
                <hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.editor.lovelace}
                  @config-changed=${this._handleCardPicked}
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

    const cards = [...this.cards];
    cards[this._selectedCard] = ev.detail.config;

    if (this.config.card_preview && this.activePreview === 'custom') {
      this.config = { ...this.config, card_preview: cards };
    }

    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this.config = { ...this.config, button_card: buttonCardConfig };

    fireEvent(this, 'config-changed', { config: this.config });

    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  protected _handleCardPicked(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const config = ev.detail.config;
    const cards = [...(this.cards || []), config];

    if (this.config.card_preview && this.activePreview === 'custom') {
      this.config = { ...this.config, card_preview: cards };
    }

    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
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
    const cards = [...this.cards];
    const card = cards.splice(this._selectedCard, 1)[0];
    cards.splice(target, 0, card);

    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    this.config = { ...this.config, button_card: buttonCardConfig };

    this._selectedCard = target;

    fireEvent(this, 'config-changed', { config: this.config });
  }

  protected _handleDeleteCard(ev): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }

    const cards = [...this.cards];
    cards.splice(this._selectedCard, 1);
    const buttonCardConfig = [...(this.config.button_card || [])];
    const buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    buttonConfig.custom_card = cards;
    buttonCardConfig[this.buttonIndex] = buttonConfig;
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
}
