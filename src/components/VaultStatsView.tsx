import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Disc, 
  DollarSign, 
  Clock, 
  MapPin, 
  Sparkles, 
  Film, 
  Tv, 
  Gamepad2, 
  ShieldCheck, 
  Box, 
  Coins, 
  Bookmark,
  Database,
  HardDrive,
  Folder,
  Tag,
  Server,
  RefreshCw
} from 'lucide-react';
import { MediaItem } from '../types';
import { formatPrice, getSavedCurrencyCode } from '../lib/currency';
import { isCompleteTvSeries } from '../lib/tvUtils';
import { 
  getSavedVaultName, 
  getSavedVaultLocation, 
  getSavedConfigDirPath, 
  fetchSystemPaths, 
  SystemPathsInfo 
} from '../lib/vaultConfig';

interface VaultStatsViewProps {
  mediaItems: MediaItem[];
}

export const VaultStatsView: React.FC<VaultStatsViewProps> = ({ mediaItems }) => {
  const [currencyCode, setCurrencyCode] = useState(getSavedCurrencyCode());
  const [vaultName, setVaultName] = useState(getSavedVaultName());
  const [vaultLocation, setVaultLocation] = useState(getSavedVaultLocation());
  const [configDirPath, setConfigDirPath] = useState(getSavedConfigDirPath());
  const [systemPaths, setSystemPaths] = useState<SystemPathsInfo | null>(null);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);

  const loadPaths = async () => {
    setIsLoadingPaths(true);
    try {
      const data = await fetchSystemPaths();
      setSystemPaths(data);
      if (data.vaultName) setVaultName(data.vaultName);
      if (data.vaultLocation) setVaultLocation(data.vaultLocation);
      if (data.configDirPath) setConfigDirPath(data.configDirPath);
    } catch (e) {
      console.warn('Could not load system paths:', e);
    } finally {
      setIsLoadingPaths(false);
    }
  };

  useEffect(() => {
    loadPaths();
    const handleCurrencyChange = () => setCurrencyCode(getSavedCurrencyCode());
    const handleConfigChange = () => {
      setVaultName(getSavedVaultName());
      setVaultLocation(getSavedVaultLocation());
      setConfigDirPath(getSavedConfigDirPath());
      loadPaths();
    };

    window.addEventListener('bluvault_currency_changed', handleCurrencyChange);
    window.addEventListener('bluvault_vault_config_updated', handleConfigChange);

    return () => {
      window.removeEventListener('bluvault_currency_changed', handleCurrencyChange);
      window.removeEventListener('bluvault_vault_config_updated', handleConfigChange);
    };
  }, []);

  const ownedItems = mediaItems.filter(m => !m.isWishlist);
  const wishlistItems = mediaItems.filter(m => m.isWishlist);

  const totalItems = ownedItems.length;
  const totalWishlist = wishlistItems.length;

  const totalValue = ownedItems.reduce((acc, curr) => acc + (curr.purchasePrice || 0), 0);
  const totalDiscs = ownedItems.reduce((acc, curr) => acc + (curr.discsCount || 1), 0);
  const totalRuntimeMinutes = ownedItems.reduce((acc, curr) => acc + (curr.runtimeMinutes || 120), 0);
  const totalWatchHours = Math.round(totalRuntimeMinutes / 60);

  // Format counts
  const count4K = ownedItems.filter(m => m.format.includes('4K')).length;
  const countBluRay = ownedItems.filter(m => m.format.includes('Blu-Ray') && !m.format.includes('4K')).length;
  const countDVD = ownedItems.filter(m => m.format === 'DVD').length;
  const countSteelbook = ownedItems.filter(m => m.format.includes('Steelbook')).length;
  const countBoxSets = ownedItems.filter(m => m.format === 'Box Set' || isCompleteTvSeries(m)).length;
  const countAnime = ownedItems.filter(m => m.type === 'anime' || (m.genres && m.genres.some(g => g.toLowerCase() === 'anime'))).length;
  const countGames = ownedItems.filter(m => m.type === 'game').length;

  // Type counts
  const moviesCount = ownedItems.filter(m => m.type === 'movie').length;
  const tvCount = ownedItems.filter(m => m.type === 'tv').length;

  // Shelf locations map
  const shelfMap: Record<string, number> = {};
  ownedItems.forEach(m => {
    const loc = m.shelfLocation || 'Unassigned';
    shelfMap[loc] = (shelfMap[loc] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-800/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-black text-white tracking-wide">{vaultName} Analytics</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 text-[11px] font-mono font-bold flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-indigo-400" /> {vaultLocation}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Physical disc metrics, collection valuation, disk storage footprint, and shelf distribution
            </p>
          </div>
        </div>

        <button
          onClick={loadPaths}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold font-mono flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingPaths ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Physical Titles</span>
            <Disc className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{totalItems}</div>
          <p className="text-[11px] text-slate-400 font-mono">{totalDiscs} Physical Discs Total</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Estimated Vault Value</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{formatPrice(totalValue, currencyCode)}</div>
          <p className="text-[11px] text-slate-400 font-mono">Avg {formatPrice(totalValue / (totalItems || 1), currencyCode)} / title</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">4K Ultra-HD Ratio</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300 font-mono">{count4K}</div>
          <p className="text-[11px] text-slate-400 font-mono">
            {Math.round((count4K / (totalItems || 1)) * 100)}% of total collection
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Watch Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-300 font-mono">{totalWatchHours} hrs</div>
          <p className="text-[11px] text-slate-400 font-mono">{(totalWatchHours / 24).toFixed(1)} days continuous play</p>
        </div>

        <div className="bg-slate-900/90 border border-purple-800/40 p-5 rounded-2xl space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-xs font-semibold">Wishlist Wanted</span>
            <Bookmark className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-300 font-mono">{totalWishlist}</div>
          <p className="text-[11px] text-purple-400/80 font-mono">Desired Media Items</p>
        </div>
      </div>

      {/* STORAGE & DIRECTORY STATISTICS CARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-purple-400" /> Storage & Config Directory Diagnostics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live location and disk footprints for database records, automatic backups, and cached artwork
            </p>
          </div>
          <div className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-300 font-mono text-xs font-bold flex items-center gap-2">
            <span>Config Path:</span>
            <span className="text-white bg-slate-950 px-2 py-0.5 rounded border border-purple-700/50">
              {configDirPath || '/config'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Databases */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                <Database className="w-4 h-4 text-indigo-400" /> Segmented Databases
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                Active
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="text-white flex justify-between">
                <span>bluvault-system.json</span>
                <span className="text-indigo-300">Users & API Keys</span>
              </div>
              <div className="text-white flex justify-between">
                <span>bluvault-vault.json</span>
                <span className="text-cyan-300">{totalItems} Media Items</span>
              </div>
            </div>
          </div>

          {/* Backups */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                <HardDrive className="w-4 h-4 text-cyan-400" /> Database Backups
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                {configDirPath}/backups/
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Snapshots Available:</span>
                <span className="text-white font-bold">{systemPaths?.stats?.backupCount ?? systemPaths?.backupSnapshotsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Automatic Retention:</span>
                <span className="text-emerald-300">Enabled</span>
              </div>
            </div>
          </div>

          {/* Cache */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                <Film className="w-4 h-4 text-purple-400" /> Cached Artwork
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono font-bold">
                {configDirPath}/cache/
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Media Subdirectories:</span>
                <span className="text-white">movies / tv / games</span>
              </div>
              <div className="flex justify-between">
                <span>Offline Support:</span>
                <span className="text-emerald-300">Instant Local Serve</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORMAT BREAKDOWN & MEDIA TYPE RATIO */}
      <div className="grid sm:grid-cols-2 gap-6">
        
        {/* Physical Format Visual Progress Bars */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" /> Format Breakdown
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> 4K Ultra-HD Discs</span>
                <span className="font-mono text-amber-300">{count4K} items</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${(count4K / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Disc className="w-3.5 h-3.5 text-cyan-400" /> Blu-Ray 1080p Discs</span>
                <span className="font-mono text-cyan-300">{countBluRay} items</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${(countBluRay / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Disc className="w-3.5 h-3.5 text-slate-400" /> DVD Discs</span>
                <span className="font-mono text-slate-300">{countDVD} items</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-slate-600 transition-all duration-500"
                  style={{ width: `${(countDVD / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-emerald-400" /> Complete Box Sets</span>
                <span className="font-mono text-emerald-300">{countBoxSets} sets</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(countBoxSets / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Anime Titles</span>
                <span className="font-mono text-purple-300">{countAnime} items</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${(countAnime / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5 text-rose-400" /> Video Games</span>
                <span className="font-mono text-rose-300">{countGames} items</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${(countGames / (totalItems || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shelf Inventory Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" /> Shelf Location Distribution
          </h3>

          <div className="space-y-2">
            {Object.entries(shelfMap).map(([location, count]) => (
              <div key={location} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-bold text-slate-200 font-mono">{location}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/50 text-xs font-mono font-bold">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

