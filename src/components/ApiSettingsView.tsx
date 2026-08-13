import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, CheckCircle, RefreshCw, Plus, Trash2, Power, Globe, 
  Download, Upload, ShieldCheck, Loader2, AlertTriangle, Lock, ShieldAlert, 
  X, Eye, EyeOff, RotateCcw, Server, Coins, Sparkles, SlidersHorizontal, Database, Layers, Users,
  Clock, Calendar, HardDrive, History, Play, Check, Save, FileJson, CheckSquare, FileSpreadsheet
} from 'lucide-react';
import { ApiConfig, User, AutoBackupConfig, BackupSnapshot } from '../types';
import { 
  fetchApiConfigs, saveApiConfigs, testApiConfig, exportVaultBackup, exportVaultOnlyJSON, exportSystemOnlyJSON, exportCollectionCSV, importVaultBackup, importVaultOnlyJSON, importSystemOnlyJSON, fetchDatabaseStatus,
  resetSystemToDefault, restartSystem, powerOffSystem,
  fetchAutoBackupConfig, saveAutoBackupConfig, triggerAutoBackupNow, deleteBackupSnapshot, restoreBackupSnapshot, downloadBackupSnapshot,
  fetchCacheStats, preloadCacheImages, clearCache
} from '../lib/api';
import { CURRENCY_OPTIONS, getSavedCurrencyCode, setSavedCurrencyCode, formatPrice } from '../lib/currency';
import { 
  getSavedVaultName, 
  setSavedVaultName, 
  getSavedVaultLocation, 
  setSavedVaultLocation, 
  getSavedConfigDirPath, 
  setSavedConfigDirPath, 
  fetchSystemPaths, 
  saveSystemPaths, 
  SystemPathsInfo 
} from '../lib/vaultConfig';
import { NavigationSettingsSection } from './NavigationSettingsSection';
import { LogoSelectorCard } from './LogoIcon';
import { UserManagementView } from './UserManagementView';

interface ApiSettingsViewProps {
  currentUser?: User | null;
  users?: User[];
  onRefreshUsers?: () => void;
  onMediaImported?: () => void;
  onSystemReset?: () => void;
}

type SettingsTab = 'api' | 'users' | 'branding' | 'navigation' | 'currency' | 'data' | 'system';

interface TabItem {
  id: SettingsTab;
  label: string;
  badge?: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({ currentUser, users, onRefreshUsers, onMediaImported, onSystemReset }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');

  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ id: string; message: string; success: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Currency & Localization State
  const [selectedCurrency, setSelectedCurrency] = useState<string>(getSavedCurrencyCode());

  // New Custom API State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  // Factory Reset & Power Control Modal States
  const [resetStep, setResetStep] = useState<'closed' | 'password' | 'final_confirm'>('closed');
  const [actionTarget, setActionTarget] = useState<'reset' | 'restart' | 'poweroff'>('reset');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [powerStatusMessage, setPowerStatusMessage] = useState<string | null>(null);

  // Import JSON File refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const vaultFileInputRef = React.useRef<HTMLInputElement>(null);
  const systemFileInputRef = React.useRef<HTMLInputElement>(null);

  // Automated Backup System State
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>({
    enabled: true,
    frequency: 'daily',
    backupTime: '02:00',
    retentionCount: 10,
    autoDownload: false,
    backupLocation: '/data/backups/'
  });
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([]);
  const [dbStatus, setDbStatus] = useState<{
    segmented: boolean;
    systemDb: { filename: string; path: string; exists: boolean; sizeBytes: number; updatedAt: string; userCount: number; apiConfigCount: number };
    vaultDb: { filename: string; path: string; exists: boolean; sizeBytes: number; updatedAt: string; mediaCount: number };
  } | null>(null);
  const [isAutoBackupLoading, setIsAutoBackupLoading] = useState(false);
  const [isSavingAutoBackup, setIsSavingAutoBackup] = useState(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [snapshotRestoringId, setSnapshotRestoringId] = useState<string | null>(null);
  const [autoBackupNotice, setAutoBackupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cache Management State
  const [cacheStats, setCacheStats] = useState<{
    metadataCount: number;
    imageCount: number;
    movieDirs: number;
    tvDirs: number;
    gameDirs: number;
    totalDirs: number;
    imageSizeBytes: number;
    imageSizeMB: string;
    cacheDir?: string;
  } | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheConfirmType, setCacheConfirmType] = useState<'metadata' | 'images' | 'all' | null>(null);
  const [cacheNotice, setCacheNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Vault Identity & Storage Directory State
  const [vaultName, setVaultName] = useState(getSavedVaultName());
  const [vaultLocation, setVaultLocation] = useState(getSavedVaultLocation());
  const [configDirPath, setConfigDirPath] = useState(getSavedConfigDirPath());
  const [systemPathsInfo, setSystemPathsInfo] = useState<SystemPathsInfo | null>(null);
  const [isSavingVaultConfig, setIsSavingVaultConfig] = useState(false);
  const [vaultConfigNotice, setVaultConfigNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadVaultStoragePaths = async () => {
    try {
      const paths = await fetchSystemPaths();
      setSystemPathsInfo(paths);
      if (paths.vaultName) setVaultName(paths.vaultName);
      if (paths.vaultLocation) setVaultLocation(paths.vaultLocation);
      if (paths.configDirPath) setConfigDirPath(paths.configDirPath);
    } catch (e) {
      console.warn('Failed to load system storage paths:', e);
    }
  };

  const handleSaveVaultConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingVaultConfig(true);
    setVaultConfigNotice(null);
    try {
      setSavedVaultName(vaultName);
      setSavedVaultLocation(vaultLocation);
      setSavedConfigDirPath(configDirPath);

      const res = await saveSystemPaths({
        vaultName,
        vaultLocation,
        configDirPath
      });

      setSystemPathsInfo(res);
      setVaultConfigNotice({ 
        type: 'success', 
        message: `Vault configuration saved! Database, backup & cache directories updated to "${res.configDirPath || configDirPath}".` 
      });
      loadAutoBackupData();
    } catch (err: any) {
      setVaultConfigNotice({ 
        type: 'error', 
        message: err.message || 'Failed to save vault storage configuration.' 
      });
    } finally {
      setIsSavingVaultConfig(false);
    }
  };

  const loadCacheStats = async () => {
    setIsCacheLoading(true);
    try {
      const stats = await fetchCacheStats();
      const raw = stats.stats || stats;
      setCacheStats({
        metadataCount: raw.metadataCount ?? 0,
        imageCount: raw.imageCount ?? 0,
        movieDirs: raw.movieDirs ?? 0,
        tvDirs: raw.tvDirs ?? 0,
        gameDirs: raw.gameDirs ?? 0,
        totalDirs: raw.totalDirs ?? ((raw.movieDirs || 0) + (raw.tvDirs || 0) + (raw.gameDirs || 0)),
        imageSizeBytes: raw.imageSizeBytes ?? raw.totalBytes ?? 0,
        imageSizeMB: raw.imageSizeMB || `${(((raw.totalBytes || raw.imageSizeBytes || 0)) / (1024 * 1024)).toFixed(2)} MB`,
        cacheDir: raw.cacheDir || (stats as any)?.cacheDir || `${configDirPath}/cache`
      });
    } catch (err) {
      console.error('Error loading cache stats:', err);
    } finally {
      setIsCacheLoading(false);
    }
  };

  const handlePreloadImages = async () => {
    setIsPreloadingImages(true);
    setCacheNotice(null);
    try {
      const res = await preloadCacheImages();
      if (res.success) {
        setCacheNotice({ type: 'success', message: res.message });
        await loadCacheStats();
      } else {
        setCacheNotice({ type: 'error', message: res.message || 'Preload failed.' });
      }
    } catch (err: any) {
      setCacheNotice({ type: 'error', message: err.message || 'Failed to preload images.' });
    } finally {
      setIsPreloadingImages(false);
    }
  };

  const handleClearCache = async (type: 'metadata' | 'images' | 'all') => {
    setIsClearingCache(true);
    setCacheNotice(null);
    setCacheConfirmType(null);
    try {
      const res = await clearCache(type);
      if (res.success) {
        setCacheNotice({ type: 'success', message: res.message });
        // Immediately reset cached numbers in local state
        if (type === 'all') {
          setCacheStats(prev => prev ? {
            ...prev,
            metadataCount: 0,
            imageCount: 0,
            movieDirs: 0,
            tvDirs: 0,
            gameDirs: 0,
            totalDirs: 0,
            imageSizeBytes: 0,
            imageSizeMB: '0.00 MB'
          } : null);
        } else if (type === 'metadata') {
          setCacheStats(prev => prev ? {
            ...prev,
            metadataCount: 0
          } : null);
        } else if (type === 'images') {
          setCacheStats(prev => prev ? {
            ...prev,
            imageCount: 0,
            movieDirs: 0,
            tvDirs: 0,
            gameDirs: 0,
            totalDirs: 0,
            imageSizeBytes: 0,
            imageSizeMB: '0.00 MB'
          } : null);
        }
        await loadCacheStats();
      } else {
        setCacheNotice({ type: 'error', message: res.message || 'Clear cache failed.' });
      }
    } catch (err: any) {
      setCacheNotice({ type: 'error', message: err.message || 'Failed to clear cache.' });
    } finally {
      setIsClearingCache(false);
    }
  };

  const loadAutoBackupData = async () => {
    setIsAutoBackupLoading(true);
    try {
      const [{ config, snapshots }, status] = await Promise.all([
        fetchAutoBackupConfig(),
        fetchDatabaseStatus().catch(() => null)
      ]);
      if (config) setAutoBackupConfig(config);
      setBackupSnapshots(snapshots || []);
      if (status) setDbStatus(status);
    } catch (err: any) {
      console.error('Error loading auto backup config:', err);
    } finally {
      setIsAutoBackupLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'data') {
      loadAutoBackupData();
    }
    if (activeTab === 'api' || activeTab === 'data') {
      loadCacheStats();
    }
  }, [activeTab]);

  const handleSaveAutoBackupSettings = async () => {
    setIsSavingAutoBackup(true);
    setAutoBackupNotice(null);
    try {
      const updated = await saveAutoBackupConfig(autoBackupConfig);
      setAutoBackupConfig(updated);
      setAutoBackupNotice({ type: 'success', message: 'Automated backup schedule updated successfully!' });
    } catch (err: any) {
      setAutoBackupNotice({ type: 'error', message: err.message || 'Failed to save automated backup schedule.' });
    } finally {
      setIsSavingAutoBackup(false);
    }
  };

  const handleTriggerBackupNow = async () => {
    setIsTriggeringBackup(true);
    setAutoBackupNotice(null);
    try {
      const res = await triggerAutoBackupNow();
      if (res.config) setAutoBackupConfig(res.config);
      if (res.snapshots) setBackupSnapshots(res.snapshots);
      setAutoBackupNotice({ type: 'success', message: `Backup created: ${res.message}` });
    } catch (err: any) {
      setAutoBackupNotice({ type: 'error', message: err.message || 'Failed to create backup snapshot.' });
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm(`Are you sure you want to delete backup snapshot "${id}"?`)) return;
    try {
      const updated = await deleteBackupSnapshot(id);
      setBackupSnapshots(updated);
      setAutoBackupNotice({ type: 'success', message: `Snapshot ${id} deleted.` });
    } catch (err: any) {
      setAutoBackupNotice({ type: 'error', message: err.message || 'Failed to delete snapshot.' });
    }
  };

  const handleRestoreSnapshot = async (id: string) => {
    if (!confirm(`RESTORE DATABASE WARNING: This will overwrite your current collection with snapshot "${id}". Continue?`)) return;
    setSnapshotRestoringId(id);
    setAutoBackupNotice(null);
    try {
      await restoreBackupSnapshot(id);
      setAutoBackupNotice({ type: 'success', message: `Database successfully restored from ${id}!` });
      if (onMediaImported) onMediaImported();
    } catch (err: any) {
      setAutoBackupNotice({ type: 'error', message: err.message || 'Restore failed.' });
    } finally {
      setSnapshotRestoringId(null);
    }
  };


  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchApiConfigs();
      setConfigs(data);
    } catch (err) {
      console.error('Error loading API configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.permissions || currentUser.permissions.canManageApiKeys !== false) {
      loadConfigs();
      loadCacheStats();
      loadAutoBackupData();
      loadVaultStoragePaths();
    }
  }, [currentUser]);

  if (currentUser?.permissions && currentUser.permissions.canManageApiKeys === false) {
    return (
      <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-w-2xl mx-auto text-center space-y-4 shadow-2xl my-12 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your user profile (<span className="text-cyan-400 font-bold">{currentUser.username}</span>) does not have permission to manage API keys or system configurations.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleEnable = (id: string) => {
    const updated = configs.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    setConfigs(updated);
    saveApiConfigs(updated);
  };

  const handleKeyChange = (id: string, apiKey: string) => {
    const updated = configs.map(c => c.id === id ? { ...c, apiKey } : c);
    setConfigs(updated);
  };

  const handleSaveKeys = async () => {
    try {
      await saveApiConfigs(configs);
      alert('API Key configurations saved successfully!');
    } catch (err) {
      alert('Failed to save API configurations.');
    }
  };

  const handleTestConnection = async (api: ApiConfig) => {
    setIsTesting(api.id);
    setTestResult(null);
    try {
      const res = await testApiConfig(api.type, api.apiKey || '', api.baseUrl);
      setTestResult({ id: api.id, message: res.message, success: res.success });
    } catch (err: any) {
      setTestResult({ id: api.id, message: `Test failed: ${err.message}`, success: false });
    } finally {
      setIsTesting(null);
    }
  };

  const handleAddCustomApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiName || !newApiUrl) return;

    const newConfig: ApiConfig = {
      id: `custom-api-${Date.now()}`,
      name: newApiName,
      type: 'custom',
      baseUrl: newApiUrl,
      apiKey: newApiKey,
      enabled: true,
      isPrimary: false
    };

    const updated = [...configs, newConfig];
    setConfigs(updated);
    saveApiConfigs(updated);

    setNewApiName('');
    setNewApiUrl('');
    setNewApiKey('');
    setShowAddModal(false);
  };

  const handleRemoveApi = (id: string) => {
    if (window.confirm('Are you sure you want to remove this API endpoint configuration?')) {
      const updated = configs.filter(c => c.id !== id);
      setConfigs(updated);
      saveApiConfigs(updated);
    }
  };

  // Import JSON Backup File
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        const res = await importVaultBackup(jsonData);
        if (res.success) {
          alert(`Successfully imported ${res.mediaCount} physical items into your Blu-Vault database!`);
          if (onMediaImported) onMediaImported();
        } else {
          alert(`Import failed: ${res.message}`);
        }
      } catch (err: any) {
        alert(`Failed to parse backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Import Vault-Only JSON File (Excludes users & settings)
  const handleVaultImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        const res = await importVaultOnlyJSON(jsonData);
        if (res.success) {
          alert(`Successfully imported ${res.mediaCount} vault items without modifying users or system settings!`);
          if (onMediaImported) onMediaImported();
        } else {
          alert(`Import failed: ${res.message}`);
        }
      } catch (err: any) {
        alert(`Failed to parse vault backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Import System-Only JSON File (Excludes media vault)
  const handleSystemImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        const res = await importSystemOnlyJSON(jsonData);
        if (res.success) {
          alert(`Successfully imported system settings and users!`);
          if (onRefreshUsers) onRefreshUsers();
        } else {
          alert(`Import failed: ${res.message}`);
        }
      } catch (err: any) {
        alert(`Failed to parse system backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const SETTINGS_TABS: TabItem[] = [
    { 
      id: 'api', 
      label: 'API Keys & Metadata', 
      badge: `${configs.length}`, 
      description: 'Configure TMDB & external providers', 
      icon: Key 
    },
    { 
      id: 'users', 
      label: 'Users & Permissions', 
      badge: users ? `${users.length}` : undefined, 
      description: 'Add or modify user profiles and permissions', 
      icon: Users 
    },
    { 
      id: 'branding', 
      label: 'Logo & Branding', 
      description: 'Customize header logo & title', 
      icon: Sparkles 
    },
    { 
      id: 'navigation', 
      label: 'Navigation & Menus', 
      description: 'Customize category items & filters', 
      icon: SlidersHorizontal 
    },
    { 
      id: 'currency', 
      label: 'Currency & Region', 
      badge: selectedCurrency, 
      description: 'Set vault pricing currency format', 
      icon: Coins 
    },
    { 
      id: 'data', 
      label: 'Database & Backup', 
      description: 'Export JSON/CSV or restore backup', 
      icon: Database 
    },
    { 
      id: 'system', 
      label: 'System & Power', 
      badge: currentUser?.role === 'admin' ? 'Admin' : undefined,
      description: 'Reboot, shutdown & factory reset', 
      icon: Server 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Settings Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">System Settings</h2>
            <p className="text-xs text-slate-400 font-mono">
              Manage API keys, visual branding, menu options, currency format, and server controls
            </p>
          </div>
        </div>
      </div>

      {/* TOP MENU BAR FOR SETTINGS PAGES */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2 shadow-xl backdrop-blur-md sticky top-2 z-30">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {SETTINGS_TABS.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <IconComponent className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                    isActive 
                      ? 'bg-white/20 text-white border border-white/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}

      {/* PAGE: USERS & PERMISSIONS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <UserManagementView
            users={users || []}
            currentUser={currentUser || null}
            onRefreshUsers={onRefreshUsers || (() => {})}
          />
        </div>
      )}

      {/* PAGE 1: API KEYS & METADATA PROVIDERS */}
      {activeTab === 'api' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" /> Configured Media Metadata Providers
                </h3>
                <p className="text-xs text-slate-400">TMDB API is the primary search engine for Blu-Vault</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom API</span>
                </button>

                <button
                  onClick={handleSaveKeys}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Save All Keys
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {configs.map((api) => (
                  <div
                    key={api.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      api.enabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{api.name}</h4>
                            {api.isPrimary && (
                              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-mono font-bold uppercase">
                                Primary API
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">{api.baseUrl}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnable(api.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            api.enabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{api.enabled ? 'Enabled' : 'Disabled'}</span>
                        </button>

                        <button
                          onClick={() => handleTestConnection(api)}
                          disabled={isTesting === api.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1"
                        >
                          {isTesting === api.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
                          <span>Test Connection</span>
                        </button>

                        {!api.isPrimary && (
                          <button
                            onClick={() => handleRemoveApi(api.id)}
                            className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
                            title="Remove API"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* API Key Input */}
                    <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder={`Enter ${api.name} API Key...`}
                          value={api.apiKey || ''}
                          onChange={(e) => handleKeyChange(api.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Test Result Message */}
                    {testResult && testResult.id === api.id && (
                      <div className={`mt-3 p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                        testResult.success ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-rose-950/50 text-rose-300 border border-rose-800'
                      }`}>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* METADATA & IMAGE CACHE SYSTEM CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-cyan-400" /> Metadata & Artwork Cache Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Local cache stores TMDB metadata & poster artwork to minimize external API calls and enable instant retrieval.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadCacheStats}
                  disabled={isCacheLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isCacheLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Stats</span>
                </button>
              </div>
            </div>

            {cacheNotice && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border animate-fade-in ${
                cacheNotice.type === 'success' 
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200' 
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
              }`}>
                <span>{cacheNotice.message}</span>
                <button onClick={() => setCacheNotice(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">Media Artwork Folders</span>
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {cacheStats ? cacheStats.totalDirs : 0} <span className="text-xs font-normal text-slate-500">directories</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {cacheStats ? `${cacheStats.movieDirs} Movies · ${cacheStats.tvDirs} TV Shows` : '0 Movies · 0 TV Shows'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">Cached Artwork Files</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {cacheStats ? cacheStats.imageCount : 0} <span className="text-xs font-normal text-slate-400">({cacheStats ? cacheStats.imageSizeMB : '0.00 MB'})</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Posters, backdrops & season art
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">API Metadata Cache</span>
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {cacheStats ? cacheStats.metadataCount : 0} <span className="text-xs font-normal text-slate-500">entries</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  TMDB searches & series details
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">Cache Directory Path</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 truncate font-mono" title={cacheStats?.cacheDir || `${configDirPath}/cache/`}>
                  {configDirPath}/cache/
                </div>
                <p className="text-[11px] text-slate-500 truncate" title={cacheStats?.cacheDir || ''}>
                  Dedicated subfolders for movies, TV & metadata
                </p>
              </div>
            </div>

            {/* In-App Confirmation Banner for Cache Clearing */}
            {cacheConfirmType && (
              <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-700/90 text-rose-100 text-xs font-medium space-y-3 animate-fade-in shadow-xl">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-white">
                      {cacheConfirmType === 'all' && 'Confirm Complete Cache Wipe?'}
                      {cacheConfirmType === 'metadata' && 'Confirm Metadata Cache Clear?'}
                      {cacheConfirmType === 'images' && 'Confirm Cached Artwork Deletion?'}
                    </div>
                    <p className="text-rose-200/90 text-xs mt-0.5">
                      {cacheConfirmType === 'all' && 'This will remove all TMDB cached queries, item info JSON files, downloaded posters, and season artwork from disk.'}
                      {cacheConfirmType === 'metadata' && 'This will clear in-memory and on-disk TMDB search results and item info descriptor files.'}
                      {cacheConfirmType === 'images' && 'This will delete all locally cached poster and backdrop images. Images will be re-downloaded or generated when requested.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleClearCache(cacheConfirmType)}
                    disabled={isClearingCache}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                  >
                    {isClearingCache ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Proceed & Wipe {cacheConfirmType === 'all' ? 'All Cache' : cacheConfirmType === 'metadata' ? 'Metadata' : 'Artwork'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCacheConfirmType(null)}
                    disabled={isClearingCache}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Preload Library Media Artwork</h4>
                <p className="text-[11px] text-slate-400">
                  Download posters and backdrops for all titles in your vault to ensure instant loading & offline capability.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePreloadImages}
                  disabled={isPreloadingImages || isClearingCache}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  {isPreloadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isPreloadingImages ? 'Preloading...' : 'Preload Artwork'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCacheConfirmType('metadata')}
                  disabled={isClearingCache || isPreloadingImages}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Clear API metadata cache and item info JSONs"
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Clear Metadata</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCacheConfirmType('images')}
                  disabled={isClearingCache || isPreloadingImages}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Clear cached image files only"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clear Artwork</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCacheConfirmType('all')}
                  disabled={isClearingCache || isPreloadingImages}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/80 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                  title="Completely wipe all metadata and image caches"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIDEO GAME METADATA INTEGRATIONS - GREYED OUT NON-FUNCTIONAL */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 space-y-3 opacity-60">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-400 line-through">Video Game Metadata Providers (IGDB / RAWG)</h3>
                <p className="text-xs text-slate-500 font-mono">Automatic game cover art and metadata lookups</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono font-bold">
                Feature not currently functional
              </span>
            </div>
            <p className="text-xs text-slate-500 italic">
              Video Game Library indexing is greyed out and currently non-functional in this release of Blu-Vault.
            </p>
          </div>
        </div>
      )}

      {/* PAGE 2: LOGO & VISUAL BRANDING */}
      {activeTab === 'branding' && (
        <div className="animate-fade-in">
          <LogoSelectorCard />
        </div>
      )}

      {/* PAGE 3: NAVIGATION & MENUS */}
      {activeTab === 'navigation' && (
        <div className="animate-fade-in">
          <NavigationSettingsSection />
        </div>
      )}

      {/* PAGE 4: CURRENCY & LOCALIZATION */}
      {activeTab === 'currency' && (
        <div className="animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" /> System Currency & Location Setting
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your region's currency for purchase prices, vault valuation, and analytics display across Blu-Vault.
                </p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
                <span>Sample Format:</span>
                <span className="text-white bg-slate-950 px-2 py-0.5 rounded border border-emerald-700/50">
                  {formatPrice(24.99, selectedCurrency)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
              {CURRENCY_OPTIONS.map((c) => {
                const isSelected = selectedCurrency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(c.code);
                      setSavedCurrencyCode(c.code);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                      isSelected
                        ? 'bg-gradient-to-tr from-emerald-950/90 to-slate-900 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/30 scale-[1.02]'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{c.flag}</span>
                      <span className={`font-mono text-xs font-extrabold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {c.symbol}
                      </span>
                    </div>
                    <div>
                      <div className="font-extrabold text-xs tracking-wide">{c.code}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 5: DATABASE & BACKUP */}
      {activeTab === 'data' && (
        <div className="space-y-6 animate-fade-in">
          {/* NOTICE BANNER */}
          {autoBackupNotice && (
            <div className={`p-4 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 ${
              autoBackupNotice.type === 'success' 
                ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800' 
                : 'bg-rose-950/80 text-rose-200 border border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>{autoBackupNotice.message}</span>
              </div>
              <button 
                onClick={() => setAutoBackupNotice(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VAULT CONFIG NOTICE BANNER */}
          {vaultConfigNotice && (
            <div className={`p-4 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 ${
              vaultConfigNotice.type === 'success' 
                ? 'bg-purple-950/80 text-purple-200 border border-purple-800' 
                : 'bg-rose-950/80 text-rose-200 border border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>{vaultConfigNotice.message}</span>
              </div>
              <button 
                onClick={() => setVaultConfigNotice(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* CARD 0: VAULT IDENTITY & STORAGE CONFIGURATION DIRECTORY */}
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-800/40 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    Vault Storage Location & Config Directory Path
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Centralized host/container directory where database JSON files, automatic snapshots, and artwork caches reside.
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 font-mono text-xs font-bold flex items-center gap-2">
                <span>Active Path:</span>
                <span className="text-white bg-slate-950 px-2 py-0.5 rounded border border-purple-700/50">
                  {systemPathsInfo?.configDirPath || configDirPath || '/config'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveVaultConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Vault Instance Name
                  </label>
                  <input
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="e.g. Blu-Vault Primary"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Physical Vault Location
                  </label>
                  <input
                    type="text"
                    value={vaultLocation}
                    onChange={(e) => setVaultLocation(e.target.value)}
                    placeholder="e.g. Living Room / Basement Rack"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Config & Database Directory Path
                  </label>
                  <input
                    type="text"
                    value={configDirPath}
                    onChange={(e) => setConfigDirPath(e.target.value)}
                    placeholder="e.g. /config or data/"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-purple-300 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                  <span className="truncate">DB: <span className="text-indigo-300">{systemPathsInfo?.systemDbPath || `${configDirPath}/bluvault-system.json`}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                  <span className="truncate">Backups: <span className="text-cyan-300">{systemPathsInfo?.backupsDirPath || `${configDirPath}/backups/`}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                  <span className="truncate">Cache: <span className="text-purple-300">{systemPathsInfo?.cacheDirPath || `${configDirPath}/cache/`}</span></span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-400">
                  Changing the config directory will automatically migrate existing database files to the new location.
                </p>
                <button
                  type="submit"
                  disabled={isSavingVaultConfig}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 shrink-0"
                >
                  {isSavingVaultConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSavingVaultConfig ? 'Updating Storage Paths...' : 'Save Storage Configuration'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD 1: MANUAL EXPORT & RESTORE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-cyan-400" /> Segmented Database Backup & Migration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Blu-Vault stores application configuration (<span className="text-cyan-400 font-mono">bluvault-system.json</span>) separately from your media library (<span className="text-cyan-400 font-mono">bluvault-vault.json</span>). This allows clean vault migration between different systems without touching user accounts or server settings.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={exportVaultOnlyJSON}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                title="Export only media items without users or settings"
              >
                <Layers className="w-4 h-4" />
                <span>Export Vault Only (JSON)</span>
              </button>

              <button
                onClick={exportVaultBackup}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                title="Export full database snapshot including users and settings"
              >
                <Download className="w-4 h-4" />
                <span>Export Full DB (JSON)</span>
              </button>

              <button
                onClick={exportCollectionCSV}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Collection (CSV)</span>
              </button>

              <button
                onClick={() => vaultFileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-800/60 transition-all flex items-center gap-2"
                title="Import vault items without changing target users or system settings"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Import Vault Only</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Restore Full Backup</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportFileChange}
                className="hidden"
              />

              <input
                type="file"
                ref={vaultFileInputRef}
                accept=".json"
                onChange={handleVaultImportFileChange}
                className="hidden"
              />

              <input
                type="file"
                ref={systemFileInputRef}
                accept=".json"
                onChange={handleSystemImportFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* CARD 1B: LIVE SEGMENTED DATABASE FILES STATUS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" /> Active Database Files on Disk
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Blu-Vault operates using two distinct JSON files stored in the <span className="text-cyan-400 font-mono">/data</span> directory:
                </p>
              </div>
              <button
                onClick={loadAutoBackupData}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Refresh File Info</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SYSTEM DB CARD */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white font-mono">bluvault-system.json</div>
                      <div className="text-[10px] text-slate-400">System, Users & Settings Database</div>
                    </div>
                  </div>
                  {dbStatus?.systemDb?.exists !== false ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active / Online
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      Offline
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800/80">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">Location:</span>
                    <span className="font-mono text-indigo-300 truncate max-w-[200px]" title={systemPathsInfo?.systemDbPath || `${configDirPath}/bluvault-system.json`}>
                      {systemPathsInfo?.systemDbPath || `${configDirPath}/bluvault-system.json`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">Contents:</span>
                    <span className="font-bold text-white">
                      {dbStatus ? `${dbStatus.systemDb.userCount} User(s) • ${dbStatus.systemDb.apiConfigCount} API Key(s)` : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">File Size:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {dbStatus?.systemDb?.sizeBytes ? `${(dbStatus.systemDb.sizeBytes / 1024).toFixed(2)} KB` : 'Active on Disk'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportSystemOnlyJSON}
                    className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => systemFileInputRef.current?.click()}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>

              {/* VAULT DB CARD */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white font-mono">bluvault-vault.json</div>
                      <div className="text-[10px] text-slate-400">Media Library & Collection Database</div>
                    </div>
                  </div>
                  {dbStatus?.vaultDb?.exists !== false ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active / Online
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      Offline
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800/80">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">Location:</span>
                    <span className="font-mono text-cyan-300 truncate max-w-[200px]" title={systemPathsInfo?.vaultDbPath || `${configDirPath}/bluvault-vault.json`}>
                      {systemPathsInfo?.vaultDbPath || `${configDirPath}/bluvault-vault.json`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">Contents:</span>
                    <span className="font-bold text-white">
                      {dbStatus ? `${dbStatus.vaultDb.mediaCount} Media Item(s)` : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500 font-mono">File Size:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {dbStatus?.vaultDb?.sizeBytes ? `${(dbStatus.vaultDb.sizeBytes / 1024).toFixed(2)} KB` : 'Active on Disk'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportVaultOnlyJSON}
                    className="py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => vaultFileInputRef.current?.click()}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: AUTOMATED BACKUP SCHEDULE & SETTINGS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" /> Automated Database Backup System
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure automatic background snapshots, retention policies, and interval triggers to keep your media vault safe.
                </p>
              </div>

              {/* ENABLED BADGE */}
              <div className="self-start sm:self-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                  autoBackupConfig.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${autoBackupConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {autoBackupConfig.enabled ? 'Automated Backups Active' : 'Automated Backups Disabled'}
                </span>
              </div>
            </div>

            {/* STATUS STATS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <History className="w-3.5 h-3.5 text-cyan-400" /> Last Auto-Backup
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {autoBackupConfig.lastBackupAt ? new Date(autoBackupConfig.lastBackupAt).toLocaleString() : 'Never run yet'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Next Backup Run
                </div>
                <div className="text-xs font-bold text-amber-300 truncate">
                  {autoBackupConfig.nextBackupAt ? new Date(autoBackupConfig.nextBackupAt).toLocaleString() : 'Scheduled on trigger'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <FileJson className="w-3.5 h-3.5 text-emerald-400" /> Snapshots Saved
                </div>
                <div className="text-xs font-bold text-emerald-300">
                  {backupSnapshots.length} Files stored
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Vault Location
                </div>
                <div className="text-xs font-mono font-bold text-purple-300 truncate" title={autoBackupConfig.backupLocation}>
                  {autoBackupConfig.backupLocation || '/data/backups/'}
                </div>
              </div>
            </div>

            {/* CONFIGURATION FORM */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">Enable Automatic Scheduled Backups</div>
                  <div className="text-[11px] text-slate-400">Automatically creates database snapshots on the server</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoBackupConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                    autoBackupConfig.enabled ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    autoBackupConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* FREQUENCY */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Backup Frequency
                  </label>
                  <select
                    value={autoBackupConfig.frequency}
                    onChange={(e) => setAutoBackupConfig(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="daily">Daily (Every 24 Hours)</option>
                    <option value="weekly">Weekly (Every 7 Days)</option>
                    <option value="every_12h">Every 12 Hours</option>
                    <option value="every_6h">Every 6 Hours</option>
                  </select>
                </div>

                {/* BACKUP TIME */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Preferred Execution Time
                  </label>
                  <input
                    type="time"
                    value={autoBackupConfig.backupTime || '02:00'}
                    onChange={(e) => setAutoBackupConfig(prev => ({ ...prev, backupTime: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                {/* RETENTION COUNT */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Retention Limit
                  </label>
                  <select
                    value={autoBackupConfig.retentionCount}
                    onChange={(e) => setAutoBackupConfig(prev => ({ ...prev, retentionCount: parseInt(e.target.value, 10) }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value={5}>Keep Last 5 Backups</option>
                    <option value={10}>Keep Last 10 Backups</option>
                    <option value={20}>Keep Last 20 Backups</option>
                    <option value={30}>Keep Last 30 Backups</option>
                    <option value={50}>Keep Last 50 Backups</option>
                  </select>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveAutoBackupSettings}
                  disabled={isSavingAutoBackup}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingAutoBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  ) : (
                    <Save className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Save Backup Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerBackupNow}
                  disabled={isTriggeringBackup}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isTriggeringBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                  ) : (
                    <Play className="w-4 h-4 text-cyan-200" />
                  )}
                  <span>Trigger Immediate Backup Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: AUTOMATED SNAPSHOTS HISTORY & MANAGEMENT */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" /> Vault Backup Snapshots History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Browse stored database snapshots. You can download JSON files or restore your collection with one click.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs font-bold">
                {backupSnapshots.length} Snapshots
              </span>
            </div>

            {backupSnapshots.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
                <FileJson className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No automated backup snapshots created yet.</p>
                <button
                  onClick={handleTriggerBackupNow}
                  className="text-xs font-bold text-cyan-400 hover:underline"
                >
                  Create first snapshot now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {backupSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 shrink-0">
                        <FileJson className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{snap.filename}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{new Date(snap.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-cyan-300">{snap.mediaCount} Media Items</span>
                          <span>•</span>
                          <span>{(snap.sizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadBackupSnapshot(snap.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
                        title="Download JSON Snapshot"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap.id)}
                        disabled={snapshotRestoringId === snap.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        title="Restore Database from this Snapshot"
                      >
                        {snapshotRestoringId === snap.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/50 border border-rose-900/40 transition-colors"
                        title="Delete Snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD 4: SIMPLE UPDATING GUIDE */}
          <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-cyan-800/50 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  Updating Blu-Vault Made Simple
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Updating Blu-Vault is straightforward because all application data is stored in just two JSON files located in the <span className="font-mono text-cyan-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-900/50">/data</span> folder:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-900/40 space-y-1">
                <div className="font-extrabold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Server className="w-4 h-4 text-indigo-400" />
                  1. bluvault-system.json
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Contains all user accounts, password hashes, permissions, and TMDB/API configurations.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-900/40 space-y-1">
                <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  2. bluvault-vault.json
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Contains your physical media library, TV seasons, loan tracking records, and wishlist.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
              <div className="font-extrabold text-white flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> Safe Update Instructions
              </div>
              <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                <li><strong className="text-white">Docker / Container Volume:</strong> Keep <code className="text-cyan-300 font-mono">/data</code> mapped to a persistent host directory. When pulling or deploying a new container image, your 2 DB files remain untouched.</li>
                <li><strong className="text-white">Git / Source Code:</strong> Replace or update the application files without deleting or overwriting the <code className="text-cyan-300 font-mono">/data</code> folder.</li>
                <li><strong className="text-white">Manual Backup:</strong> Download both DB files before performing an update for complete peace of mind!</li>
              </ul>
            </div>
          </div>
        </div>
      )}


      {/* PAGE 6: SYSTEM & POWER CONTROLS */}
      {activeTab === 'system' && (
        <div className="animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">System Power Controls & Management</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                    Administrator
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Manage the server runtime instance, restart service processes, power off system, or execute factory resets.
                </p>
              </div>
            </div>

            {powerStatusMessage && (
              <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{powerStatusMessage}</span>
                </div>
                <button
                  onClick={() => setPowerStatusMessage(null)}
                  className="px-3 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-100 text-[11px] font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {(!currentUser || currentUser.role === 'admin') ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* RESTART SYSTEM BUTTON */}
                <button
                  onClick={() => {
                    setResetPassword('');
                    setResetError('');
                    setActionTarget('restart');
                    setResetStep('password');
                  }}
                  className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-amber-400">SOFT REBOOT</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white group-hover:text-amber-300">System Restart</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Reboots the Express backend runtime service.</p>
                  </div>
                </button>

                {/* POWER OFF BUTTON */}
                <button
                  onClick={() => {
                    setResetPassword('');
                    setResetError('');
                    setActionTarget('poweroff');
                    setResetStep('password');
                  }}
                  className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/50 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-slate-950 transition-colors">
                      <Power className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-rose-400">SHUTDOWN</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white group-hover:text-rose-300">System Power Off</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Safely shuts down the Blu-Vault service process.</p>
                  </div>
                </button>

                {/* FACTORY RESET BUTTON */}
                <button
                  onClick={() => {
                    setResetPassword('');
                    setResetError('');
                    setActionTarget('reset');
                    setResetStep('password');
                  }}
                  className="p-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 hover:border-rose-500/80 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-rose-400/80">WIPE DB</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-rose-200 group-hover:text-white">Factory Reset System</h4>
                    <p className="text-[11px] text-rose-300/70 mt-0.5">Clears database and returns to OOBE setup.</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                ⚠️ Only Administrator accounts have authorization to execute system power management or factory resets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: PASSWORD CONFIRMATION MODAL */}
      {resetStep === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">
                  {actionTarget === 'restart' && 'Authorize System Restart'}
                  {actionTarget === 'poweroff' && 'Authorize System Power Off'}
                  {actionTarget === 'reset' && 'Authorize Factory System Reset'}
                </h3>
              </div>
              <button onClick={() => setResetStep('closed')} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {actionTarget === 'restart' && 'Please confirm your Administrator password to initiate a server system restart.'}
              {actionTarget === 'poweroff' && 'Please confirm your Administrator password to initiate a system power shutdown.'}
              {actionTarget === 'reset' && 'To prevent accidental database wiping, please enter your Administrator password.'}
            </p>

            {resetError && (
              <div className="p-3 bg-rose-950 border border-rose-800 text-rose-200 rounded-xl text-xs font-medium">
                ⚠️ {resetError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resetPassword.trim()) {
                  setResetError('Password is required.');
                  return;
                }
                setResetError('');
                setResetStep('final_confirm');
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetStep('closed')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition-all"
                >
                  Verify Password →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STEP 2: FINAL CONFIRMATION MODAL */}
      {resetStep === 'final_confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {actionTarget === 'restart' && <RotateCcw className="w-7 h-7" />}
                {actionTarget === 'poweroff' && <Power className="w-7 h-7" />}
                {actionTarget === 'reset' && <ShieldAlert className="w-7 h-7 text-rose-400" />}
              </div>
              <div>
                <h3 className="font-black text-lg text-white tracking-wide">
                  {actionTarget === 'restart' && 'CONFIRM SYSTEM RESTART'}
                  {actionTarget === 'poweroff' && 'CONFIRM SYSTEM POWER OFF'}
                  {actionTarget === 'reset' && 'FINAL SYSTEM RESET CONFIRMATION'}
                </h3>
                <p className="text-xs text-amber-400/80 font-mono">Administrator Command Execution</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs text-slate-200">
              {actionTarget === 'restart' && (
                <>
                  <p className="font-extrabold text-amber-300 text-sm">
                    ⚠️ System Service Restart
                  </p>
                  <p className="text-slate-300">
                    This will safely restart the Express backend service. Active web requests may pause briefly for 2-3 seconds while the process reboots.
                  </p>
                </>
              )}

              {actionTarget === 'poweroff' && (
                <>
                  <p className="font-extrabold text-rose-300 text-sm">
                    🛑 System Power Shutdown
                  </p>
                  <p className="text-slate-300">
                    This will terminate the Blu-Vault service process. You will need to start the container server again to access the library.
                  </p>
                </>
              )}

              {actionTarget === 'reset' && (
                <>
                  <p className="font-extrabold text-rose-300 text-sm">
                    ⚠️ WARNING: This will permanently erase everything!
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pt-1 font-mono">
                    <li>All physical movies, 4K UHDs, DVDs, and TV series entries</li>
                    <li>All loan tracking history and borrowers</li>
                    <li>All custom user profiles and passwords</li>
                    <li>All saved custom API key configurations</li>
                  </ul>
                  <p className="pt-2 text-rose-300 text-[11px] font-bold">
                    Blu-Vault will immediately return to the Out-Of-Box Setup screen.
                  </p>
                </>
              )}
            </div>

            {resetError && (
              <div className="p-3 bg-rose-950 border border-rose-800 text-rose-200 rounded-xl text-xs font-medium">
                ⚠️ {resetError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setResetStep('closed')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Cancel Action
              </button>

              <button
                type="button"
                disabled={isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  setResetError('');
                  try {
                    const authUser = currentUser?.id || currentUser?.username || 'usr-1';
                    if (actionTarget === 'restart') {
                      const res = await restartSystem(authUser, resetPassword);
                      setPowerStatusMessage(res?.message || 'Blu-Vault service restart completed. Database state and caches refreshed.');
                      setResetStep('closed');
                      setIsResetting(false);
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    } else if (actionTarget === 'poweroff') {
                      const res = await powerOffSystem(authUser, resetPassword);
                      setPowerStatusMessage(res?.message || 'Blu-Vault service is in standby mode.');
                      setResetStep('closed');
                      setIsResetting(false);
                    } else if (actionTarget === 'reset') {
                      await resetSystemToDefault(authUser, resetPassword);
                      if (onSystemReset) {
                        onSystemReset();
                      } else {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }
                  } catch (err: any) {
                    setResetError(err.message || 'Failed to execute system command');
                    setIsResetting(false);
                  }
                }}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                  actionTarget === 'restart'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50'
                    : 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 shadow-rose-900/50'
                }`}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Command...</span>
                  </>
                ) : (
                  <>
                    {actionTarget === 'restart' && <RotateCcw className="w-4 h-4" />}
                    {actionTarget === 'poweroff' && <Power className="w-4 h-4" />}
                    {actionTarget === 'reset' && <AlertTriangle className="w-4 h-4" />}
                    <span>
                      {actionTarget === 'restart' && 'RESTART SYSTEM NOW'}
                      {actionTarget === 'poweroff' && 'POWER OFF SYSTEM NOW'}
                      {actionTarget === 'reset' && 'PERMANENTLY RESET SYSTEM'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POWER OFF / RESTART OVERLAY MESSAGE */}
      {powerStatusMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
              <Server className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-xl text-white">System Power Command</h3>
            <p className="text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              {powerStatusMessage}
            </p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Reconnect / Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM API MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-extrabold text-lg text-white">Add Custom Access API</h3>
            
            <form onSubmit={handleAddCustomApi} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">API Provider Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom Barcode Service"
                  value={newApiName}
                  onChange={(e) => setNewApiName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Base Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/v1"
                  value={newApiUrl}
                  onChange={(e) => setNewApiUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">API Key (Optional)</label>
                <input
                  type="text"
                  placeholder="Secret key..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Add API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

