import { pick } from 'es-toolkit';
import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import '../shared/vsc-tire-item';
import '../../utils/custom-tire-card';
import { DEFAULT_TIRE_CONFIG } from '../../editor/form';
import { LovelaceCard } from '../../ha/data/lovelace';
import { LovelaceElement, LovelaceElementConfig } from '../../ha/panels/lovelace/elements/types';
// local
import {
  TireBackgroundKeys,
  TireCardLayout,
  TireEntityConfig,
  TireItemsKeys,
  TireLayoutKeys,
  TireTemplateConfig,
  TireTemplateEntities,
} from '../../types/config/card/tire-card';
import { BaseElement } from '../../utils/base-element';
import { createHuiElement } from '../../utils/lovelace/create-card-element';

@customElement('vsc-tire-card')
export class VehicleTireCard extends BaseElement {
  @property({ attribute: false }) private tireConfig!: TireTemplateConfig;
  @property({ type: Boolean, reflect: true, attribute: 'single' }) single = false;

  @state() private _elements?: LovelaceElement[];

  constructor() {
    super();
  }
  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('tireConfig')) {
      this.tireConfig = {
        ...DEFAULT_TIRE_CONFIG,
        ...this.tireConfig,
      } as TireTemplateConfig;
      if (Array.isArray(this.tireConfig.elements) && this.tireConfig.elements.length > 0) {
        Promise.all(this.tireConfig.elements.map((element) => this._createElement(element))).then(
          (resolvedElements) => {
            this._elements = resolvedElements;
          }
        );
      }
    }
  }
  protected render(): TemplateResult {
    const tireConfig = this.tireConfig;
    const tireLayout = pick(tireConfig || {}, [...TireLayoutKeys, ...TireBackgroundKeys]) as TireCardLayout;
    const tireEntities = pick(tireConfig || {}, [...TireItemsKeys]) as TireTemplateEntities;

    return html` <custom-tire-card
      .hass=${this.hass}
      .tireLayout=${tireLayout}
      ._elements=${this._elements}
      ?horizontal=${tireLayout.horizontal ?? false}
      ?single=${this.single}
    >
      ${Object.entries(tireEntities).map(([key, entity]) => {
        return this._renderTireItem(key as keyof TireTemplateEntities, entity as TireEntityConfig);
      })}
    </custom-tire-card>`;
  }
  private _renderTireItem(key: keyof TireTemplateEntities, entityConfig: TireEntityConfig): TemplateResult {
    const hasCustomPosition = entityConfig.use_custom_position ?? false;
    let styles: Record<string, string> = {};
    if (hasCustomPosition && entityConfig.position) {
      Object.entries(entityConfig.position).map(([posKey, posValue]) => {
        if (posValue !== undefined) {
          styles[posKey] = `${posValue}%`;
        }
      });
      styles['transform'] = 'none';
    } else if (!hasCustomPosition) {
      styles['grid-area'] = key;
    }

    return html`<vsc-tire-item
      slot="grid-item"
      class=${classMap({ element: hasCustomPosition })}
      style=${styleMap(styles)}
      ._hass=${this.hass}
      .configKey=${key}
      ._tireItem=${entityConfig}
      ._store=${this._store}
    ></vsc-tire-item>`;
  }

  private async _createElement(config: LovelaceElementConfig): Promise<LovelaceElement> {
    const element = (await createHuiElement(config)) as unknown as LovelaceCard;
    if (this.hass) {
      element.hass = this.hass;
    }

    element.addEventListener(
      'll-rebuild',
      (ev) => {
        ev.stopPropagation();
        this._rebuildElement(element, config);
      },
      { once: true }
    );
    return element;
  }

  private async _rebuildElement(elToReplace: LovelaceElement, config: LovelaceElementConfig): Promise<void> {
    const newCardEl = await this._createElement(config);
    if (elToReplace.parentElement) {
      elToReplace.parentElement.replaceChild(newCardEl, elToReplace);
    }
    this._elements = this._elements!.map((curCardEl) => (curCardEl === elToReplace ? newCardEl : curCardEl));
  }
  static get styles(): CSSResultGroup {
    return [super.styles, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-tire-card': VehicleTireCard;
  }
}
