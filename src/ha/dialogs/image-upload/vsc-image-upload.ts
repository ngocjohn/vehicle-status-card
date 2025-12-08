import { mdiImagePlus } from '@mdi/js';
import { css, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import type { HomeAssistant } from '../../types';
import type { HassDialog } from '../dialog-manager';
import type { ImageUploadDialogData, ImageUploadDialogParams } from './show-image-upload';

import { ImageItem } from '../../../types/config';
import '../../../editor/shared/vsc-editor-form';
import { createCloseHeading } from '../../../utils/editor/create';
import { ExpansionPanel } from '../../../utils/editor/create';
import { showAlertDialog } from '../../../utils/editor/show-dialog-box';
import { getHaPictureUpload, toggleQuickBar } from '../../../utils/helpers-dom';
import { fireEvent } from '../../common/dom/fire_event';
import { computeImageUrl, ImageEntity } from '../../data/image';
import { createImage, generateImageThumbnailUrl, getIdFromUrl } from '../../data/image_upload';
import { showToast } from '../../panels/lovelace/toast';

const IMAGE_ENTITY_SCHEMA = [
  {
    type: 'expandable',
    title: 'Image Entities',
    helper: 'Select image entities to include',
    icon: 'mdi:list-box-outline',
    schema: [
      {
        name: 'entities',
        required: false,
        selector: {
          entity: {
            multiple: true,
            domain: 'image',
          },
        },
      },
    ],
  },
] as const;

const IMAGE_URLS_SCHEMA = [
  {
    name: 'urls',
    label: ' ',
    selector: {
      object: {
        label_field: 'image',
        multiple: true,
        fields: {
          image: {
            label: 'Path or URL',
            selector: { text: {} },
            required: false,
          },
        },
      },
    },
  },
] as const;

@customElement('vsc-image-upload')
export class VscImageUpload extends LitElement implements HassDialog<ImageUploadDialogData> {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: ImageUploadDialogParams;
  @state() private _data: ImageUploadDialogData = {};

  @state() private _imageEntities: string[] = [];
  @state() private _imageUrls: string[] = [];

  @state() private _uploading = false;

  @query('ha-file-upload') _fileUpload!: any;
  public async showDialog(params: ImageUploadDialogParams): Promise<void> {
    this._params = params;
    this._data = params.data || {};
    await toggleQuickBar();
  }

  public closeDialog() {
    this._params = undefined;
    this._data = {};
    this._imageEntities = [];
    this._imageUrls = [];
    this._uploading = false;
    if (this._fileUpload) this._fileUpload.value = undefined;
    fireEvent(this, 'dialog-closed', { dialog: this.localName });
    return true;
  }

  private _submit(): void {
    this._params?.submit?.(this._data);
    this.closeDialog();
  }

  private _cancel(): void {
    this._params?.cancel?.();
    this.closeDialog();
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_imageEntities') || _changedProperties.has('_imageUrls')) {
      const images: ImageItem[] = [];
      if (this._imageEntities && this._imageEntities.length > 0) {
        this._imageEntities.forEach((ent) => {
          images.push({ image_entity: ent });
        });
      }
      if (this._imageUrls && this._imageUrls.length > 0) {
        this._imageUrls.forEach((url) => {
          images.push({ image: url });
        });
      }
      this._data.images = images;
      // console.debug('Dialog data updated:', this._data);
    }
  }
  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._imageEntities = ev.detail.value.entities || [];
    console.debug('Image entities changed:', this._imageEntities);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params || !this.hass) {
      return nothing;
    }

    const emptyData = !this._data.images || this._data.images.length === 0;
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._params.title)}
        @closed=${this._cancel}
      >
        <div class="content" ?no-data=${emptyData}>${this._renderFormContainer()} ${this._renderPreview()}</div>
        <ha-button appearance="plain" variant="warning" @click=${this._cancel} slot="secondaryAction">
          ${this.hass.localize('ui.common.cancel')}
        </ha-button>
        <ha-button .disabled=${emptyData} @click=${this._submit} slot="primaryAction">
          ${this.hass.localize('ui.common.save')}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _renderFormContainer(): TemplateResult {
    const entitiesData = {
      entities: [...this._imageEntities],
    };

    return html`
      <div class="form-container container">
        ${this._renderImageUrlsEditor()}
        <vsc-editor-form
          dialogInitialFocus
          ._hass=${this.hass}
          .data=${entitiesData}
          .schema=${IMAGE_ENTITY_SCHEMA}
          @value-changed=${this._valueChanged}
        ></vsc-editor-form>
      </div>
    `;
  }

  private _renderPreview(): TemplateResult {
    if (!this._data.images || this._data.images.length === 0) {
      return html``;
    }
    const images = this._data.images;
    return html`
      <div class="preview-container container">
        <div class="image-preview">
          ${images.map((image: ImageItem) => {
            const imageUrl = this._getImageUrl(image);
            return html`
              <div class="image-item" @click=${() => this._deleteItem(image)}>
                <ha-icon class="icon-delete" .icon=${'mdi:trash-can-outline'}></ha-icon>
                <img src=${imageUrl || ''} />
              </div>
            `;
          })}
        </div>

        <ha-tip .hass=${this.hass}>Click on an image to remove it.</ha-tip>
      </div>
    `;
  }

  private _renderFileUpload(): TemplateResult {
    const secondary = html`${this.hass!.localize('ui.components.picture-upload.secondary', {
      select_media: html`<button class="link" @click=${this._showMediaBrowser}>
        ${this.hass!.localize('ui.components.picture-upload.select_media')}
      </button>`,
    })}`;
    return html`
      <ha-file-upload
        .hass=${this.hass}
        .icon=${mdiImagePlus}
        .label=${this.hass!.localize('ui.components.picture-upload.label')}
        .secondary=${secondary}
        .supports=${this.hass!.localize('ui.components.picture-upload.supported_formats')}
        .uploading=${this._uploading}
        .multiple=${true}
        @file-picked=${this._handleFilePicked}
        accept="image/png, image/jpeg, image/gif"
      ></ha-file-upload>
    `;
  }

  private _renderImageUrlsEditor(): TemplateResult {
    const urlsData = {
      urls: this._imageUrls.map((url) => ({ image: url })),
    };

    const urlsContent = html`
      <div class="container">
        ${this._renderFileUpload()}
        <vsc-editor-form
          ._hass=${this.hass}
          .data=${urlsData}
          .schema=${IMAGE_URLS_SCHEMA}
          @value-changed=${this._urlsChanged}
        ></vsc-editor-form>
      </div>
    `;

    const options = {
      header: 'Image URLs',
      icon: 'mdi:link-variant',
      secondary: 'Add image URLs or upload images (multiple supported)',
      expanded: true,
    };
    return ExpansionPanel({ content: urlsContent, options });
  }

  private _getImageUrl(image: ImageItem): string | undefined {
    let imageUrl: string | undefined;
    if (image.image_entity && this.hass) {
      const entity = this.hass.states[image.image_entity];
      if (entity) {
        imageUrl = computeImageUrl(entity as ImageEntity);
      }
    } else if (image.image) {
      if (typeof image.image === 'object' && image.image.media_content_id) {
        const mediaId = getIdFromUrl(image.image.media_content_id);
        imageUrl = generateImageThumbnailUrl(mediaId!, undefined, true);
      } else {
        imageUrl = image.image as string;
      }
    }
    return imageUrl;
  }

  private _urlsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const urlsArray = ev.detail.value.urls || [];
    this._imageUrls = urlsArray.map((item: any) => item.image);
  }

  private _showMediaBrowser = async () => {
    console.debug('Show media browser');
    const pictureUpload = await getHaPictureUpload();
    pictureUpload.hass = this.hass!;
    // pictureUpload.style.display = 'none';
    this.appendChild(pictureUpload);
    pictureUpload._chooseMedia();
    // add event listener to handle file picked event.
    pictureUpload.addEventListener('change', this._handleMediaPicked as EventListener, { once: true });
  };

  private _handleMediaPicked = (ev: Event) => {
    ev.stopPropagation();
    const target = (ev.target || ev.currentTarget) as any;
    const value = target.value;
    if (!value) return;
    const updatedUrls = this._imageUrls.concat(value);
    this._imageUrls = updatedUrls;
    console.debug('Media picked:', value);
  };

  private async _handleFilePicked(ev: CustomEvent) {
    ev.stopPropagation();
    const files = ev.detail.files as FileList;
    if (!files || files.length === 0) return;
    this._uploading = true;
    // check if some files is not supported type
    const unsupportedFiles: string[] = [];
    const uploadedImages: string[] = [];
    try {
      for (const file of files) {
        if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
          unsupportedFiles.push(file.name);
          continue;
        }
        const image = await createImage(this.hass!, file);
        const url = generateImageThumbnailUrl(image.id, 512, true);
        uploadedImages.push(url);
      }
      if (unsupportedFiles.length > 0) {
        const description = html` <p>The following files have unsupported formats and were not uploaded:</p>
          <ul>
            ${unsupportedFiles.map((file) => html`<li>${file}</li>`)}
          </ul>`;

        const errorMsg = html`<ha-alert alert-type="error">${description}</ha-alert>`;

        showAlertDialog(this, errorMsg);
        console.warn('Unsupported files:', unsupportedFiles);
      }
      this._imageUrls = this._imageUrls.concat(uploadedImages);
      this._showToast(`${uploadedImages.length} image(s) uploaded successfully.`);
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      this._uploading = false;
      if (this._fileUpload) this._fileUpload.value = undefined;
    }
    console.debug('file upload complete');
  }

  private _deleteItem(image: ImageItem) {
    if (!this._data.images) return;
    // check type of image (image_entity or image) to remove correctly from respective array
    if (image.image_entity) {
      this._imageEntities = this._imageEntities.filter((ent) => ent !== image.image_entity);
      this._showToast(`Image entity ${image.image_entity} removed.`);
      console.debug('Image entity removed:', image.image_entity);
    } else if (image.image) {
      this._imageUrls = this._imageUrls.filter((url) => url !== image.image);
      this._showToast(`Image URL ${image.image} removed.`);
      console.debug('Image URL removed:', image.image);
    }
    // data will be updated in willUpdate
  }

  private _showToast(message: string) {
    showToast(this, {
      id: this.localName,
      message,
      duration: 3000,
    });
  }
  static styles = css`
    /* mwc-dialog (ha-dialog) styles */
    ha-dialog {
      --mdc-dialog-max-width: 90vw;
      --justify-action-buttons: space-between;
      --dialog-content-padding: 24px 12px;
    }
    .content {
      display: flex;
      flex-direction: column;
    }

    @media (min-width: 1000px) {
      ha-dialog {
        --mdc-dialog-min-width: 400px;
      }
      .content {
        width: calc(90vw - 48px);
        max-width: 1000px;
      }
      .content {
        flex-direction: row;
      }
      .content[no-data] {
        max-width: unset;
        width: auto;
      }
      .content > * {
        flex-basis: 0;
        flex-grow: 1;
        flex-shrink: 1;
        min-width: 0;
      }
      .form-container {
        margin: 0 10px;
      }
    }

    .preview-container {
      position: relative;
      height: max-content;
      position: sticky;
      top: 0;
      margin: 0 auto;
    }

    .link {
      all: unset;
      color: var(--primary-color);
    }

    /* make dialog fullscreen on small screens */
    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-max-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
      }
    }
    .error {
      color: var(--error-color);
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
      box-sizing: border-box;
    }
    ha-file-upload {
      max-height: 100px;
    }

    .image-preview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      /* padding: 4px; */
    }
    .image-item {
      display: inline-flex;
      width: 100%;
      max-height: 100px;
      border-radius: 8px;
      border: 1px solid var(--disabled-color);
      transition: border 0.3s ease;
      box-sizing: border-box;
      position: relative;
      --mdc-icon-size: calc(50px - 1px);
    }

    .image-item img {
      object-fit: cover;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .image-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      inset: 0;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.8);
    }
    .icon-delete {
      position: absolute;
      height: inherit;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--secondary-text-color);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      display: flex !important;
    }
    .image-item:hover {
      cursor: pointer;
    }
    .image-item:hover .icon-delete,
    .image-item:hover::before {
      opacity: 1;
      /* pointer-events: auto; */
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-image-upload': VscImageUpload;
  }
}
