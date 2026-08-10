import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Sparkles, 
  Check, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Server, 
  Globe,
  Coins,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Key,
  RefreshCw,
  AlertCircle,
  Upload,
  Database,
  FileJson,
  FolderUp,
  HardDrive,
  Users,
  Film,
  Folder
} from 'lucide-react';
import { submitOobeSetup, saveApiConfigs, testApiConfig, importVaultBackup, saveAutoBackupConfig, getSavedConfigDirPath, saveSystemConfigPath } from '../lib/api';
import { 
  LOCATION_OPTIONS, 
  CURRENCY_OPTIONS, 
  getSavedCurrencyCode, 
  getSavedLocationCode, 
  setSavedCurrencyCode, 
  setSavedLocationCode,
  formatPrice 
} from '../lib/currency';
import { getSavedNavItems, saveNavItems } from '../lib/navConfig';
import { NavigationSettingsSection } from './NavigationSettingsSection';
import { LogoIcon } from './LogoIcon';

interface OobeSetupViewProps {
  onCompleteOobe: () => void;
}

export const OobeSetupView: React.FC<OobeSetupViewProps> = ({ onCompleteOobe }) => {
  // Mode selection: 'choice' = asking Clean vs Restore, 'clean' = standard 1-4 step wizard, 'restore' = backup restoration
  const [setupMode, setSetupMode] = useState<'choice' | 'clean' | 'restore'>('choice');

  // Setup Step in Clean mode: 1 = Admin Account, 2 = TMDB API Key (Mandatory), 3 = Region & Currency, 4 = Hamburger Menu
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 State: Admin Credentials
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState('🛡️');
  const [error, setError] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isAdminCreated, setIsAdminCreated] = useState(false);

  // Step 2 State: TMDB API Key (Required)
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Step 3 State: Location & Currency & Automated Backup & Docker Config Path
  const [selectedLocation, setSelectedLocation] = useState(getSavedLocationCode());
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrencyCode());
  const [enableAutoBackup, setEnableAutoBackup] = useState(false);
  const [configDirPath, setConfigDirPath] = useState(getSavedConfigDirPath());

  // Final completion state for clean setup
  const [isFinishing, setIsFinishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Restore State
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupJsonText, setBackupJsonText] = useState<string>('');
  const [backupPreview, setBackupPreview] = useState<{
    mediaCount: number;
    userCount: number;
    apiCount: number;
    rawJson: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const EMOJI_AVATARS = ['🛡️', '🎬', '📺', '🍿', '📀', '🎮', '⭐', '🚀', '👾', '🎧'];

  // Process uploaded backup file
  const handleFileChange = (file: File) => {
    setRestoreError('');
    setBackupFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setBackupJsonText(content);
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format');
        }
        const mediaCount = Array.isArray(parsed.media) ? parsed.media.length : 0;
        const userCount = Array.isArray(parsed.users) ? parsed.users.length : 0;
        const apiCount = Array.isArray(parsed.apiConfigs) ? parsed.apiConfigs.length : 0;

        setBackupPreview({
          mediaCount,
          userCount,
          apiCount,
          rawJson: content
        });
      } catch (err: any) {
        setRestoreError('Invalid backup file structure. Please select a valid Blu-Vault JSON backup file.');
        setBackupPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonTextChange = (text: string) => {
    setBackupJsonText(text);
    setRestoreError('');
    if (!text.trim()) {
      setBackupPreview(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        const mediaCount = Array.isArray(parsed.media) ? parsed.media.length : 0;
        const userCount = Array.isArray(parsed.users) ? parsed.users.length : 0;
        const apiCount = Array.isArray(parsed.apiConfigs) ? parsed.apiConfigs.length : 0;

        setBackupPreview({
          mediaCount,
          userCount,
          apiCount,
          rawJson: text
        });
      }
    } catch {
      setBackupPreview(null);
    }
  };

  const handleExecuteRestore = async () => {
    const rawToImport = backupPreview ? backupPreview.rawJson : backupJsonText.trim();
    if (!rawToImport) {
      setRestoreError('Please select a backup file or paste JSON content first.');
      return;
    }

    setIsRestoring(true);
    setRestoreError('');
    try {
      const res = await importVaultBackup(rawToImport);
      if (!res.success) {
        throw new Error(res.message || 'Failed to restore database');
      }
      setRestoreSuccess(res.message || 'Database restored successfully!');
    } catch (err: any) {
      setRestoreError(err.message || 'Error restoring database from backup file.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Step 1: Admin account submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      if (!isAdminCreated) {
        await submitOobeSetup(username.trim(), password, avatar);
        setIsAdminCreated(true);
      }
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to create server administrator credentials.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Handle Step 2: TMDB Key Submit
  const handleTmdbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tmdbApiKey.trim()) {
      setError('TMDB API Key is required and cannot be skipped.');
      return;
    }

    try {
      await saveApiConfigs([
        {
          id: 'tmdb',
          name: 'The Movie Database (TMDB)',
          type: 'tmdb',
          baseUrl: 'https://api.themoviedb.org/3',
          apiKey: tmdbApiKey.trim(),
          enabled: true,
          isPrimary: true
        }
      ]);
      
      const navs = getSavedNavItems().map(item => item.group === 'games' ? { ...item, hidden: true } : item);
      saveNavItems(navs);

      setCurrentStep(3);
    } catch (err: any) {
      setError('Failed to save TMDB API Key. Please try again.');
    }
  };

  const handleTestTmdbKey = async () => {
    if (!tmdbApiKey.trim()) {
      setKeyTestStatus({ success: false, message: 'Please enter an API Key first.' });
      return;
    }
    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      const res = await testApiConfig('tmdb', tmdbApiKey.trim(), 'https://api.themoviedb.org/3');
      setKeyTestStatus({ success: res.success, message: res.message });
    } catch (err: any) {
      setKeyTestStatus({ success: false, message: 'Connection test failed.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleLocationSelect = (locCode: string) => {
    setSelectedLocation(locCode);
    const locObj = LOCATION_OPTIONS.find(l => l.code === locCode);
    if (locObj) {
      setSelectedCurrency(locObj.defaultCurrency);
    }
  };

  const saveRegionSettings = () => {
    setSavedLocationCode(selectedLocation);
    setSavedCurrencyCode(selectedCurrency);
    saveSystemConfigPath(configDirPath).catch(() => {});
    saveAutoBackupConfig({ enabled: enableAutoBackup }).catch(() => {});
  };

  const handleNextToMenu = () => {
    saveRegionSettings();
    setCurrentStep(4);
  };

  const handleFinishOobe = (skippedMenu: boolean = false) => {
    setIsFinishing(true);
    saveRegionSettings();
    setSuccessMessage(
      skippedMenu 
        ? 'System setup complete! Video game library automatically greyed out.' 
        : 'Out-Of-Box Setup & custom menu settings successfully saved!'
    );

    setTimeout(() => {
      onCompleteOobe();
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className={`w-full ${
        setupMode === 'choice' 
          ? 'max-w-3xl' 
          : setupMode === 'restore'
            ? 'max-w-2xl'
            : currentStep === 1 
              ? 'max-w-2xl' 
              : currentStep === 2 
                ? 'max-w-2xl' 
                : currentStep === 3 
                  ? 'max-w-3xl' 
                  : 'max-w-5xl'
      } bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden my-auto animate-fade-in transition-all duration-300`}>
        
        {/* Banner Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-900/40 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> Out-Of-Box Setup (OOBE)
            </span>

            {/* Mode & Step Indicators */}
            {setupMode === 'choice' && (
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold border border-indigo-500/30">
                Setup Option
              </span>
            )}

            {setupMode === 'restore' && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Restore Database
              </span>
            )}

            {setupMode === 'clean' && (
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${
                  currentStep === 1 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  1. Admin
                </span>
                <span className="text-slate-600 font-bold">•</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${
                  currentStep === 2 
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  2. TMDB Key *
                </span>
                <span className="text-slate-600 font-bold">•</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${
                  currentStep === 3 
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  3. Currency
                </span>
                <span className="text-slate-600 font-bold">•</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border ${
                  currentStep === 4 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  4. Menu
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <LogoIcon size="lg" animated />
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Welcome to Blu-Vault</h1>
              <p className="text-xs text-slate-300">
                {setupMode === 'choice' && 'System Initialization: Choose Fresh Setup or Restore Backup'}
                {setupMode === 'restore' && 'Restore Library Collection & Accounts from JSON Backup File'}
                {setupMode === 'clean' && currentStep === 1 && 'Step 1: Create Master Administrator Account'}
                {setupMode === 'clean' && currentStep === 2 && 'Step 2: Enter Required TMDB API Key (Mandatory)'}
                {setupMode === 'clean' && currentStep === 3 && 'Step 3: Geographic Location & Currency Setting'}
                {setupMode === 'clean' && currentStep === 4 && 'Step 4: Hamburger Navigation Menu Customization'}
              </p>
            </div>
          </div>
        </div>

        {/* Form / Body Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* INITIAL MODE CHOICE PAGE */}
          {setupMode === 'choice' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <h2 className="text-lg font-extrabold text-white">How would you like to set up Blu-Vault?</h2>
                <p className="text-xs text-slate-400">
                  You can start with a clean installation or restore an existing collection from a database backup file.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* CHOICE 1: CLEAN SETUP */}
                <button
                  type="button"
                  onClick={() => {
                    setSetupMode('clean');
                    setCurrentStep(1);
                  }}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-950/60 transition-all text-left flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">Start Clean Setup</h3>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                          Fresh Install
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        Initialize a clean database, create a new Master Administrator account, set your TMDB API Key, configure country & currency, and customize menus step-by-step.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-900/40 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                    <span>Create User & Password</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* CHOICE 2: RESTORE BACKUP */}
                <button
                  type="button"
                  onClick={() => setSetupMode('restore')}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-950/60 transition-all text-left flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                      <FolderUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">Restore from Database Backup</h3>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                          Database Restore
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        Already have a Blu-Vault database backup file (<code className="text-emerald-300">.json</code>)? Upload or paste it to restore all physical media, user accounts, and API configurations.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                    <span>Upload & Restore Database</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* RESTORE FROM BACKUP VIEW */}
          {setupMode === 'restore' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-emerald-950/40 border border-emerald-800/50 p-4 rounded-2xl text-xs text-emerald-200 leading-relaxed flex items-start gap-3">
                <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Restore Blu-Vault System from Backup JSON</span>
                  Select or drag a <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800 font-mono">bluvault-backup.json</code> file to restore your saved physical media collection, user accounts, and configuration settings.
                </div>
              </div>

              {restoreError && (
                <div className="bg-rose-950/80 border border-rose-800 p-3.5 rounded-2xl text-xs text-rose-200 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSuccess ? (
                <div className="bg-emerald-950/80 border border-emerald-800 p-8 rounded-2xl text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl border border-emerald-500/30">
                    <Check className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Database Restoration Complete!</h3>
                    <p className="text-xs text-emerald-200 font-mono mt-1">{restoreSuccess}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCompleteOobe()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Launch Blu-Vault Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Drag & Drop / File Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Select Backup JSON File</label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/80 rounded-2xl p-6 text-center transition-all">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-extrabold text-slate-200">
                        {backupFile ? backupFile.name : 'Click to select or drag & drop backup JSON file'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        Supports standard Blu-Vault backup files (.json)
                      </p>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                        className="mt-3 block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Or Paste JSON Text */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-400 block flex items-center justify-between">
                      <span>Or Paste Backup JSON Raw Text:</span>
                      {backupJsonText && (
                        <button
                          type="button"
                          onClick={() => {
                            setBackupJsonText('');
                            setBackupFile(null);
                            setBackupPreview(null);
                          }}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Clear Text
                        </button>
                      )}
                    </label>
                    <textarea
                      rows={4}
                      value={backupJsonText}
                      onChange={(e) => handleJsonTextChange(e.target.value)}
                      placeholder='{"media": [...], "users": [...], "apiConfigs": [...]}'
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white font-mono focus:outline-none custom-scrollbar"
                    />
                  </div>

                  {/* Backup Preview Info */}
                  {backupPreview && (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-3 animate-fade-in">
                      <h4 className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileJson className="w-4 h-4" /> Detected Backup Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                          <Film className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                          <div className="text-lg font-black text-white">{backupPreview.mediaCount}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Media Items</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                          <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <div className="text-lg font-black text-white">{backupPreview.userCount}</div>
                          <div className="text-[10px] text-slate-400 font-mono">User Accounts</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                          <Key className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                          <div className="text-lg font-black text-white">{backupPreview.apiCount}</div>
                          <div className="text-[10px] text-slate-400 font-mono">API Keys</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSetupMode('choice')}
                      className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Options</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring || (!backupPreview && !backupJsonText.trim())}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restoring Database...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-200" />
                          <span>Confirm & Restore Database</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CLEAN SETUP WIZARD (STEPS 1 - 4) */}
          {setupMode === 'clean' && (
            <>
              {error && (
                <div className="bg-rose-950/80 border border-rose-800 p-3.5 rounded-2xl text-xs text-rose-200 font-medium">
                  ⚠️ {error}
                </div>
              )}

              {successMessage ? (
                <div className="bg-emerald-950/80 border border-emerald-800 p-8 rounded-2xl text-center space-y-3 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-white text-lg">System Initialization Complete!</h3>
                  <p className="text-xs text-emerald-200 font-mono">{successMessage}</p>
                  <p className="text-[11px] text-slate-400 pt-2">Launching Blu-Vault Login Screen...</p>
                </div>
              ) : (
                <>
                  {/* STEP 1: ADMIN ACCOUNT CREATION */}
                  {currentStep === 1 && (
                    <form onSubmit={handleAdminSubmit} className="space-y-5">
                      <div className="flex items-center justify-between pb-1">
                        <button
                          type="button"
                          onClick={() => setSetupMode('choice')}
                          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Switch to Restore from Backup instead</span>
                        </button>
                      </div>

                      <div className="bg-indigo-950/40 border border-indigo-800/50 p-4 rounded-2xl text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
                        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-white block">Step 1: Set Up Master Administrator</span>
                          No accounts exist on this system yet. Create your Master Admin account to claim ownership and manage media collections.
                        </div>
                      </div>

                      {/* Username Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-cyan-400" /> Master Username *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. admin or VaultMaster"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                        />
                      </div>

                      {/* Password & Confirm Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Master Password *
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                            </button>
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={4}
                            placeholder="Enter password..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-cyan-400" /> Confirm Password *
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={4}
                            placeholder="Confirm password..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono transition-all"
                          />
                        </div>
                      </div>

                      {/* Avatar Selector */}
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">Choose Avatar Icon</label>
                        <div className="flex flex-wrap gap-2">
                          {EMOJI_AVATARS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setAvatar(emoji)}
                              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                                avatar === emoji
                                  ? 'bg-cyan-500 text-slate-950 font-bold scale-110 shadow-lg shadow-cyan-500/30'
                                  : 'bg-slate-950 border border-slate-800 hover:bg-slate-800'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingAdmin}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                      >
                        {isSubmittingAdmin ? (
                          <span>Creating Administrator Account...</span>
                        ) : (
                          <>
                            <span>Continue to TMDB API Key Setup</span>
                            <ArrowRight className="w-4 h-4 text-cyan-300" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* STEP 2: MANDATORY TMDB API KEY STEP */}
                  {currentStep === 2 && (
                    <form onSubmit={handleTmdbSubmit} className="space-y-5 animate-fade-in">
                      <div className="bg-amber-950/50 border border-amber-800/60 p-4 rounded-2xl text-xs text-amber-200 leading-relaxed flex items-start gap-3">
                        <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-white block">Step 2: Enter Mandatory TMDB API Key (Required)</span>
                          TMDB (The Movie Database) API Key is mandatory to enable metadata indexing, cover posters, barcode lookups, and synopsis syncing. <strong className="text-amber-300 font-bold underline">This step cannot be skipped.</strong>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-400" /> TMDB API Key (v3) *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                            value={tmdbApiKey}
                            onChange={(e) => setTmdbApiKey(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-4 pr-28 py-3 text-sm text-white font-mono focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={handleTestTmdbKey}
                            disabled={isTestingKey || !tmdbApiKey.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                          >
                            {isTestingKey ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>Test</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Don't have a key? You can obtain a free API key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-cyan-400 underline">themoviedb.org/settings/api</a>.
                        </p>
                      </div>

                      {keyTestStatus && (
                        <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                          keyTestStatus.success ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                        }`}>
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{keyTestStatus.message}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>

                        <button
                          type="submit"
                          disabled={!tmdbApiKey.trim()}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
                        >
                          <span>Save Key & Continue to Currency</span>
                          <ArrowRight className="w-4 h-4 text-amber-200" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 3: LOCATION & CURRENCY CHOICE */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-emerald-950/40 border border-emerald-800/50 p-4 rounded-2xl text-xs text-emerald-200 leading-relaxed flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Globe className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-white block">Step 3: Choose Your Location & Currency</span>
                            Select your country/region to automatically set the local currency for purchase logs, total collection valuation, and stats display.
                          </div>
                        </div>

                        {/* Format sample preview */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-700/50 text-xs font-mono font-bold text-emerald-300 shrink-0 hidden sm:block">
                          Sample: <span className="text-white">{formatPrice(24.99, selectedCurrency)}</span>
                        </div>
                      </div>

                      {/* Location Country Picker */}
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" /> 1. Select Country / Region
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {LOCATION_OPTIONS.map((loc) => {
                            const isSelected = selectedLocation === loc.code;
                            return (
                              <button
                                key={loc.code}
                                type="button"
                                onClick={() => handleLocationSelect(loc.code)}
                                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-cyan-500 text-white shadow-md shadow-cyan-950/50 ring-2 ring-cyan-500/30 scale-[1.02]'
                                    : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span className="text-xl">{loc.flag}</span>
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">{loc.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Default: {loc.defaultCurrency}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Currency Override Picker */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                          <Coins className="w-4 h-4 text-emerald-400" /> 2. Preferred Currency Symbol
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {CURRENCY_OPTIONS.map((c) => {
                            const isSelected = selectedCurrency === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => setSelectedCurrency(c.code)}
                                className={`p-2 rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.03]'
                                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="text-sm font-extrabold font-mono">{c.symbol}</div>
                                <div className="text-[10px] text-slate-400">{c.code}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Automated Database Backups Prompt */}
                      <div className="space-y-2 pt-3 border-t border-slate-800">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                          <Database className="w-4 h-4 text-cyan-400" /> 3. Automated Database Backups
                        </label>
                        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                                <span>Enable Background Automated Backups?</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  enableAutoBackup
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-slate-900 text-slate-400 border-slate-800'
                                }`}>
                                  {enableAutoBackup ? 'Enabled' : 'Disabled by Default'}
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                Automatically store daily snapshots of your media database in your runtime configuration directory with auto-retention cleanup.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEnableAutoBackup(!enableAutoBackup)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-2 ${
                                enableAutoBackup
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${enableAutoBackup ? 'bg-emerald-300 animate-pulse' : 'bg-slate-500'}`} />
                              <span>{enableAutoBackup ? 'Daily Backups Enabled' : 'Disabled (Manual Only)'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Container / Docker Software Configuration Directory Path */}
                      <div className="space-y-2 pt-3 border-t border-slate-800">
                        <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                          <Folder className="w-4 h-4 text-purple-400" /> 4. Container Configuration & Storage Path
                        </label>
                        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="space-y-1 max-w-md">
                              <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                                <span>Docker Software Config Directory</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                                  Container Volume
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                State where the software configuration, runtime keys, and database persistent files will be running in your container environment (e.g., <code className="text-purple-300 font-mono">/config</code> or <code className="text-purple-300 font-mono">/data</code>).
                              </p>
                            </div>

                            <div className="w-full sm:w-64 shrink-0">
                              <div className="relative">
                                <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                <input
                                  type="text"
                                  value={configDirPath}
                                  onChange={(e) => setConfigDirPath(e.target.value)}
                                  placeholder="/config"
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back to TMDB Key</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleNextToMenu}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          <span>Save & Customize Hamburger Menu</span>
                          <ArrowRight className="w-4 h-4 text-cyan-200" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: HAMBURGER MENU CUSTOMIZATION */}
                  {currentStep === 4 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-purple-950/40 border border-purple-800/50 p-4 rounded-2xl text-xs text-purple-200 leading-relaxed flex items-start gap-3">
                        <SlidersHorizontal className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-white block">Step 4: Customize Hamburger Sidebar Menu</span>
                          Tailor your navigation menu! Note that <strong className="text-purple-300">Video Game Library</strong> entries are automatically greyed out as a non-functional feature.
                        </div>
                      </div>

                      {/* Embedded Hamburger / Navigation Customizer */}
                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 p-4">
                        <NavigationSettingsSection />
                      </div>

                      {/* Navigation & Complete Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back to Currency</span>
                        </button>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleFinishOobe(true)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                            <span>Use Defaults & Launch</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFinishOobe(false)}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4 text-cyan-300" />
                            <span>Complete Setup & Open Vault</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
