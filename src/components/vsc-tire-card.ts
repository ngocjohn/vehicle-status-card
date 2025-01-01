import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, TemplateResult, css } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

// local
import { TIRE_BG } from '../const/img-const';
// styles
import cardstyles from '../css/card.css';
import { HomeAssistant, TireEntity } from '../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../types/ha-frontend/data/ws-templates';
import { VehicleStatusCard } from '../vehicle-status-card';

const TEMPLATE_KEYS = ['color'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-tire-card')
export class VehicleTireCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) tireConfig!: TireEntity;

  @state() private _templateResults: Record<string, Partial<Record<TemplateKey, RenderTemplateResult | undefined>>> =
    {};
  @state() private _unsubRenderTemplates: Record<string, Map<TemplateKey, Promise<UnsubscribeFunc>>> = {};

  static get styles(): CSSResultGroup {
    return [
      css`
        .tyre-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          aspect-ratio: 1;
          transition: all 0.5s ease-in-out;
        }

        .tyre-toggle-btn {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 2;
          padding: var(--vic-card-padding);
          opacity: 0.5;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .tyre-toggle-btn:hover {
          opacity: 1;
        }

        /* TYRE WRAP ROTATED */
        .tyre-wrapper[rotated='true'] {
          transform: rotate(90deg);
        }

        .tyre-wrapper[rotated='true'] .tyre-box {
          transform: rotate(-90deg);
        }

        .tyre-wrapper .background {
          position: absolute;
          width: var(--vic-tire-size, 100%);
          height: var(--vic-tire-size, 100%);
          z-index: 0;
          top: var(--vic-tire-top, 50%);
          left: var(--vic-tire-left, 50%);
          transform: translate(-50%, -50%);
          background-size: contain;
          background-repeat: no-repeat;
          overflow: hidden;
          filter: drop-shadow(2px 4px 1rem #000000d8);
        }

        .tyre-wrapper .tyre-box {
          position: absolute;
          width: 35%;
          height: 50%;
          z-index: 1;
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: center;
          gap: 0.5rem;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
          transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
          scale: var(--vic-tire-value-size);
        }

        .tyre-value {
          font-size: 1.5rem;
          color: var(--primary-text-color);
          text-align: center;
          margin: 0;
        }

        .tyre-name {
          color: var(--secondary-text-color);
          text-align: left;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          white-space: nowrap;
        }

        .tyre-info {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--secondary-text-color);
          text-align: center;
        }

        *[tyre='frontleft'] {
          top: 0%;
          left: 0%;
          /* transform: translate(-15%, -10%); */
        }

        *[tyre='frontright'] {
          top: 0%;
          right: 0%;
          /* transform: translate(15%, -10%); */
        }

        *[tyre='rearleft'] {
          bottom: 0%;
          left: 0%;
          /* transform: translate(-15%, 10%); */
        }

        *[tyre='rearright'] {
          bottom: 0%;
          right: 0%;
          /* transform: translate(15%, 10%); */
        }
      `,
      cardstyles,
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private isTemplate(tireKey: string, key: TemplateKey): boolean {
    const value = this.tireConfig.tires[tireKey][key];
    return value?.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    const tireEntities = Object.keys(this.tireConfig.tires);

    for (const tire of tireEntities) {
      TEMPLATE_KEYS.forEach((key) => {
        this._subscribeRenderTemplate(tire, key);
      });
    }
  }

  private async _subscribeRenderTemplate(tire: string, key: TemplateKey): Promise<void> {
    if (!this.hass || !this.isTemplate(tire, key)) {
      return;
    }

    const tireEntity = this.tireConfig.tires[tire];
    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [tire]: {
              ...(this._templateResults[tire] || {}),
              [key]: result,
            },
          };
        },
        {
          template: tireEntity[key] ?? '',
          variables: {
            config: tireEntity,
            user: this.hass.user!.name,
            entity: tireEntity.entity,
          },
        }
      );
      if (!this._unsubRenderTemplates[tire]) {
        this._unsubRenderTemplates[tire] = new Map();
      }

      this._unsubRenderTemplates[tire].set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: tireEntity[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [tire]: {
          ...(this._templateResults[tire] || {}),
          [key]: result,
        },
      };
      if (this._unsubRenderTemplates[tire]) {
        this._unsubRenderTemplates[tire].delete(key);
      }
    }
  }

  private async _tryDisconnect(): Promise<void> {
    for (const key in this._unsubRenderTemplates) {
      await this._tryUnsubscribe(key);
    }
  }

  private async _tryUnsubscribe(tire: string): Promise<void> {
    const unsubMap = this._unsubRenderTemplates[tire];
    if (!unsubMap) {
      return;
    }

    for (const [templateKey, unsubPromis] of unsubMap.entries()) {
      try {
        const unsub = await unsubPromis;
        unsub();
        unsubMap.delete(templateKey);
      } catch (err: any) {
        if (err.code === 'not_found' || err.code === 'template_error') {
          // If we get here, the connection was probably already closed. Ignore.
        } else {
          throw err;
        }
      }
    }

    if (unsubMap.size === 0) {
      delete this._unsubRenderTemplates[tire];
    }
  }

  protected render(): TemplateResult {
    const tireConfig = this.tireConfig;

    const background = tireConfig.background || TIRE_BG;
    const isHorizontal = tireConfig.horizontal || false;
    const tireCardTitle = tireConfig.title || '';
    const tireCardSize = tireConfig.image_size || 100;
    const tireValueSize = tireConfig.value_size || 100;
    const tireTop = tireConfig.top || 50;
    const tireLeft = tireConfig.left || 50;
    const tires = tireConfig.tires;

    const sizeStyle = {
      '--vic-tire-top': `${tireTop}%`,
      '--vic-tire-left': `${tireLeft}%`,
      '--vic-tire-size': `${tireCardSize}%`,
      '--vic-tire-value-size': tireValueSize / 100,
    };

    return html`
      <div class="default-card">
        <div class="data-header">${tireCardTitle}</div>
        <div class="tyre-toggle-btn click-shrink" @click=${(ev: Event) => this.toggleTireDirection(ev)}>
          <ha-icon icon="mdi:rotate-right-variant"></ha-icon>
        </div>

        <div class="data-box tyre-wrapper" rotated=${isHorizontal} style=${styleMap(sizeStyle)}>
          <div class="background" style="background-image: url(${background})"></div>
          ${Object.keys(tires).map((key) => {
            const { state, name } = tires[key];
            const color = this._templateResults[key]?.color?.result || tires[key].color;
            const cssClass = key.replace('_', '').toLowerCase();
            return html` <div class="tyre-box" tyre=${cssClass}>
              <span class="tyre-value" style=${`color: ${color}`}>${state}</span>
              <span class="tyre-name">${name}</span>
            </div>`;
          })}
        </div>
      </div>
    `;
  }
  private toggleTireDirection(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLElement;
    const tyreWrapper = target.closest('.default-card')?.querySelector('.tyre-wrapper');
    if (!tyreWrapper) return;

    const isHorizontal = tyreWrapper.getAttribute('rotated') === 'true';
    tyreWrapper.setAttribute('rotated', isHorizontal ? 'false' : 'true');
  }
}
