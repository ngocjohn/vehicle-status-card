export function mergeWithCleanup(dest: Record<string, any>, src: Record<string, any>): boolean {
  let changed = false;
  for (const key of Object.keys(src)) {
    const v = src[key];
    if (v === undefined || v === '') {
      if (key in dest) {
        delete dest[key];
        changed = true;
      }
    } else if (dest[key] !== v) {
      dest[key] = v;
      changed = true;
    }
  }
  return changed;
}
