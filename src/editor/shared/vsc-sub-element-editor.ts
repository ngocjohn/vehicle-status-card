import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { fireEvent, HASSDomEvent, HomeAssistant } from '../../ha';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { GUIModeChangedEvent, SubElementEditorConfig } from '../../utils/editor/types';
import '../../utils/editor/sub-editor-header';
import { selectTree } from '../../utils/helpers-dom';
import { LovelaceGenericElementEditor } from '../../utils/lovelace/types';

declare global {
  interface HASSDomEvents {
    'sub-element-editor-closed': undefined;
  }
}

@customElement('vsc-sub-element-editor')
export class VscSubElementEditor extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: SubElementEditorConfig;
  @property({ attribute: false }) public headerLabel?: string;
  @property({ attribute: false }) public headerSecondary?: string;

  @state() protected _GUImode = true;
  @state() protected _guiModeAvailable? = true;

  @query('hui-card-element-editor') protected _cardEditorEl?: any;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('go-back', () => this._hideEditorElements());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('go-back', () => this._hideEditorElements());
  }

  protected firstUpdated(): void {
    this._hideEditorElements();
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  protected render(): TemplateResult {
    const isGuiMode = this._GUImode;
    const secondary = this._config?.elementConfig?.type ?? undefined;
    return html`
      <sub-editor-header
        ._label=${this.headerLabel ?? this._config.type}
        .secondary=${secondary}
        .hidePrimaryAction=${!isGuiMode}
        .secondaryAction=${createSecondaryCodeLabel(!isGuiMode)}
        @primary-action=${this._goBack}
        @secondary-action=${this._toggleGuiMode}
      ></sub-editor-header>
      <hui-card-element-editor
        .hass=${this._hass}
        .value=${this._config.elementConfig}
        @config-changed=${this._handleConfigChanged}
        @GUImode-changed=${this._handleGUIModeChanged}
      ></hui-card-element-editor>
    `;
  }

  private _goBack() {
    fireEvent(this, 'sub-element-editor-closed');
  }

  private _toggleGuiMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    console.debug('GUImode Changed:', this._GUImode, this._guiModeAvailable);
  }

  private _handleConfigChanged(ev: CustomEvent): void {
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _hideEditorElements = async (): Promise<void> => {
    // return; // Disable hiding for now
    const editorEl = this._cardEditorEl?.shadowRoot;
    if (!editorEl) return;
    const configType = this._config?.elementConfig?.type as string;
    if (!['map', 'custom:extra-map-card'].includes(configType)) {
      console.debug('Config type not supported for hiding elements:', configType);
      return;
    }
    let configElement: LovelaceGenericElementEditor | null | undefined = this._cardEditorEl?._configElement;
    while (!configElement) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      configElement = this._cardEditorEl?._configElement;
    }
    if (!configElement) return;

    switch (configType) {
      case 'custom:extra-map-card': {
        const selectors = (await selectTree(
          configElement.shadowRoot,
          'ha-form$ha-selector',
          true
        )) as NodeListOf<HTMLElement>;
        selectors?.forEach((el) => (el.style.display = 'none'));
        break;
      }
      case 'map': {
        const elementsToHide = (await Promise.all([
          selectTree(configElement.shadowRoot, 'ha-form$ha-selector'),
          selectTree(configElement.shadowRoot, 'ha-selector-select'),
          selectTree(configElement.shadowRoot, 'h3'),
        ])) as (HTMLElement | null)[];
        elementsToHide.forEach((el) => el?.style.setProperty('display', 'none'));
        break;
      }
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-sub-element-editor': VscSubElementEditor;
  }
}
