import { LitElement, html, nothing, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant, type ImageEntity, computeImageUrl } from '../../ha';
import { isMediaSourceContentId, resolveMediaSource } from '../../ha/data/media_source';
import { hasItemAction, ImageItem } from '../../types/config';
import { addActions } from '../../utils';

@customElement('vsc-image-item')
export class VscImageItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _imageConfig!: ImageItem;
  @state() private _resolvedImage?: string;

  protected willUpdate(_changedProperties: PropertyValues) {
    super.willUpdate(_changedProperties);
    if (!this._imageConfig || !this.hass) {
      return;
    }

    const firstHass = _changedProperties.has('hass') && _changedProperties.get('hass') === undefined;
    const imageChanged =
      _changedProperties.has('_imageConfig') &&
      _changedProperties.get('_imageConfig')?.image !== this._imageConfig.image;
    const image =
      (typeof this._imageConfig?.image === 'object' && this._imageConfig.image.media_content_id) ||
      (this._imageConfig.image as string | undefined);

    if ((firstHass || imageChanged) && typeof image === 'string' && isMediaSourceContentId(image)) {
      // Resolve media source URL
      this._resolvedImage = undefined;
      resolveMediaSource(this.hass, image).then((resp) => {
        this._resolvedImage = resp.url;
      });
    } else if (imageChanged) {
      this._resolvedImage = image;
    }
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (!this._imageConfig || _changedProperties.has('_resolvedImage')) {
      return true;
    }
    if (this._imageConfig.image_entity && _changedProperties.has('hass')) {
      const oldHass = _changedProperties.get('hass') as HomeAssistant | undefined;
      if (
        !oldHass ||
        oldHass.states[this._imageConfig.image_entity] !== this.hass.states[this._imageConfig.image_entity]
      ) {
        return true;
      }
    }
    return true;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._addActionHandlers();
  }

  // add action handlers
  private _addActionHandlers(): void {
    if (!this._imageConfig.action || !hasItemAction(this._imageConfig.action)) {
      return;
    }
    const imageElement = this.shadowRoot?.getElementById('image');
    if (!imageElement) {
      return;
    }
    console.log('Adding actions to image item', this._imageConfig.action);
    addActions(imageElement, this._imageConfig.action);
  }

  protected render() {
    if (!this._imageConfig || !this.hass) {
      return nothing;
    }

    let stateObj: ImageEntity | undefined;

    if (this._imageConfig.image_entity) {
      stateObj = this.hass.states[this._imageConfig.image_entity] as ImageEntity;
      if (!stateObj) {
        return html`<div class="error">
          ${this.hass.localize('ui.card.common.entity_not_found')}: ${this._imageConfig.image_entity}
        </div>`;
      }
    }

    let image: string | undefined = this._resolvedImage;
    if (this._imageConfig.image_entity) {
      image = computeImageUrl(stateObj as ImageEntity);
    }

    if (image === undefined) {
      return nothing;
    }

    return html` <img id="image" src="${this.hass.hassUrl(image)}" /> `;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-image-item': VscImageItem;
  }
}
