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
  AlertCircle
} from 'lucide-react';
import { submitOobeSetup, saveApiConfigs, testApiConfig } from '../lib/api';
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
  // Setup Step: 1 = Admin Account, 2 = TMDB API Key (Mandatory), 3 = Region & Currency, 4 = Hamburger Menu Customization
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

  // Step 3 State: Location & Currency
  const [selectedLocation, setSelectedLocation] = useState(getSavedLocationCode());
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrencyCode());

  // Final completion state
  const [isFinishing, setIsFinishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const EMOJI_AVATARS = ['🛡️', '🎬', '📺', '🍿', '📀', '🎮', '⭐', '🚀', '👾', '🎧'];

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
      
      // Auto-hide video game nav items during OOBE setup as requested
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

  // Handle Location change - auto-updates default currency for selected country
  const handleLocationSelect = (locCode: string) => {
    setSelectedLocation(locCode);
    const locObj = LOCATION_OPTIONS.find(l => l.code === locCode);
    if (locObj) {
      setSelectedCurrency(locObj.defaultCurrency);
    }
  };

  // Save Step 3 Region & Currency
  const saveRegionSettings = () => {
    setSavedLocationCode(selectedLocation);
    setSavedCurrencyCode(selectedCurrency);
  };

  // Save Step 3 & proceed to Step 4
  const handleNextToMenu = () => {
    saveRegionSettings();
    setCurrentStep(4);
  };

  // Finish whole OOBE
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
        currentStep === 1 ? 'max-w-2xl' : currentStep === 2 ? 'max-w-2xl' : currentStep === 3 ? 'max-w-3xl' : 'max-w-5xl'
      } bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden my-auto animate-fade-in transition-all duration-300`}>
        
        {/* Banner Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-900/40 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> Out-Of-Box Setup (OOBE)
            </span>

            {/* Step Counter Indicator */}
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
          </div>

          <div className="flex items-center gap-4">
            <LogoIcon size="lg" animated />
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Welcome to Blu-Vault</h1>
              <p className="text-xs text-slate-300">
                {currentStep === 1 && 'Step 1: Create Master Administrator Account'}
                {currentStep === 2 && 'Step 2: Enter Required TMDB API Key (Mandatory)'}
                {currentStep === 3 && 'Step 3: Geographic Location & Currency Setting'}
                {currentStep === 4 && 'Step 4: Hamburger Navigation Menu Customization'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
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
        </div>
      </div>
    </div>
  );
};
