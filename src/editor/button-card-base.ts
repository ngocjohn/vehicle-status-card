import { CSSResultGroup, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import { EditorSubCardPreviewEvent } from '../events';
import { BaseButtonCardItemConfig, PreviewType } from '../types/config';
import { ButtonArea, ConfigArea } from '../types/config-area';
import { ButtonSubCardPreviewConfig } from '../utils/editor/types';
import { BaseEditor } from './base-editor';

export class ButtonCardBaseEditor extends BaseEditor {
  @property({ attribute: false }) protected _btnConfig!: BaseButtonCardItemConfig;
  @property({ attribute: false }) protected _btnIndex!: number;
  @state() public _currentArea!: ButtonArea;
  @state() public _activePreview: PreviewType | null = null;
  @state() public _buttonHighlighted: boolean = false;

  @state() public _subDefaultItemActive!: boolean;

  @state() private _connected: boolean = false;

  protected buttonArea?: ButtonArea;

  constructor(area?: ButtonArea) {
    super(ConfigArea.BUTTONS);
    if (area) {
      this.buttonArea = area;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._connected = true;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;
  }

  set activePreview(preview: PreviewType | null) {
    this._activePreview = preview;
  }
  get activePreview(): PreviewType | null {
    return this._activePreview;
  }

  set currentArea(area: ButtonArea) {
    this._currentArea = area;
  }
  get currentArea(): ButtonArea {
    return this._currentArea;
  }

  protected _renderPreviewBtn(): TemplateResult {
    if (this.currentArea === ButtonArea.BASE) {
      return this._renderHighlightBtn();
    }

    const isActive = this._activePreview !== null;
    const label = isActive ? 'Exit Preview' : 'Preview Card';
    const variant = isActive ? 'warning' : 'brand';
    return html` <ha-button size="small" variant=${variant} appearance="plain"> ${label} </ha-button> `;
  }

  private _renderHighlightBtn(): TemplateResult {
    const label = this._buttonHighlighted ? 'Unhighlight Button' : 'Highlight Button';
    const variant = this._buttonHighlighted ? 'warning' : 'brand';
    return html`
      <ha-button size="small" variant=${variant} appearance="plain" @click=${() => this._toggleHighlightButton()}>
        ${label}
      </ha-button>
    `;
  }

  public _toggleHighlightButton(reload: boolean = false): void {
    const dispatchEvent = (index: number | null) => {
      setTimeout(() => {
        this._dispatchEditorEvent('highlight-button', { buttonIndex: index });
      }, 50);
    };
    if (reload) {
      if (this._buttonHighlighted) {
        dispatchEvent(this._btnIndex);
        return;
      }
    } else {
      this._buttonHighlighted = !this._buttonHighlighted;
      dispatchEvent(this._buttonHighlighted ? this._btnIndex : null);
      return;
    }
  }

  protected _togglePreview(previewType: PreviewType | null): void {
    if (previewType === null) {
      this._dispatchEditorEvent('reset-preview', {});
      if (this._connected) {
        this.updateComplete.then(() => {
          this._dispatchEditorArea(this._editorArea);
          this._toggleHighlightButton(true);
        });
      }
      return;
    }
    const cardKey = previewType === null ? null : previewType;
    const config = this._btnConfig?.sub_card?.[cardKey!];

    const eventDetail: ButtonSubCardPreviewConfig = {
      type: previewType,
      config,
    };
    document.dispatchEvent(EditorSubCardPreviewEvent(eventDetail));
  }

  static get styles(): CSSResultGroup {
    return super.styles;
  }
}
