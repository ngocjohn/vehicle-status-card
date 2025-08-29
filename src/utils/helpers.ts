export function isEmpty(input: any): boolean {
  if (Array.isArray(input)) {
    // Check if array is empty
    return input.length === 0;
  } else if (input && typeof input === 'object') {
    // Check if object is empty
    return Object.keys(input).length === 0;
  } else {
    // For other types (null, undefined, etc.), treat as not empty
    return true;
  }
}

export const strStartsWith = (value: string, search: string) => value.substring(0, search.length) === search;

export const isTouch =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  // @ts-ignore
  navigator.msMaxTouchPoints > 0;

export const isMobileClient = /(?:iphone|android|ipad)/i.test(navigator.userAgent);

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isMac = /Mac/i.test(navigator.userAgent);

export const computeYamlButtonLabel = (yamlMode: boolean) => (yamlMode ? 'Close YAML Editor' : 'Edit YAML');
