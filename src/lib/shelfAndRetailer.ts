export const UK_RETAILERS = [
  'HMV',
  'Zavvi UK',
  'Amazon UK',
  'Rarewaves',
  'Arrow Video UK',
  'Eureka Entertainment',
  'Powerhouse Indicator',
  'Criterion Collection UK',
  'CEX (Complete Entertainment eXchange)',
  'Second Sight Films',
  'BFI (British Film Institute)',
  'eBay UK',
  'Other UK Retailer'
];

export const DEFAULT_SHELVES = [
  'Vault Shelf A1',
  'Vault Shelf A2',
  'Living Room Media Cabinet',
  'Bedroom Display Rack',
  'Cinema Room Display',
  'Steelbook Wall Shelf',
  'Collector Box Set Shelf'
];

export function getSavedShelfLocations(): string[] {
  try {
    const saved = localStorage.getItem('blu_vault_shelf_locations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_SHELVES;
}

export function saveShelfLocation(newShelf: string): string[] {
  const current = getSavedShelfLocations();
  const trimmed = newShelf.trim();
  if (trimmed && !current.includes(trimmed)) {
    const updated = [...current, trimmed];
    localStorage.setItem('blu_vault_shelf_locations', JSON.stringify(updated));
    return updated;
  }
  return current;
}
