import { HideConfig, SECTION_KEYS, SectionOrder } from '../../types/config/card/layout';

// Reorder sections based on hide config and current order
export const reorderSection = (hide: HideConfig, currentOrder: string[]): SectionOrder[] => {
  if (!hide || Object.keys(hide).length === 0) {
    // If no hide config, return current order or default order
    return currentOrder.length > 0
      ? (currentOrder.filter((s) => SECTION_KEYS.includes(s)) as SectionOrder[])
      : (SECTION_KEYS as SectionOrder[]);
  }

  const hiddenSections = Object.keys(hide).filter((key) => hide[key as keyof HideConfig]);
  const hiddenToRemove = new Set<string>(hiddenSections);
  const visibleToAdd = SECTION_KEYS.filter((key) => !hiddenToRemove.has(key));
  // console.log('Reordering sections with hide config:', { hide, currentOrder, hiddenToRemove, visibleToAdd });
  let sectionOrder: string[] = currentOrder.filter((s) => !hiddenToRemove.has(s));

  // if sectionOrder has 'header_info' and 'indicators' or 'range_info' are not in hiddenToRemove, replace 'header_info' with them
  if (sectionOrder.includes('header_info')) {
    const index = sectionOrder.indexOf('header_info');
    sectionOrder.splice(index, 1);
    if (!hiddenToRemove.has('indicators')) {
      sectionOrder.splice(index, 0, 'indicators');
    }
    if (!hiddenToRemove.has('range_info')) {
      sectionOrder.splice(index + (sectionOrder.includes('indicators') ? 1 : 0), 0, 'range_info');
    }
  }
  // Add any visible sections that are not already in the order, maintaining SECTION_KEYS order
  visibleToAdd.forEach((section) => {
    if (!sectionOrder.includes(section)) {
      sectionOrder.push(section);
    }
  });

  // Remove duplicates while maintaining order
  sectionOrder = [...new Set(sectionOrder)].filter((s) => SECTION_KEYS.includes(s)) as SectionOrder[];
  // console.log('Final reordered sections:', sectionOrder);
  return sectionOrder as SectionOrder[];
};
