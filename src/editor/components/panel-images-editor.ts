import { EntityConfig } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';
import { HassEntity } from 'home-assistant-js-websocket';
import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './sub-panel-yaml';

import { repeat } from 'lit/directives/repeat.js';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, ImageConfig, HomeAssistant, fireEvent } from '../../types';
import { EntitiesEditorEvent } from '../../types/ha-frontend/data/image';
import { processEditorEntities } from '../../utils';
import { VicTab } from '../../utils/create';
import { uploadImage } from '../../utils/ha-helper';
import { IMAGE_CONFIG_ACTIONS, IMAGE_ACTIONS } from '../editor-const';
import { IMAGES_SLIDE_SCHEMA } from '../form';

@customElement('panel-images-editor')
export class PanelImagesEditor extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) public editor?: any;
  @property({ type: Object }) public config!: VehicleStatusCardConfig;
  @property({ type: Array }) _images: ImageConfig[] = [];
  @property({ type: Boolean }) isDragging = false;

  @state() _yamlEditorActive = false;
  @state() _dropAreaActive = false;
  @state() _newImage: string = '';
  @state() private _selectedItems: Set<string> = new Set();
  @state() private _activeTabIndex: number = 0;
  @state() private _imageEntities?: EntityConfig[];
  private _helpDismissed = false;
  private _debouncedConfigChanged = debounce(this.configChanged.bind(this), 300);

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
  }

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        *[hidden],
        .hidden {
          display: none;
        }
        #drop-area {
          margin-block: var(--vic-card-padding);
          border-block: 1px solid var(--divider-color);
        }

        .drop-area {
          border: 2px dashed var(--divider-color);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-block: var(--vic-card-padding);
        }

        .drop-area[dragging] {
          background-color: rgba(var(--rgb-primary-text-color), 0.05);
        }

        input[type='file'] {
          display: none;
        }

        .new-image-url {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          justify-content: space-between;
        }

        .new-url-btn {
          display: none;
        }

        .new-url-btn.show {
          display: inline-block;
          color: var(--secondary-text-color);
          cursor: pointer;
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
  }

  protected render(): TemplateResult {
    if (!this.config || !this._hass) {
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
        .hass=${this._hass}
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
    // const infoText = !this._helpDismissed
    //   ? html` <ha-alert
    //       alert-type="info"
    //       dismissable
    //       @alert-dismissed-clicked=${(ev: CustomEvent) => this._handlerAlert(ev)}
    //     >
    //       To change order of images, use ${html`<ha-icon icon="mdi:drag"></ha-icon>`} drag and drop the image row. To
    //       delete an image, click on the delete button and select the image to delete.
    //     </ha-alert>`
    //   : html``;

    const dropArea = this._renderDropArea();
    const yamlEditor = this._renderYamlEditor();
    const actionMap = [
      { title: 'Show Image', icon: 'mdi:eye', action: IMAGE_ACTIONS.SHOW_IMAGE },
      { title: 'Delete Image', icon: 'mdi:delete', action: IMAGE_ACTIONS.DELETE },
    ];

    const images = this._images || [];
    const imageList = !images.length
      ? html`<div></div>`
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
      <ha-button id="upload-btn" @click=${() => (this._dropAreaActive = true)}>Add Image</ha-button>
      <ha-button id="yaml-btn" @click=${() => (this._yamlEditorActive = true)} class=${!images.length ? 'hidden' : ''}
        >Edit YAML</ha-button
      >
    </div> `;
    const actionFooter = html` <div class="action-footer" ?hidden=${!this._images.length}>
      <ha-button
        @click=${this.toggleAction('select-all')}
        .label=${'Select All'}
        .disabled=${this._selectedItems.size === images.length}
      ></ha-button>
      <ha-button
        @click=${this.toggleAction('deselect-all')}
        .disabled=${!this._selectedItems.size}
        .label=${'Deselect All'}
        ?hidden=${!this._selectedItems.size}
      ></ha-button>

      <ha-button
        @click=${this.toggleAction('delete-selected')}
        .disabled=${!this._selectedItems.size}
        .label=${'Delete Selected'}
        ?hidden=${!this._selectedItems.size}
        style="color: var(--error-color);"
      ></ha-button>
    </div>`;

    return html` ${this._yamlEditorActive
      ? yamlEditor
      : this._dropAreaActive
      ? dropArea
      : html`${actionHeader} ${imageList} ${actionFooter}`}`;
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
          .hass=${this._hass}
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
    return html`
      <div id="drop-area">
        <div
          class="drop-area" ?dragging=${this.isDragging}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}
          @click=${() => this.shadowRoot?.getElementById('file-to-upload')?.click()}
        >
          <span>Drag & drop files here or click to select files</span>
          <p>Supports JPEG, PNG, or GIF image.</p>
            <input type="file" id="file-to-upload" multiple @change=${(ev: any) => this.handleFilePicked(ev)} />
          </p>
        </div>

        <div class="new-image-url">
          <ha-textfield
            style="width: 100%;"
            .label=${'Image URL'}
            .value=${this._newImage}
            @input=${this.toggleAddButton}
            ></ha-textfield>
          <div class="new-url-btn">
            <ha-icon icon="mdi:plus" @click=${this.toggleAction('add-new-url')}></ha-icon>
          </div>
        </div>
        <ha-alert id="image-alert" class="hidden" alert-type="success">New image added successfully!</ha-alert>
      </div>
      <div class="action-footer">
        <ha-button id="upload-btn" @click=${() => (this._dropAreaActive = false)}>Cancel</ha-button>
      </div>
    `;
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
            .hass=${this._hass}
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

  private toggleAddButton(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLInputElement;
    const addButton = target.parentElement?.querySelector('.new-url-btn') as HTMLElement;
    if (!addButton) return;
    if (target.value && target.value.length > 0) {
      this._newImage = target.value;
      addButton.classList.add('show');
    } else {
      addButton.classList.remove('show');
    }
  }

  private _handleDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  private _handleDragLeave() {
    this.isDragging = false;
  }
  private _handleDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFilePicked({ target: { files } });
      console.log(event);
    }
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
            this._dropAreaActive = false;
          }, 1500);
        }
      };

      const handleImageAction = () => {
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
            const checkboxes = this.shadowRoot?.querySelectorAll(
              '.images-list ha-checkbox'
            ) as NodeListOf<HTMLInputElement>;
            checkboxes?.forEach((checkbox) => {
              checkbox.checked = false;
            });
            this.requestUpdate();
            break;
          case 'select-all':
            const allCheckboxes = this.shadowRoot?.querySelectorAll(
              '.images-list ha-checkbox'
            ) as NodeListOf<HTMLInputElement>;
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

  private _handlerAlert(ev: CustomEvent): void {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
    this._helpDismissed = true;
  }

  private configChanged(): void {
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private async handleFilePicked(ev: any): Promise<void> {
    const input = ev.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      console.log('No files selected.');
      return;
    }

    const files = Array.from(input.files); // Convert FileList to Array for easier iteration
    console.log('Files:', files);
    let imagesList = [...(this.config?.images || [])];
    for (const file of files) {
      try {
        const imageUrl = await uploadImage(this.editor._hass, file);
        console.log('Image URL:', imageUrl);
        if (!imageUrl) continue;

        const imageName = file.name.toUpperCase();

        imagesList.push({ url: imageUrl, title: imageName });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    if (imagesList.length > 0) {
      const imageAlert = this.shadowRoot?.getElementById('image-alert') as HTMLElement;
      if (imageAlert) {
        imageAlert.classList.remove('hidden');
        setTimeout(() => {
          imageAlert.classList.add('hidden');
          this._dropAreaActive = false;
        }, 1500);
      } else {
        this._dropAreaActive = false;
      }

      fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
    }
  }
}
