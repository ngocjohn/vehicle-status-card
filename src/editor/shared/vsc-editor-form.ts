import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { HaFormElement, HaFormElItem } from '../../utils/form/ha-form';
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
    gap: 14px 8px !important;
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
    }
    this._addEventListeners();
  }

  private get _formRoot(): HTMLElement {
    return this._haForm.shadowRoot!.querySelector('.root') as HTMLElement;
  }

  private _getNestedHaForm = async (root: ShadowRoot | HTMLElement): Promise<HaFormElement | null> => {
    const haForm = await selectTree(root, 'ha-form');
    return haForm || null;
  };

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
    return capitalizeFirstLetter(label.trim());
  };

  private computeHelper = (schema: any): string | TemplateResult | undefined => {
    return schema.helper || undefined;
  };

  private _addEventListeners = async () => {
    const expandables = (await selectTree(
      this._haForm.shadowRoot,
      ELEMENT.FORM_EXPANDABLE,
      true
    )) as NodeListOf<HaFormElItem>;
    if (expandables) {
      Array.from(expandables).forEach((el: any) => {
        el.addEventListener('expanded-changed', this._expandableToggled.bind(this)), { once: true };
      });
    }
  };

  private _expandableToggled = async (ev: any) => {
    ev.stopPropagation();
    const target = ev.target;
    const targetName = target?.schema?.title || target?.schema?.name || 'unknown';
    const expandedOpen = ev.detail.expanded as boolean;
    const styledAlready = target.getAttribute('data-processed') === 'true';

    if (!expandedOpen || styledAlready) {
      // If the panel is closed, do nothing
      return;
    }

    console.log(targetName, 'toggled, now open:', expandedOpen);
    // add styles to the ha-form inside the expandable
    if (target && target.shadowRoot) {
      const haFormRoot = await selectTree(target.shadowRoot, 'ha-expansion-panel ha-form');
      if (!haFormRoot) return;
      const hasTemplate = target.schema?.context?.isTemplate;
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
      // add styles
      console.log('Adding styles to ha-form in expandable');
      this._stylesManager.addStyle([HA_FORM_STYLE], haFormRoot.shadowRoot);

      const nestedExpandables = (await selectTree(
        haFormRoot.shadowRoot,
        ELEMENT.FORM_EXPANDABLE,
        true
      )) as NodeListOf<HaFormElItem>;
      if (nestedExpandables.length) {
        Array.from(nestedExpandables).forEach((el: any) => {
          console.log('Adding event listener to nested expandable', el);
          el.addEventListener('expanded-changed', this._expandableToggled.bind(this)), { once: true };
        });
      }
      target.setAttribute('data-processed', 'true');
      target.removeEventListener('expanded-changed', this._expandableToggled.bind(this));
    }
  };

  static get styles(): CSSResultGroup {
    return css`
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
