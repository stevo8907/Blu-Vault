import { MediaItem, User, UserPermissions, UserRole, ApiConfig, TMDBSearchResult, BarcodeLookupResult, ViewCategory, Season, Episode, AutoBackupConfig, BackupSnapshot } from '../types';

export async function checkAuthStatus(): Promise<{ isOobeRequired: boolean; totalUsers: number }> {
  const res = await fetch('/api/auth/status');
  const data = await res.json();
  return { isOobeRequired: Boolean(data.isOobeRequired), totalUsers: data.totalUsers || 0 };
}

export async function submitOobeSetup(username: string, password: string, avatar?: string): Promise<{ success: boolean; message: string; user: User }> {
  const res = await fetch('/api/auth/oobe-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, avatar })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to complete initial administrator setup');
  return data;
}

export async function loginUser(username: string, password?: string): Promise<{ success: boolean; user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Invalid username or password');
  return data;
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  const data = await res.json();
  return data.users || [];
}

export async function createUser(userData: {
  username: string;
  password?: string;
  role: UserRole;
  permissions?: UserPermissions;
  avatar?: string;
  pin?: string;
  disabled?: boolean;
}): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create user');
  return data.user;
}

export async function updateUser(id: string, updates: {
  username?: string;
  password?: string;
  role?: UserRole;
  permissions?: UserPermissions;
  avatar?: string;
  pin?: string;
  disabled?: boolean;
}): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update user');
  return data.user;
}

export async function deleteUser(id: string, adminPassword?: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete user');
}

export async function fetchMedia(params?: {
  search?: string;
  type?: string;
  format?: string;
  shelf?: string;
  lent?: boolean;
  favorite?: boolean;
  sort?: string;
}): Promise<MediaItem[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.type && params.type !== 'all') query.set('type', params.type);
  if (params?.format && params.format !== 'all') query.set('format', params.format);
  if (params?.shelf) query.set('shelf', params.shelf);
  if (params?.lent) query.set('lent', 'true');
  if (params?.favorite) query.set('favorite', 'true');
  if (params?.sort) query.set('sort', params.sort);

  const res = await fetch(`/api/media?${query.toString()}`);
  const data = await res.json();
  return data.media || [];
}

export async function addMediaItem(item: Partial<MediaItem>): Promise<MediaItem> {
  const res = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to add media item');
  return data.item;
}

export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<MediaItem> {
  const res = await fetch(`/api/media/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update media item');
  return data.item;
}

export async function deleteMediaItem(id: string): Promise<void> {
  const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete item');
}

export async function updateLoanStatus(id: string, loanData: {
  isLentOut: boolean;
  lentTo?: string;
  dueDate?: string;
  notes?: string;
  lentItems?: string[];
}): Promise<MediaItem> {
  const res = await fetch(`/api/media/${id}/loan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loanData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update loan status');
  return data.item;
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const res = await fetch(`/api/media/${id}/favorite`, { method: 'POST' });
  const data = await res.json();
  return Boolean(data.isFavorite);
}

export async function searchTMDB(query: string, type: 'multi' | 'movie' | 'tv' = 'multi'): Promise<{
  source: string;
  results: TMDBSearchResult[];
}> {
  const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&type=${type}`);
  const data = await res.json();
  return {
    source: data.source || 'unknown',
    results: data.results || []
  };
}

export async function getTMDBDetails(tmdbId: number, type: 'movie' | 'tv' = 'movie'): Promise<any> {
  const res = await fetch(`/api/tmdb/details?id=${tmdbId}&type=${type}`);
  const data = await res.json();
  return data.details;
}

export async function lookupBarcode(barcode: string): Promise<{
  foundInVault: boolean;
  item?: MediaItem;
  result?: BarcodeLookupResult;
  message?: string;
}> {
  const res = await fetch(`/api/barcode/lookup?code=${encodeURIComponent(barcode)}`);
  return await res.json();
}

export async function identifyBarcodeWithAI(barcode: string): Promise<{
  success: boolean;
  source?: string;
  result?: BarcodeLookupResult;
  message?: string;
}> {
  const res = await fetch('/api/barcode/identify-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: barcode })
  });
  return await res.json();
}

export async function fetchApiConfigs(): Promise<ApiConfig[]> {
  const res = await fetch('/api/settings/apis');
  const data = await res.json();
  return data.apiConfigs || [];
}

export async function saveApiConfigs(configs: ApiConfig[]): Promise<ApiConfig[]> {
  const res = await fetch('/api/settings/apis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiConfigs: configs })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to save API settings');
  return data.apiConfigs;
}

export async function testApiConfig(type: string, apiKey: string, baseUrl: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/settings/apis/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, apiKey, baseUrl })
  });
  return await res.json();
}

export async function exportVaultBackup(): Promise<void> {
  window.open('/api/backup/export', '_blank');
}

export async function exportVaultOnlyJSON(): Promise<void> {
  window.open('/api/backup/export/vault', '_blank');
}

export async function exportSystemOnlyJSON(): Promise<void> {
  window.open('/api/backup/export/system', '_blank');
}

export async function exportCollectionCSV(): Promise<void> {
  window.open('/api/backup/export/csv', '_blank');
}

export async function fetchDatabaseStatus(): Promise<{
  segmented: boolean;
  systemDb: { filename: string; path: string; exists: boolean; sizeBytes: number; updatedAt: string; userCount: number; apiConfigCount: number };
  vaultDb: { filename: string; path: string; exists: boolean; sizeBytes: number; updatedAt: string; mediaCount: number };
}> {
  const res = await fetch('/api/system/db-status');
  return await res.json();
}

export async function importVaultBackup(jsonData: string): Promise<{ success: boolean; importedCount?: number; mediaCount?: number; message: string }> {
  const res = await fetch('/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
  });
  return await res.json();
}

export async function importVaultOnlyJSON(jsonData: any): Promise<{ success: boolean; mediaCount?: number; message: string }> {
  const res = await fetch('/api/backup/import/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
  });
  return await res.json();
}

export async function importSystemOnlyJSON(jsonData: any): Promise<{ success: boolean; userCount?: number; apiConfigCount?: number; message: string }> {
  const res = await fetch('/api/backup/import/system', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
  });
  return await res.json();
}

export async function fetchTMDBSeason(tvId: number, seasonNumber: number): Promise<Season> {
  const res = await fetch(`/api/tmdb/season?tvId=${tvId}&seasonNumber=${seasonNumber}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch season details');
  return data.season;
}

export async function saveTVSeason(mediaId: string, season: Season): Promise<MediaItem> {
  const res = await fetch(`/api/media/${mediaId}/seasons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ season })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to save season');
  return data.item;
}

export async function toggleEpisodeWatched(mediaId: string, seasonNumber: number, episodeNumber: number, isWatched?: boolean): Promise<MediaItem> {
  const res = await fetch(`/api/media/${mediaId}/episodes/toggle-watched`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seasonNumber, episodeNumber, isWatched })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to toggle episode status');
  return data.item;
}

export async function resetSystemToDefault(userId: string, password: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/system/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to reset system to factory defaults');
  return data;
}

export async function restartSystem(userId: string, password: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/system/restart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to restart system');
  return data;
}

export async function powerOffSystem(userId: string, password: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/system/poweroff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to power off system');
  return data;
}

export async function segmentShowSeasons(title: string, totalEpisodes?: number, requestedSeasons?: number, tmdbId?: number): Promise<{ success: boolean; source: string; seasons: Season[] }> {
  const res = await fetch('/api/anime/segment-seasons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, totalEpisodes, requestedSeasons, tmdbId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to segment seasons');
  return data;
}

export async function fetchAutoBackupConfig(): Promise<{ config: AutoBackupConfig; snapshots: BackupSnapshot[] }> {
  const res = await fetch('/api/backup/auto-config');
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch auto backup config');
  return { config: data.config, snapshots: data.snapshots || [] };
}

export async function saveAutoBackupConfig(config: Partial<AutoBackupConfig>): Promise<AutoBackupConfig> {
  const res = await fetch('/api/backup/auto-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to save auto backup settings');
  return data.config;
}

export async function triggerAutoBackupNow(): Promise<{ message: string; snapshots: BackupSnapshot[]; config: AutoBackupConfig }> {
  const res = await fetch('/api/backup/trigger-now', { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to trigger backup');
  return { message: data.message, snapshots: data.snapshots, config: data.config };
}

export async function deleteBackupSnapshot(id: string): Promise<BackupSnapshot[]> {
  const res = await fetch(`/api/backup/snapshots/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete snapshot');
  return data.snapshots;
}

export async function restoreBackupSnapshot(id: string): Promise<void> {
  const res = await fetch(`/api/backup/snapshots/${encodeURIComponent(id)}/restore`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to restore snapshot');
}

export function downloadBackupSnapshot(id: string): void {
  window.open(`/api/backup/snapshots/${encodeURIComponent(id)}/download`, '_blank');
}

export async function fetchTMDBCollection(collectionId: number): Promise<{
  id: number;
  name: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  parts: Array<{
    tmdbId: number;
    title: string;
    originalTitle?: string;
    overview: string;
    posterUrl: string;
    backdropUrl: string;
    releaseYear: number;
    rating: number;
  }>;
}> {
  const res = await fetch(`/api/tmdb/collection?id=${collectionId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch collection details');
  return data.collection;
}

export async function runCollectarrScan(): Promise<{
  message: string;
  updatedCount: number;
  collectionCount: number;
  collections: Array<{ id: number; name: string; posterUrl?: string; backdropUrl?: string }>;
}> {
  const res = await fetch('/api/collections/scan', { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Collectarr scan failed');
  return data;
}

export async function clearCollectarrCollections(): Promise<{ message: string; resetCount: number }> {
  const res = await fetch('/api/collections/clear', { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to clear collection tags');
  return data;
}

export async function fetchCollectarrItemStack(params: { mediaItemId?: string; tmdbId?: number; title?: string }): Promise<{
  success: boolean;
  hasCollection: boolean;
  isLocalGroup?: boolean;
  collectionInfo?: { id: number; name: string; overview?: string; posterUrl?: string; backdropUrl?: string };
  parts?: Array<{
    tmdbId: number;
    title: string;
    originalTitle?: string;
    overview: string;
    posterUrl: string;
    backdropUrl: string;
    releaseYear: number;
    rating: number;
    inVault: boolean;
    inWishlist: boolean;
    vaultItemId?: string;
    format?: string;
    shelfLocation?: string;
    condition?: string;
  }>;
  totalParts?: number;
  ownedParts?: number;
  wishlistParts?: number;
  completionPercent?: number;
  message?: string;
}> {
  const query = new URLSearchParams();
  if (params.mediaItemId) query.append('mediaItemId', params.mediaItemId);
  if (params.tmdbId) query.append('tmdbId', String(params.tmdbId));
  if (params.title) query.append('title', params.title);

  const res = await fetch(`/api/collectarr/item-stack?${query.toString()}`);
  return await res.json();
}

export async function addMissingCollectarrItem(payload: {
  title: string;
  tmdbId?: number;
  releaseYear?: number;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  rating?: number;
  collectionInfo?: any;
  targetState: 'wishlist' | 'vault';
}): Promise<{ success: boolean; item?: any; message: string }> {
  const res = await fetch('/api/collectarr/add-missing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

export function getSavedConfigDirPath(): string {
  return localStorage.getItem('bluvault_config_dir_path') || '/config';
}

export function setSavedConfigDirPath(path: string): void {
  localStorage.setItem('bluvault_config_dir_path', path);
}

export async function saveSystemConfigPath(configDirPath: string): Promise<any> {
  setSavedConfigDirPath(configDirPath);
  try {
    const res = await fetch('/api/system/config-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configDirPath })
    });
    return await res.json();
  } catch (err) {
    return { success: true, configDirPath };
  }
}







