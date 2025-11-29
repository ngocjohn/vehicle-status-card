import { css, CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { fireEvent, HASSDomEvent } from '../../ha';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { GUIModeChangedEvent, SubElementEditorConfig } from '../../utils/editor/types';
import '../../utils/editor/sub-editor-header';
import { selectTree } from '../../utils/helpers-dom';
import { LovelaceGenericElementEditor } from '../../utils/lovelace/types';
import { BaseEditor } from '../base-editor';

declare global {
  interface HASSDomEvents {
    'sub-element-editor-closed': undefined;
    'sub-element-config-changed': {
      config: SubElementEditorConfig['elementConfig'];
    };
  }
}
const EDITOR_TYPES_HIDE_ELEMENTS = ['map', 'custom:extra-map-card', 'vertical-stack', 'picture-elements'];
@customElement('vsc-sub-element-editor')
export class VscSubElementEditor extends BaseEditor {
  @property({ attribute: false }) public _config!: SubElementEditorConfig;
  @property({ attribute: false }) public headerLabel?: string;
  @property({ attribute: false }) public headerSecondary?: string;
  @property({ type: Boolean, attribute: 'hide-header', reflect: true }) public hideHeader = false;

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
    const secondary = this._config?.type ?? this.headerSecondary ?? '';
    return html`
      ${!this.hideHeader
        ? html`
            <sub-editor-header
              ._label=${this.headerLabel ?? this._config.type}
              .secondary=${secondary}
              .hidePrimaryAction=${!isGuiMode}
              .secondaryAction=${createSecondaryCodeLabel(!isGuiMode)}
              @primary-action=${this._goBack}
              @secondary-action=${this._toggleGuiMode}
            ></sub-editor-header>
          `
        : nothing}

      <hui-card-element-editor
        .hass=${this._hass}
        .value=${this._config.elementConfig}
        .lovelace=${this._editor.lovelace}
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
    ev.stopPropagation();
    console.debug('Config Changed (SubElementEditor)');
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, 'sub-element-config-changed', { config: ev.detail.config });
  }

  private _hideEditorElements = async (): Promise<void> => {
    // return; // Disable hiding for now
    const editorEl = this._cardEditorEl?.shadowRoot;
    if (!editorEl) return;
    const configType = this._config?.type;
    if (!EDITOR_TYPES_HIDE_ELEMENTS.includes(configType)) {
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
      case 'vertical-stack': {
        const haFormTitle = configElement.shadowRoot?.querySelector('ha-form') as HTMLElement | null;
        haFormTitle?.style.setProperty('display', 'none');
        break;
      }
      case 'picture-elements': {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const elementsToHide = (await Promise.all([
          selectTree(configElement.shadowRoot, 'ha-form'),
          selectTree(configElement.shadowRoot, 'hui-picture-elements-card-row-editor$h3'),
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
