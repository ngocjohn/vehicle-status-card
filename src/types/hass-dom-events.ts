export interface ConfigChangedEvent {
  config: any;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    'config-changed': ConfigChangedEvent;
    'hass-more-info': {
      entityId: string | undefined;
    };
  }
}
