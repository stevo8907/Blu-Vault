export interface SystemPathsInfo {
  success: boolean;
  vaultName: string;
  vaultLocation: string;
  configDirPath: string;
  resolvedConfigDir: string;
  systemDbFile: string;
  vaultDbFile: string;
  autoBackupConfigFile: string;
  backupDir: string;
  cacheDir: string;
  systemDbPath?: string;
  vaultDbPath?: string;
  backupsDirPath?: string;
  cacheDirPath?: string;
  backupSnapshotsCount?: number;
  paths?: SystemPathsInfo;
  stats?: {
    systemDbExists: boolean;
    systemDbSizeBytes: number;
    vaultDbExists: boolean;
    vaultDbSizeBytes: number;
    backupCount: number;
    backupSizeBytes: number;
    cacheDirsCount: number;
    cacheImagesCount: number;
    cacheSizeBytes: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    mediaCount: number;
    userCount: number;
  };
}

export function getSavedVaultName(): string {
  return localStorage.getItem('bluvault_vault_name') || 'Blu-Vault';
}

export function setSavedVaultName(name: string): void {
  const clean = name.trim() || 'Blu-Vault';
  localStorage.setItem('bluvault_vault_name', clean);
  window.dispatchEvent(new Event('bluvault_vault_config_updated'));
}

export function getSavedVaultLocation(): string {
  return localStorage.getItem('bluvault_vault_location') || 'Home Server';
}

export function setSavedVaultLocation(loc: string): void {
  const clean = loc.trim() || 'Home Server';
  localStorage.setItem('bluvault_vault_location', clean);
  window.dispatchEvent(new Event('bluvault_vault_config_updated'));
}

export function getSavedConfigDirPath(): string {
  return localStorage.getItem('bluvault_config_dir_path') || '/config';
}

export function setSavedConfigDirPath(path: string): void {
  const clean = path.trim() || '/config';
  localStorage.setItem('bluvault_config_dir_path', clean);
  window.dispatchEvent(new Event('bluvault_vault_config_updated'));
}

export async function fetchSystemPaths(): Promise<SystemPathsInfo> {
  const res = await fetch('/api/system/paths');
  if (!res.ok) {
    throw new Error(`Failed to fetch system storage paths: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.vaultName) setSavedVaultName(data.vaultName);
  if (data.vaultLocation) setSavedVaultLocation(data.vaultLocation);
  if (data.configDirPath) setSavedConfigDirPath(data.configDirPath);
  return data;
}

export async function saveSystemPaths(payload: {
  configDirPath?: string;
  vaultName?: string;
  vaultLocation?: string;
}): Promise<SystemPathsInfo> {
  if (payload.vaultName) setSavedVaultName(payload.vaultName);
  if (payload.vaultLocation) setSavedVaultLocation(payload.vaultLocation);
  if (payload.configDirPath) setSavedConfigDirPath(payload.configDirPath);

  const res = await fetch('/api/system/paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Failed to save system storage paths: ${res.statusText}`);
  }
  return await res.json();
}
