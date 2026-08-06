export interface NavItem {
  id: string;
  label: string;
  group: 'movies' | 'tv' | 'games' | 'anime';
  filterType?: string;
  customKeyword?: string;
  icon?: string;
  hidden: boolean;
  isCustom?: boolean;
}

const STORAGE_KEY = 'blu_vault_nav_items_v6';

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  // MOVIES
  { id: 'movies-all', label: 'All Movies', group: 'movies', filterType: 'all', icon: 'film', hidden: false },
  { id: 'movies-4k', label: '4K Ultra HD', group: 'movies', filterType: '4k', icon: 'sparkles', hidden: false },
  { id: 'movies-bluray', label: 'Blu-Ray', group: 'movies', filterType: 'bluray', icon: 'disc', hidden: false },
  { id: 'movies-dvd', label: 'DVD', group: 'movies', filterType: 'dvd', icon: 'disc', hidden: false },

  // TV SHOWS
  { id: 'tv-all', label: 'All TV Series', group: 'tv', filterType: 'all', icon: 'tv', hidden: false },
  { id: 'tv-4k', label: '4K UHD', group: 'tv', filterType: '4k', icon: 'sparkles', hidden: false },
  { id: 'tv-bluray', label: 'Blu-Ray', group: 'tv', filterType: 'bluray', icon: 'disc', hidden: false },
  { id: 'tv-boxsets', label: 'Complete Box Sets', group: 'tv', filterType: 'boxsets', icon: 'box', hidden: false },

  // ANIME
  { id: 'anime-all', label: 'All Anime', group: 'anime', filterType: 'all', icon: 'sparkles', hidden: false },
  { id: 'anime-movies', label: 'Anime Movies', group: 'anime', filterType: 'movies', icon: 'film', hidden: false },
  { id: 'anime-tv', label: 'Anime Series', group: 'anime', filterType: 'tv', icon: 'tv', hidden: false },

  // VIDEO GAMES
  { id: 'games-all', label: 'All Games', group: 'games', filterType: 'all', icon: 'gamepad', hidden: false },
  { id: 'games-ps', label: 'PlayStation (PS5/PS4)', group: 'games', filterType: 'ps', icon: 'disc', hidden: false },
  { id: 'games-xbox', label: 'Xbox Series / One', group: 'games', filterType: 'xbox', icon: 'disc', hidden: false },
  { id: 'games-nintendo', label: 'Nintendo Switch', group: 'games', filterType: 'nintendo', icon: 'disc', hidden: false }
];

export function getSavedNavItems(): NavItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse saved nav items:', e);
  }
  return DEFAULT_NAV_ITEMS;
}

export function saveNavItems(items: NavItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Trigger custom event so components can react immediately
    window.dispatchEvent(new Event('blu_vault_nav_updated'));
  } catch (e) {
    console.error('Failed to save nav items:', e);
  }
}

export function resetNavItemsToDefault(): NavItem[] {
  saveNavItems(DEFAULT_NAV_ITEMS);
  return DEFAULT_NAV_ITEMS;
}
