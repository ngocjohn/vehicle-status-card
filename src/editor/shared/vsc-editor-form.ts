import { capitalize } from 'es-toolkit';
import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { HaFormElement } from '../../ha/panels/ha-form/types';
import { selectTree } from '../../utils/helpers-dom';
import { BaseEditor } from '../base-editor';
import { ELEMENT, SELECTOR } from '../editor-const';

const HA_FORM_STYLE = css`
  .root > :not([own-margin]):not(:last-child) {
    margin-bottom: 8px !important;
    margin-block-end: 8px !important;
  }
  .root ha-form-grid,
  .root ha-expansion-panel .root ha-form-grid {
    gap: 1em !important;
  }
  :host(.sectionOrder) .root ha-selector ha-selector-select {
    display: flex;
    flex-direction: column-reverse;
  }
`.toString();

const CHIP_CONTAINER_STYLE = css`
  :host {
    display: flex;
    width: 100%;
    box-sizing: border-box;
    --md-input-chip-container-height: 36px;
    --md-input-chip-icon-size: 20px;
    --md-input-chip-label-text-size: 1em;
  }
  .container {
    display: flex;
    justify-content: space-between;
    padding-inline: 8px;
    /* font-size: 1em; */
  }
  .container > button.primary {
    flex: 1 1 auto;
  }
`.toString();

@customElement('vsc-editor-form')
export class VscEditorForm extends BaseEditor {
  @property({ attribute: false }) data!: unknown;
  @property({ attribute: false }) schema!: unknown;
  @property() changed!: (ev: CustomEvent) => void;

  @query('#haForm') _haForm!: HaFormElement;

  protected async firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    await this.updateComplete;
    if (this._haForm.shadowRoot) {
      this._stylesManager.addStyle([HA_FORM_STYLE], this._haForm.shadowRoot);
      this._changeChips();
    }
    this._addEventListeners();
  }

  protected render(): TemplateResult {
    return html`<ha-form
      id="haForm"
      .hass=${this._hass}
      .data=${this.data}
      .schema=${this.schema}
      .computeLabel=${this.computeLabel}
      .computeHelper=${this.computeHelper}
      @value-changed=${this.changed}
    ></ha-form>`;
  }

  private computeLabel = (schema: any): string | undefined => {
    if (schema.name === 'entity' && !schema.context?.group_entity) {
      return undefined;
    }
    const label = schema.label || schema.name || schema.title || '';
    return capitalize(label.replace(/_/g, ' '));
  };

  private computeHelper = (schema: any): string | TemplateResult | undefined => {
    return schema.helper || undefined;
  };

  private _addEventListeners = async () => {
    const expandables = (await selectTree(
      this._haForm.shadowRoot,
      ELEMENT.FORM_EXPANDABLE,
      true
    )) as NodeListOf<HaFormElement>;
    if (expandables) {
      Array.from(expandables).forEach((el: any) => {
        el.addEventListener('expanded-changed', this._expandableToggled.bind(this)), { once: true };
      });
    }
  };

  private _expandableToggled = async (ev: any) => {
    ev.stopPropagation();
    const target = ev.target;
    const expandedOpen = ev.detail.expanded as boolean;
    const styledAlready = target.getAttribute('data-processed') === 'true';

    if (!expandedOpen || styledAlready) {
      // If the panel is closed, do nothing
      return;
    }

    // console.log(targetName, 'toggled, now open:', expandedOpen);
    // add styles to the ha-form inside the expandable
    if (target && target.shadowRoot) {
      const haFormRoot = await selectTree(target.shadowRoot, 'ha-expansion-panel ha-form');
      if (!haFormRoot) return;
      const hasTemplate = target.schema?.context?.isTemplate;
      const isSectionOrder = target.schema?.context?.isSectionOrder;
      if (hasTemplate) {
        const buttonTrigger = await selectTree(haFormRoot.shadowRoot!, SELECTOR.OPTIONAL_BUTTON_TRIGGER);
        if (buttonTrigger) {
          const textLabelNode = Array.from(buttonTrigger.labelSlot.assignedNodes()).find(
            (node: any) => node && node.length > 1
          ) as Text | undefined;
          if (textLabelNode) {
            textLabelNode.data = 'Add template';
          }
        }
      }
      if (isSectionOrder) {
        console.debug('Section form detected..');
        const haChipSet = await selectTree(haFormRoot.shadowRoot!, SELECTOR.HA_CHIP_SET);
        if (haChipSet) {
          haFormRoot.addEventListener('value-changed', this._chipsChanged.bind(this));
          this._changeChipInputStyle(haChipSet);
        }
      }

      // add styles
      // console.log('Adding styles to ha-form in expandable');
      this._stylesManager.addStyle([HA_FORM_STYLE], haFormRoot.shadowRoot);

      const nestedExpandables = (await selectTree(
        haFormRoot.shadowRoot,
        ELEMENT.FORM_EXPANDABLE,
        true
      )) as NodeListOf<HaFormElement>;
      if (nestedExpandables.length) {
        Array.from(nestedExpandables).forEach((el: any) => {
          // console.log('Adding event listener to nested expandable', el);
          el.addEventListener('expanded-changed', this._expandableToggled.bind(this)), { once: true };
        });
      }
      target.setAttribute('data-processed', 'true');
      target.removeEventListener('expanded-changed', this._expandableToggled.bind(this));
    }
  };

  private _changeChipInputStyle = async (haChipSet: HTMLElement) => {
    const chipInputs = (await selectTree(haChipSet, ELEMENT.CHIP_INPUT, true)) as NodeListOf<any>;
    if (chipInputs.length) {
      Array.from(chipInputs).forEach((chip) => {
        const hasStyle = chip.getAttribute('data-styled') === 'true';
        if (!hasStyle) {
          // console.debug('adding style to chip:', chip.label);
          this._stylesManager.addStyle([CHIP_CONTAINER_STYLE], chip.shadowRoot!);
          chip.setAttribute('data-styled', 'true');
        }
      });
    }
  };

  private _chipsChanged = async (ev: any) => {
    const target = ev.currentTarget as any;
    if (target) {
      const haChipSet = await selectTree(target.shadowRoot!, SELECTOR.HA_CHIP_SET);
      this._changeChipInputStyle(haChipSet);
    }
  };

  private _changeChips = () => {
    setTimeout(async () => {
      if (this.schema === undefined || this.schema === null) {
        if (this.schema![0]?.name !== 'section_order') {
          return;
        }
      }
      const haChipSet = await selectTree(this._haForm.shadowRoot!, SELECTOR.HA_CHIP_SET);
      if (haChipSet) {
        this._haForm.addEventListener('value-changed', this._chipsChanged.bind(this));
        this._changeChipInputStyle(haChipSet);
      }
    }, 100);
  };

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
        flex: 1 1 auto;
      }
      #haForm {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        /* margin-block-end: 8px; */
      }
    `;
  }
}
