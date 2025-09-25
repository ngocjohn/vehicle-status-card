import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { HassEntity } from 'home-assistant-js-websocket';
import { property, state } from 'lit/decorators.js';

import { computeStateDomain } from '../ha';
import { RenderTemplateResult, hasTemplate, subscribeRenderTemplate } from '../ha/data/ws-templates';
import {
  BaseButtonCardItemConfig,
  BUTTON_CARD_TEMPLATE_KEYS,
  ButtonCardTemplateKey,
} from '../types/config/card/button-card';
import { BaseElement } from './base-element';

const cameraUrlWithWidthHeight = (base_url: string, width: number, height: number) =>
  `${base_url}&width=${width}&height=${height}`;

export class BaseButton extends BaseElement {
  @property({ attribute: false }) protected _btnConfig!: BaseButtonCardItemConfig;

  @state() protected _templateResults: Partial<Record<ButtonCardTemplateKey, RenderTemplateResult | undefined>> = {};
  @state() protected _unsubRenderTemplates: Map<ButtonCardTemplateKey, Promise<UnsubscribeFunc>> = new Map();

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    BUTTON_CARD_TEMPLATE_KEYS.forEach((key) => {
      this._subscribeTemplate(key);
    });
  }

  private async _subscribeTemplate(key: ButtonCardTemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this._hass || !hasTemplate(this._btnConfig[key])) {
      return;
    }
    try {
      const sub = subscribeRenderTemplate(
        this._hass.connection,
        (result) => {
          this._templateResults = { ...this._templateResults, [key]: result };
        },
        {
          template: this._btnConfig[key] ?? '',
          variables: {
            user: this._hass.user!.name,
            config: this._btnConfig,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: this._btnConfig[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = { ...this._templateResults, [key]: result };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    BUTTON_CARD_TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: ButtonCardTemplateKey): Promise<void> {
    const unsubPromise = this._unsubRenderTemplates.get(key);
    if (unsubPromise === undefined) {
      return;
    }
    try {
      const unsub = await unsubPromise;
      unsub();
    } catch (e: any) {
      if (e.code === 'not_connected' || e.code === 'template_error') {
        // Ignore these errors
      } else {
        throw e;
      }
    } finally {
      this._unsubRenderTemplates.delete(key);
    }
  }

  protected get _stateObj(): HassEntity | undefined {
    if (!this._btnConfig.entity || !this._hass) {
      return undefined;
    }
    const eId = this._btnConfig.entity;
    return this._hass.states[eId] as HassEntity;
  }

  protected get _btnActionConfig(): Pick<
    BaseButtonCardItemConfig,
    'entity' | 'tap_action' | 'hold_action' | 'double_tap_action'
  > {
    return {
      entity: this._btnConfig.entity,
      tap_action: this._btnConfig.tap_action,
      hold_action: this._btnConfig.hold_action,
      double_tap_action: this._btnConfig.double_tap_action,
    };
  }

  protected _getTemplateValue(key: ButtonCardTemplateKey): string | undefined {
    return this._templateResults[key]?.result;
  }

  protected _getImageUrl(): string | undefined {
    if (!this._stateObj) {
      return undefined;
    }
    const entityPic = this._stateObj.attributes.entity_picture_local || this._stateObj.attributes.entity_picture;
    if (!entityPic) {
      return undefined;
    }
    let imageUrl = this._hass!.hassUrl(entityPic);
    if (computeStateDomain(this._stateObj) === 'camera') {
      imageUrl = cameraUrlWithWidthHeight(imageUrl, 36, 36);
    }
    return imageUrl;
  }
}
