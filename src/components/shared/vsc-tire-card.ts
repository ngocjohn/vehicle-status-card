import { pick } from 'es-toolkit';
import { css, CSSResultGroup, html, TemplateResult } from 'lit';

import '../shared/vsc-tire-item';
import '../../utils/custom-tire-card';
import { customElement, property } from 'lit/decorators.js';

import { DEFAULT_TIRE_CONFIG } from '../../editor/form';
// local
import {
  TireBackgroundKeys,
  TireCardLayout,
  TireEntityConfig,
  TireItems,
  TireLayoutKeys,
  TireTemplateConfig,
  TireTemplateEntities,
} from '../../types/config/card/tire-card';
import { BaseElement } from '../../utils/base-element';

@customElement('vsc-tire-card')
export class VehicleTireCard extends BaseElement {
  @property({ attribute: false }) private tireConfig!: TireTemplateConfig;
  @property({ type: Boolean, reflect: true, attribute: 'single' }) single = false;

  constructor() {
    super();
  }
  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    const tireConfig = {
      ...DEFAULT_TIRE_CONFIG,
      ...this.tireConfig,
    } as TireTemplateConfig;
    const tireLayout = pick(tireConfig, [...TireLayoutKeys, ...TireBackgroundKeys]) as TireCardLayout;
    const tireEntities = pick(tireConfig, [...TireItems]) as TireTemplateEntities;
    return html` <custom-tire-card
      .hass=${this.hass}
      .tireLayout=${tireLayout}
      ?horizontal=${tireLayout.horizontal ?? false}
      ?single=${this.single}
    >
      ${Object.entries(tireEntities).map(([key, entity]) => {
        return html`<vsc-tire-item
          slot=${key}
          ._hass=${this.hass}
          .configKey=${key as keyof TireTemplateEntities}
          ._tireItem=${entity as TireEntityConfig}
          ._store=${this._store}
        ></vsc-tire-item>`;
      })}
    </custom-tire-card>`;
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
