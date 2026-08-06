import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, RefreshCw, Plus, Trash2, Power, Globe, Download, Upload, ShieldCheck, Loader2, AlertTriangle, Lock, ShieldAlert, X, Eye, EyeOff, RotateCcw, Server, Coins } from 'lucide-react';
import { ApiConfig, User } from '../types';
import { fetchApiConfigs, saveApiConfigs, testApiConfig, exportVaultBackup, importVaultBackup, resetSystemToDefault, restartSystem, powerOffSystem } from '../lib/api';
import { CURRENCY_OPTIONS, getSavedCurrencyCode, setSavedCurrencyCode, formatPrice } from '../lib/currency';
import { NavigationSettingsSection } from './NavigationSettingsSection';
import { LogoSelectorCard } from './LogoIcon';

interface ApiSettingsViewProps {
  currentUser?: User | null;
  onMediaImported?: () => void;
  onSystemReset?: () => void;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({ currentUser, onMediaImported, onSystemReset }) => {

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

  // Import JSON File ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">API Keys & External Services</h2>
            <p className="text-xs text-slate-400 font-mono">
              Configure TMDB API v3 key, add/remove custom APIs, or manage database backups
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Custom API</span>
        </button>
      </div>

      {/* API LIST SECTION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-white">Configured Media Metadata Providers</h3>
            <p className="text-xs text-slate-400">TMDB API is the primary search engine for Blu-Vault</p>
          </div>

          <button
            onClick={handleSaveKeys}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Save All Keys
          </button>
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

      {/* BLU-VAULT LOGO BRANDING CUSTOMIZER */}
      <LogoSelectorCard />

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

      {/* NAVIGATION & HAMBURGER MENU CUSTOMIZER */}
      <NavigationSettingsSection />

      {/* CURRENCY & LOCALIZATION SETTINGS */}
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

      {/* DATABASE BACKUP & EXPORT/IMPORT SECTION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="font-extrabold text-base text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" /> Database Backup & Migration
        </h3>
        <p className="text-xs text-slate-400">
          Export your entire Blu-Vault database (movies, TV shows, box sets, shelf locations, loans) as a JSON file or restore a backup.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={exportVaultBackup}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Database (JSON)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Restore Backup File</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* SYSTEM POWER CONTROLS & FACTORY RESET SECTION (ADMIN ONLY) */}
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
                      await restartSystem(authUser, resetPassword);
                      setPowerStatusMessage('System restart initiated! Rebooting Blu-Vault service...');
                      setResetStep('closed');
                      setTimeout(() => {
                        window.location.reload();
                      }, 2500);
                    } else if (actionTarget === 'poweroff') {
                      await powerOffSystem(authUser, resetPassword);
                      setPowerStatusMessage('System has been powered off. Service is offline.');
                      setResetStep('closed');
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
