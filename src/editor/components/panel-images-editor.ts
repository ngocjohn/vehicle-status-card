import { mdiCodeBracesBox, mdiDelete, mdiEye, mdiGrid, mdiImagePlus, mdiListBoxOutline, mdiPlus } from '@mdi/js';
import { EntityConfig } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';
import { HassEntity } from 'home-assistant-js-websocket';
import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues, nothing } from 'lit';

import './sub-panel-yaml';

import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, ImageConfig, HomeAssistant, fireEvent } from '../../types';
import { EntitiesEditorEvent } from '../../types/ha-frontend/data/image';
import { processEditorEntities, showConfirmDialog } from '../../utils';
import { VicTab } from '../../utils/create';
import { uploadImage } from '../../utils/ha-helper';
import { VehicleStatusCardEditor } from '../editor';
import { IMAGE_CONFIG_ACTIONS, IMAGE_ACTIONS } from '../editor-const';
import { IMAGES_SLIDE_SCHEMA } from '../form';

const ADD_IMAGE_TYPE = [
  { value: 'file', label: 'Upload files' },
  { value: 'path', label: 'Local path or web URL' },
];

enum ADD_TYPE {
  FILE = 'file',
  PATH = 'path',
}
@customElement('panel-images-editor')
export class PanelImagesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) editor?: VehicleStatusCardEditor;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;

  @state() _yamlEditorActive = false;
  @state() _dropAreaActive = false;
  @state() _newImage: string = '';
  @state() private _selectedItems: Set<string> = new Set();
  @state() private _activeTabIndex: number = 0;
  @state() private _images: ImageConfig[] = [];
  @state() private _imageEntities?: EntityConfig[];
  @state() private _uploading = false;
  @state() private _uploadedImages?: ImageConfig[] = [];
  @state() private _imageAddType: ADD_TYPE = ADD_TYPE.FILE;
  @state() private _listView: boolean = false;

  @query('ha-file-upload') private _fileUpload?: any;
  private _debouncedConfigChanged = debounce(this.configChanged.bind(this), 300);

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._debouncedConfigChanged.cancel();
  }

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        *[active] {
          color: var(--primary-color);
        }
        *[hidden],
        .hidden {
          display: none;
        }

        .drop-area {
          margin-block: var(--vic-card-padding);
          display: flex;
          flex-direction: column;
          gap: var(--vic-card-padding);
          overflow: hidden;
        }

        .image-preview {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
          padding: 4px;
        }

        .image-item {
          position: relative;
          width: 100%;
          height: 100px;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--divider-color);
          transition: border 0.3s ease;
        }

        .image-item:hover {
          border: 1px solid var(--primary-color);
        }
        .image-item:hover > img {
          filter: blur(0.5rem) brightness(0.5);
          transition: all 0.3s ease;
        }

        .image-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          opacity: 0.7;
        }
        .image-item ha-svg-icon.delete-icon {
          position: absolute;
          top: 4px;
          left: 4px;
          color: var(--disabled-text-color);
          cursor: pointer;
          width: 24px;
          height: 24px;
          z-index: 2;
        }

        .image-item ha-svg-icon.delete-icon:hover {
          color: var(--error-color) !important;
        }

        .image-item ha-svg-icon.preview-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          color: var(--primary-color);
          cursor: pointer;
          z-index: 1;
          transform: translate(-50%, -50%);
        }
        .image-item:hover ha-svg-icon.preview-icon {
          opacity: 1;
          transition: opacity 0.3s ease;
        }

        .image-item > ha-checkbox {
          position: absolute;
          top: -8px;
          right: -8px;
          z-index: 4;
        }

        .new-image-url {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          justify-content: space-between;
        }

        .new-url-btn {
          color: var(--secondary-text-color);
        }

        .new-url-btn:hover {
          color: var(--primary-color);
        }
      `,
    ];
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('config') && this.config) {
      this._images = this.config.images || [];
      this._imageEntities = this.config.image_entities ? processEditorEntities(this.config.image_entities) : [];
    }
    if (_changedProperties.has('_uploadedImages') && this._uploadedImages) {
      // If new images are uploaded, merge them with existing images
      const imagesList = this.config?.images?.concat(this._uploadedImages) || this._uploadedImages;
      this.config = { ...this.config, images: imagesList };
      fireEvent(this, 'config-changed', { config: this.config });
      this._uploadedImages = [];
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_activeTabIndex')) {
      const oldIndex = _changedProperties.get('_activeTabIndex') as number | undefined;
      const newIndex = this._activeTabIndex;
      if (oldIndex !== undefined && newIndex !== 0) {
        this._yamlEditorActive = false;
        this._dropAreaActive = false;
      }
    }
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html`<div class="card-config">Loading...</div>`;
    }
    const imagesList = this._renderImageList();
    const layoutConfig = this._renderImageLayoutConfig();
    const imageEntity = this._renderImageEntity();

    const tabsconfig = [
      { key: 'image_list', label: 'Images', content: imagesList },
      { key: 'image_entity', label: 'Image Entities', content: imageEntity },
      { key: 'layout_config', label: 'Slide config', content: layoutConfig },
    ];

    return html`
      <div class="card-config">
        ${VicTab({
          tabs: tabsconfig,
          activeTabIndex: this._activeTabIndex || 0,
          onTabChange: (index: number) => (this._activeTabIndex = index),
        })}
      </div>
    `;
  }

  private _renderImageEntity(): TemplateResult {
    return html`
      <hui-entity-editor
        .hass=${this.hass}
        .label=${'Image Entities'}
        .entities=${this._imageEntities}
        .entityFilter=${(entity: HassEntity) => {
          return entity.entity_id.startsWith('image.');
        }}
        @entities-changed=${this._entitiesValueChanged}
      ></hui-entity-editor>
    `;
  }

  private _entitiesValueChanged(ev: EntitiesEditorEvent): void {
    if (ev.detail && ev.detail.entities) {
      console.log(ev.detail);
      this.config = {
        ...this.config!,
        image_entities: ev.detail.entities,
      };

      this._imageEntities = processEditorEntities(this.config.image_entities || []);

      fireEvent(this, 'config-changed', { config: this.config });
    }
  }

  private _renderImageList(): TemplateResult {
    const dropArea = this._renderDropArea();
    const yamlEditor = this._renderYamlEditor();
    const actionMap = [
      { title: 'Show Image', icon: 'mdi:eye', action: IMAGE_ACTIONS.SHOW_IMAGE },
      { title: 'Delete Image', icon: 'mdi:delete', action: IMAGE_ACTIONS.DELETE },
    ];

    const images = this._images || [];
    const imageList = !images.length
      ? nothing
      : html` <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
          <div class="images-list" id="images-list">
            ${repeat(
              images,
              (image: ImageConfig) => image.url,
              (image: ImageConfig, idx: number) => {
                return html`
                  <div class="item-config-row" data-url="${image.url}">
                    <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                    <div class="item-content">
                      <ha-textfield
                        .label=${`Image #${idx + 1}`}
                        .value=${image.title}
                        .configType=${'images'}
                        .configIndex=${idx}
                        .configValue=${'url'}
                        @input=${(ev: any) => this._imageInputChanged(ev, idx)}
                      ></ha-textfield>
                    </div>
                    <div class="item-actions">
                      <ha-button-menu
                        .corner=${'BOTTOM_START'}
                        .fixed=${true}
                        .menuCorner=${'START'}
                        .activatable=${true}
                        .naturalMenuWidth=${true}
                        @closed=${(ev: Event) => ev.stopPropagation()}
                      >
                        <ha-icon-button class="action-icon" slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
                        ${actionMap.map(
                          (action) => html`
                            <mwc-list-item @click=${this.toggleAction(action.action, idx)} .graphic=${'icon'}>
                              <ha-icon slot="graphic" .icon=${action.icon}></ha-icon>
                              ${action.title}
                            </mwc-list-item>
                          `
                        )}
                      </ha-button-menu>
                      <ha-checkbox
                        .checked=${false}
                        @change=${(ev: Event) => this._toggleSelection(ev, image.url)}
                      ></ha-checkbox>
                    </div>
                  </div>
                `;
              }
            )}
          </div></ha-sortable
        >`;

    const actionHeader = html`<div class="action-footer">
      <ha-button
        class="warning-btn"
        .outlined=${true}
        @click=${() => (this._dropAreaActive = true)}
        .label=${'Add Image'}
      ></ha-button>
      <div class="item-actions">
        <ha-icon-button ?active=${!this._listView} .path=${mdiGrid} @click=${() => (this._listView = false)}>
        </ha-icon-button>
        <ha-icon-button ?active=${this._listView} .path=${mdiListBoxOutline} @click=${() => (this._listView = true)}>
        </ha-icon-button>

        <ha-icon-button .path=${mdiCodeBracesBox} @click=${() => (this._yamlEditorActive = true)}></ha-icon-button>
      </div>
    </div> `;
    const actionFooter = html` <div
      class="action-footer"
      ?hidden=${!this._images.length}
      style="flex-direction: row-reverse;"
    >
      <ha-button
        @click=${this.toggleAction('select-all')}
        .label=${'Select All'}
        .disabled=${this._selectedItems.size === images.length}
      ></ha-button>
      <ha-button
        @click=${this.toggleAction('delete-selected')}
        .label=${'Delete Selected'}
        ?hidden=${!this._selectedItems.size}
        class="delete-btn"
      ></ha-button>
      <ha-button
        @click=${this.toggleAction('deselect-all')}
        .disabled=${!this._selectedItems.size}
        .label=${'Deselect All'}
        ?hidden=${!this._selectedItems.size}
      ></ha-button>
    </div>`;

    return html` ${this._yamlEditorActive
      ? yamlEditor
      : this._dropAreaActive
      ? dropArea
      : html`<div class="base-config" style="gap: var(--vic-gutter-gap);">
          ${actionHeader} ${this._listView ? imageList : this._renderPreview()} ${actionFooter}
        </div>`}`;
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newImages = this._images.concat();
    newImages.splice(newIndex, 0, newImages.splice(oldIndex, 1)[0]);
    this.config = { ...this.config, images: newImages };
    this._debouncedConfigChanged();
  }

  private _renderYamlEditor(): TemplateResult {
    if (!this._yamlEditorActive) return html``;
    return html`
      <div id="yaml-editor">
        <vsc-sub-panel-yaml
          .hass=${this.hass}
          .config=${this.config}
          .configDefault=${this.config.images}
          .extraAction=${true}
          @close-editor=${() => {
            this._yamlEditorActive = false;
          }}
          @yaml-config-changed=${this._yamlChanged}
        ></vsc-sub-panel-yaml>
      </div>
    `;
  }

  private _yamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid || !this.config) return;
    this.config = { ...this.config, images: value };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _renderDropArea(): TemplateResult {
    if (!this._dropAreaActive) return html``;
    const previewCon = this._renderPreview();
    const fileAddCon = this._renderFileAddCon();
    return html`
      <div class="drop-area">
        ${fileAddCon} ${previewCon}

        <ha-alert id="image-alert" class="hidden" alert-type="success">New image added successfully!</ha-alert>
      </div>
      <div class="action-footer">
        <ha-button id="upload-btn" @click=${() => (this._dropAreaActive = false)}>Cancel</ha-button>
      </div>
    `;
  }

  private _renderFileAddCon(): TemplateResult {
    const fileUpload = html` <ha-file-upload
      .hass=${this.hass}
      .icon=${mdiImagePlus}
      .value=${''}
      .secondary=${'Drag & drop files here or click to select files'}
      .supports=${'Supports JPEG, PNG, or GIF image.'}
      .uploading=${this._uploading}
      @file-picked=${this._handleFilePicked}
      accept="image/png, image/jpeg, image/gif"
      .multiple=${true}
      style="height: auto;"
    ></ha-file-upload>`;

    const pathInput = html` <div class="new-image-url">
      <ha-textfield
        style="width: 100%;"
        .label=${'Image URL'}
        .value=${this._newImage}
        @input=${this._handleNewImagePath}
      ></ha-textfield>
      <ha-icon-button
        class="new-url-btn"
        .path=${mdiPlus}
        @click=${this.toggleAction('add-new-url')}
        title="Add new image URL"
        .disabled=${!this._newImage || this._newImage.length === 0}
      ></ha-icon-button>
    </div>`;

    return html`
      <ha-selector .hass=${this.hass} .selector=${{ image: {} }} style="display: none;"></ha-selector>
      <ha-selector
        .hass=${this.hass}
        .value=${this._imageAddType}
        .label=${'Select method to add image'}
        .selector=${{
          select: { mode: 'list', options: ADD_IMAGE_TYPE },
        }}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._imageAddType = ev.detail.value;
        }}
      ></ha-selector>
      ${this._imageAddType === ADD_TYPE.FILE ? fileUpload : pathInput}
    `;
  }

  private _renderPreview(): TemplateResult {
    if (!this._images || this._images.length === 0) {
      return html``;
    }
    const helpText = 'Drag and drop to reorder images, click on the image to show on card.';
    return html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <span>Current items</span>
          <ha-tooltip content=${helpText}>
            <ha-icon .icon=${'mdi:help-circle'}></ha-icon>
          </ha-tooltip>
        </div>
        <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved} .noStyle=${true}>
          <div class="image-preview">
            ${repeat(
              this._images,
              (image: ImageConfig) => image.url,
              (image: ImageConfig, index: number) => html`
                <div class="image-item handle" data-url="${image.url}">
                  <ha-checkbox
                    .checked=${false}
                    @change=${(ev: Event) => this._toggleSelection(ev, image.url)}
                  ></ha-checkbox>
                  <ha-svg-icon
                    .path=${mdiDelete}
                    class="delete-icon"
                    @click=${() => this._deletePreviewImage(index)}
                    title="Delete Image"
                  ></ha-svg-icon>
                  <ha-svg-icon
                    .path=${mdiEye}
                    class="preview-icon"
                    @click=${this.toggleAction('show-image', index)}
                    title="Show Image"
                  ></ha-svg-icon>
                  <img src="${image.url}" alt="${image.title}" />
                </div>
              `
            )}
          </div>
        </ha-sortable>
      </div>
    `;
  }

  private _deletePreviewImage(index: number): void {
    if (!this._images) return;
    const imagesList = [...this._images];
    const imageToDelete = imagesList[index];
    console.log('Deleting image:', imageToDelete);
    imagesList.splice(index, 1);
    this.config = { ...this.config, images: imagesList };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _renderImageLayoutConfig(): TemplateResult {
    const imagesSwipeConfig = this.config?.layout_config?.images_swipe || {};
    const DATA = { ...imagesSwipeConfig };

    return html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div>Slide configuration</div>
        </div>
        <div class="sub-panel">
          <ha-form
            .hass=${this.hass}
            .data=${DATA}
            .schema=${IMAGES_SLIDE_SCHEMA}
            .computeLabel=${(schema: any) => schema.label || schema.name || ''}
            @value-changed=${this._hanleSwipeConfigChanged}
          ></ha-form>
        </div>
      </div>
    `;
  }

  private _hanleSwipeConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const swipeConfig = ev.detail.value;
    const layoutConfig = { ...(this.config.layout_config || {}) };
    let imagesSwipe = { ...(layoutConfig.images_swipe || {}) };
    imagesSwipe = swipeConfig;
    layoutConfig.images_swipe = imagesSwipe;
    this.config = { ...this.config, layout_config: layoutConfig };
    this._debouncedConfigChanged();
  }

  private _imageInputChanged(ev: any, idx: number): void {
    ev.stopPropagation();
    const input = ev.target as HTMLInputElement;
    const url = input.value;

    if (!url || !this.config?.images) return;

    if (idx !== undefined) {
      const imagesList = [...this.config.images];
      imagesList[idx] = { url, title: url };
      this.config = { ...this.config, images: imagesList };
      this._debouncedConfigChanged();
    }
  }

  private _handleNewImagePath(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLInputElement;
    this._newImage = target.value;
  }

  private _toggleSelection(event: Event, url: string): void {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this._selectedItems.add(url);
      this.requestUpdate();
    } else {
      this._selectedItems.delete(url);
      this.requestUpdate();
    }
  }
  private toggleAction(action: IMAGE_CONFIG_ACTIONS, idx?: number): () => void {
    return () => {
      const updateChanged = (update: any) => {
        this.config = {
          ...this.config,
          images: update,
        };

        this._debouncedConfigChanged();
      };

      const showAlert = () => {
        const imageAlert = this.shadowRoot?.getElementById('image-alert') as HTMLElement;
        if (imageAlert) {
          imageAlert.classList.remove('hidden');
          setTimeout(() => {
            imageAlert.classList.add('hidden');
          }, 1500);
        }
      };

      const handleImageAction = async () => {
        switch (action) {
          case 'delete':
            if (idx !== undefined) {
              const imagesList = [...(this.config?.images || [])];
              imagesList.splice(idx, 1);
              updateChanged(imagesList);
            }
            break;

          case 'add-new-url':
            if (!this._newImage) return;
            this._newImage = this._newImage.trim();
            const imagesList = [...(this.config?.images || [])];
            imagesList.push({ url: this._newImage, title: this._newImage });
            showAlert();
            updateChanged(imagesList);
            this._newImage = '';

            break;
          case 'show-image':
            this.editor?._dispatchEvent('show-image', { index: idx });
            break;
          case 'deselect-all':
            this._selectedItems.clear();
            const checkboxes = this.shadowRoot?.querySelectorAll('ha-checkbox') as NodeListOf<HTMLInputElement>;
            checkboxes?.forEach((checkbox) => {
              checkbox.checked = false;
            });
            this.requestUpdate();
            break;
          case 'select-all':
            const allCheckboxes = this.shadowRoot?.querySelectorAll('ha-checkbox') as NodeListOf<HTMLInputElement>;
            allCheckboxes?.forEach((checkbox) => {
              checkbox.checked = true;
            });
            this._selectedItems.clear();
            this._images.forEach((image) => {
              this._selectedItems.add(image.url);
            });
            this.requestUpdate();
            break;
          case 'delete-selected':
            if (this._selectedItems.size === 0) return;
            let confirmDelete = await showConfirmDialog(
              this,
              'Are you sure you want to delete the selected images?',
              'Delete'
            );
            if (!confirmDelete) return;
            const updatedImages = this._images.filter((image) => !this._selectedItems.has(image.url));
            updateChanged(updatedImages);
            this._selectedItems.clear();
            break;
        }
      };
      handleImageAction();
    };
  }

  private _handleTabChange(index: number): void {
    this._activeTabIndex = index;
    this.requestUpdate();
  }

  private configChanged(): void {
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private async _handleFilePicked(ev: CustomEvent) {
    console.log('File picked:', ev);
    const files = ev.detail.files;

    let imagesList: ImageConfig[] = [];
    this._uploading = true;
    for (const file of files) {
      try {
        const image = await uploadImage(this.hass, file);
        console.log('Image :', image);
        if (!image) continue;

        imagesList.push({ url: image.url, title: image.name });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    this._uploading = false;
    (ev.target as any).value = null; // Clear the input value after processing
    this._fileUpload!.value = null; // Clear the file upload component value

    if (imagesList.length > 0) {
      console.log('New images:', imagesList);
      this._uploadedImages = imagesList;
      // const configImages = this.config?.images?.concat(imagesList) || imagesList;
      // this.config = { ...this.config, images: configImages };
      // this.configChanged();

      // fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
    }
  }
}
