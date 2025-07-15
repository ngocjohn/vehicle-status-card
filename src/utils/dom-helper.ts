export const _dispatchEvent = (
  node: HTMLElement,
  type: string,
  detail?: any,
  options?: {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
  }
) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  (event as any).detail = detail;
  node.dispatchEvent(event);

  // For debugging purposes, log the event details
  console.log(`Event dispatched: ${type}`, 'node:', node, 'detail:', detail);

  return event;
};
