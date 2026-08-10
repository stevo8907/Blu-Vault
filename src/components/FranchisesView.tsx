import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Sparkles, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Scan, 
  Loader2, 
  ChevronRight, 
  User, 
  Bookmark, 
  X, 
  Disc, 
  Star, 
  ExternalLink,
  Award,
  Filter,
  Building2,
  Trash2,
  RefreshCw,
  PackageCheck,
  PackagePlus
} from 'lucide-react';
import { MediaItem, User as VaultUser } from '../types';
import { runCollectarrScan, clearCollectarrCollections, fetchTMDBCollection, addMediaItem } from '../lib/api';

interface FranchisesViewProps {
  mediaItems: MediaItem[];
  currentUser?: VaultUser | null;
  onRefreshMedia: () => void;
  onSelectMediaItem: (item: MediaItem) => void;
  onOpenAddMediaModal?: (initialTitle?: string) => void;
}

interface CollectionGroup {
  id: number;
  name: string;
  posterUrl?: string;
  backdropUrl?: string;
  ownedItems: MediaItem[];
  tmdbParts?: Array<{
    tmdbId: number;
    title: string;
    originalTitle?: string;
    overview: string;
    posterUrl: string;
    backdropUrl: string;
    releaseYear: number;
    rating: number;
  }>;
}

export const FranchisesView: React.FC<FranchisesViewProps> = ({
  mediaItems,
  currentUser,
  onRefreshMedia,
  onSelectMediaItem,
  onOpenAddMediaModal
}) => {
  const [activeTab, setActiveTab] = useState<'franchises' | 'people' | 'studios'>('franchises');
  const [searchQuery, setSearchQuery] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Selected collection modal state
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [collectionDetails, setCollectionDetails] = useState<CollectionGroup['tmdbParts'] | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);

  // Quick wishlist adding state
  const [addingWishlistId, setAddingWishlistId] = useState<number | null>(null);

  // Group media items by collection
  const rawCollectionGroups = useMemo(() => {
    const groupsMap: Record<number, CollectionGroup> = {};

    mediaItems.forEach(item => {
      if (item.collectionInfo) {
        const cid = item.collectionInfo.id;
        if (!groupsMap[cid]) {
          groupsMap[cid] = {
            id: cid,
            name: item.collectionInfo.name,
            posterUrl: item.collectionInfo.posterUrl || item.posterUrl,
            backdropUrl: item.collectionInfo.backdropUrl || item.backdropUrl,
            ownedItems: []
          };
        }
        groupsMap[cid].ownedItems.push(item);
      }
    });

    return Object.values(groupsMap).sort((a, b) => b.ownedItems.length - a.ownedItems.length);
  }, [mediaItems]);

  // Group items by Directors and Key Cast
  const peopleGroups = useMemo(() => {
    const directorsMap: Record<string, MediaItem[]> = {};
    const castMap: Record<string, MediaItem[]> = {};

    mediaItems.forEach(item => {
      if (item.director) {
        const directors = item.director.split(',').map(d => d.trim()).filter(Boolean);
        directors.forEach(dir => {
          if (!directorsMap[dir]) directorsMap[dir] = [];
          directorsMap[dir].push(item);
        });
      }

      if (item.cast && Array.isArray(item.cast)) {
        item.cast.forEach(actor => {
          const name = actor.trim();
          if (name) {
            if (!castMap[name]) castMap[name] = [];
            castMap[name].push(item);
          }
        });
      }
    });

    const topDirectors = Object.entries(directorsMap)
      .filter(([_, items]) => items.length >= 2)
      .map(([name, items]) => ({ name, type: 'Director' as const, items }))
      .sort((a, b) => b.items.length - a.items.length);

    const topCast = Object.entries(castMap)
      .filter(([_, items]) => items.length >= 2)
      .map(([name, items]) => ({ name, type: 'Actor' as const, items }))
      .sort((a, b) => b.items.length - a.items.length);

    return [...topDirectors, ...topCast].sort((a, b) => b.items.length - a.items.length);
  }, [mediaItems]);

  // Group items by Studio / Production Company
  const studioGroups = useMemo(() => {
    const map: Record<string, MediaItem[]> = {};
    mediaItems.forEach(item => {
      if (item.studio && item.studio.trim()) {
        const std = item.studio.trim();
        if (!map[std]) map[std] = [];
        map[std].push(item);
      }
    });
    return Object.entries(map)
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [mediaItems]);

  // Handle purging / resetting Collectarr tags
  const handleClearCollections = async () => {
    if (!window.confirm('Are you sure you want to purge all franchise grouping tags? You can re-run Collectarr Auto-Scan anytime.')) return;
    setIsScanning(true);
    try {
      const res = await clearCollectarrCollections();
      setScanMessage({ text: res.message, type: 'info' });
      onRefreshMedia();
    } catch (err: any) {
      setScanMessage({ text: err.message || 'Failed to clear tags.', type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle running Collectarr scan
  const handleRunScan = async () => {
    setIsScanning(true);
    setScanMessage({ text: 'Analyzing physical media vault and matching TMDB collections...', type: 'info' });

    try {
      const res = await runCollectarrScan();
      setScanMessage({ text: res.message, type: 'success' });
      onRefreshMedia();
    } catch (err: any) {
      setScanMessage({ text: err.message || 'Scan failed. Ensure TMDB API key is enabled in API Settings.', type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  // Open collection details
  const handleOpenCollection = async (group: CollectionGroup) => {
    setSelectedCollectionId(group.id);
    setIsLoadingCollection(true);
    setCollectionDetails(null);

    try {
      const details = await fetchTMDBCollection(group.id);
      setCollectionDetails(details.parts);
    } catch (err) {
      console.warn('Failed to load TMDB parts for collection:', err);
      // Fallback: construct parts from owned items
      setCollectionDetails(group.ownedItems.map(item => ({
        tmdbId: item.tmdbId || 0,
        title: item.title,
        overview: item.overview,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl || '',
        releaseYear: item.releaseYear,
        rating: item.rating
      })));
    } finally {
      setIsLoadingCollection(false);
    }
  };

  // Add missing title to wishlist
  const handleAddMissingToWishlist = async (part: { tmdbId: number; title: string; releaseYear: number; overview: string; posterUrl: string; backdropUrl?: string; rating: number }) => {
    setAddingWishlistId(part.tmdbId);
    try {
      await addMediaItem({
        title: part.title,
        tmdbId: part.tmdbId,
        type: 'movie',
        releaseYear: part.releaseYear,
        posterUrl: part.posterUrl,
        backdropUrl: part.backdropUrl,
        overview: part.overview,
        genres: ['Collection Wishlist'],
        rating: part.rating,
        format: '4K Ultra-HD',
        discsCount: 1,
        condition: 'Mint',
        shelfLocation: 'Wishlist Shelf',
        digitalCodeRedeemed: false,
        isWishlist: true,
        addedByUserId: currentUser?.id || 'sys',
        addedByUserName: currentUser?.username || 'System Admin'
      });
      onRefreshMedia();
      setScanMessage({ text: `Added '${part.title}' to Wishlist!`, type: 'success' });
    } catch (err: any) {
      setScanMessage({ text: `Failed to add to wishlist: ${err.message}`, type: 'error' });
    } finally {
      setAddingWishlistId(null);
    }
  };

  // Filter collection groups by search query
  const filteredCollections = useMemo(() => {
    return rawCollectionGroups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.ownedItems.some(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      return true;
    });
  }, [rawCollectionGroups, searchQuery]);

  // Active selected collection object
  const activeSelectedGroup = useMemo(() => {
    if (!selectedCollectionId) return null;
    return rawCollectionGroups.find(g => g.id === selectedCollectionId) || null;
  }, [selectedCollectionId, rawCollectionGroups]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Collectarr Franchise Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
                {rawCollectionGroups.length} Franchises Detected
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Franchises, Box Sets & Smart Collections
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Automated movie collection grouping powered by TMDB. Track owned physical discs, analyze missing titles in franchises, and manage smart actor & director filmographies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2.5 disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-cyan-200" /> : <RefreshCw className="w-4 h-4 text-cyan-200" />}
              <span>{isScanning ? 'Scanning TMDB Franchises...' : 'Run Collectarr Auto-Scan'}</span>
            </button>

            <button
              onClick={handleClearCollections}
              disabled={isScanning}
              title="Purge / Reset Collectarr franchise tags"
              className="px-3.5 py-3 rounded-2xl bg-slate-900 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800 font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
              <span className="hidden sm:inline">Purge Tags</span>
            </button>
          </div>
        </div>

        {/* Scan Toast Message */}
        {scanMessage && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 ${
            scanMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : scanMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                : 'bg-blue-950/90 border-blue-800 text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>{scanMessage.text}</span>
            </div>
            <button onClick={() => setScanMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* View Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-2 sm:p-3 rounded-2xl">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('franchises')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'franchises'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Movie Franchises ({rawCollectionGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'people'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Smart Actor & Director Collections ({peopleGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studios')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'studios'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Studios & Film Labels ({studioGroups.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search collections or cast..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* TAB 1: Movie Franchises Grid */}
      {activeTab === 'franchises' && (
        <div className="space-y-4">
          {filteredCollections.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-3xl space-y-4">
              <Layers className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Movie Franchises Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Run the Collectarr Auto-Scan above to automatically match movies in your physical vault against TMDB collections and group them into franchises.
              </p>
              <button
                onClick={handleRunScan}
                disabled={isScanning}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <Scan className="w-4 h-4" />
                <span>Run Collectarr Auto-Scan Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCollections.map(group => {
                return (
                  <div
                    key={group.id}
                    onClick={() => handleOpenCollection(group)}
                    className="group bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-cyan-500/10 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    {/* Collection Banner Header */}
                    <div className="relative h-44 bg-slate-950 overflow-hidden">
                      {group.backdropUrl ? (
                        <img
                          src={group.backdropUrl}
                          alt={group.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
                          <Film className="w-12 h-12 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                      {/* Poster Badge */}
                      <div className="absolute bottom-3 left-4 flex items-end gap-3">
                        {group.posterUrl && (
                          <img
                            src={group.posterUrl}
                            alt={group.name}
                            className="w-14 h-20 rounded-xl object-cover border-2 border-slate-800 shadow-xl shrink-0"
                          />
                        )}
                        <div className="min-w-0 pb-1">
                          <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full inline-block mb-1">
                            TMDB Franchise
                          </span>
                          <h3 className="text-base font-black text-white truncate drop-shadow-md">
                            {group.name}
                          </h3>
                        </div>
                      </div>

                      {/* Owned Pill */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Disc className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{group.ownedItems.length} Owned in Vault</span>
                      </div>
                    </div>

                    {/* Owned Discs Preview List */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          Physical Media Discs
                        </div>
                        <div className="space-y-1">
                          {group.ownedItems.slice(0, 3).map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                              <span className="text-slate-200 font-bold truncate">{item.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 shrink-0">
                                {item.format}
                              </span>
                            </div>
                          ))}
                          {group.ownedItems.length > 3 && (
                            <div className="text-[10px] text-slate-400 font-mono text-right pt-0.5">
                              +{group.ownedItems.length - 3} more physical titles...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-cyan-400 font-bold">
                        <span>View Franchise Details & Missing Discs</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Smart Actor & Director Collections */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {peopleGroups
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((person, idx) => (
                <div key={`${person.name}-${idx}`} className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
                        person.type === 'Director'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-white">{person.name}</h4>
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                          person.type === 'Director'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                        }`}>
                          {person.type}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-cyan-300">
                      {person.items.length} Discs
                    </span>
                  </div>

                  {/* Films grid preview */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    {person.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => onSelectMediaItem(item)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-slate-200 font-bold truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {item.releaseYear}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: Studios & Film Labels */}
      {activeTab === 'studios' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {studioGroups
              .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((studio, idx) => (
                <div key={`${studio.name}-${idx}`} className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center font-bold text-lg shadow-inner">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-white">{studio.name}</h4>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-950/80 text-amber-300 border-amber-800">
                          Production Studio / Label
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-300">
                      {studio.items.length} Titles
                    </span>
                  </div>

                  {/* Films list preview */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    {studio.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => onSelectMediaItem(item)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-200 font-bold truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {item.releaseYear}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Selected Franchise Detail Modal */}
      {activeSelectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative animate-fade-in custom-scrollbar">
            
            {/* Modal Header */}
            <div className="relative h-56 bg-slate-950">
              {activeSelectedGroup.backdropUrl && (
                <img
                  src={activeSelectedGroup.backdropUrl}
                  alt={activeSelectedGroup.name}
                  className="w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

              <button
                onClick={() => setSelectedCollectionId(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4">
                {activeSelectedGroup.posterUrl && (
                  <img
                    src={activeSelectedGroup.posterUrl}
                    alt={activeSelectedGroup.name}
                    className="w-20 h-28 rounded-2xl object-cover border-2 border-slate-800 shadow-2xl shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wide">
                    Movie Franchise & Box Set
                  </span>
                  <h3 className="text-2xl font-black text-white">{activeSelectedGroup.name}</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {activeSelectedGroup.ownedItems.length} physical media titles in your Blu-Vault collection.
                  </p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>Franchise Titles Breakdown</span>
                </h4>
                {isLoadingCollection && (
                  <span className="text-xs text-cyan-400 font-mono flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching TMDB Franchise Manifest...
                  </span>
                )}
              </div>

              {/* Franchise Filmography List */}
              <div className="space-y-3">
                {collectionDetails ? (
                  collectionDetails.map(part => {
                    const ownedItem = activeSelectedGroup.ownedItems.find(
                      item => item.tmdbId === part.tmdbId || item.title.toLowerCase() === part.title.toLowerCase()
                    );

                    return (
                      <div
                        key={part.tmdbId}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          ownedItem
                            ? 'bg-emerald-950/20 border-emerald-800/80 shadow-md shadow-emerald-500/5'
                            : 'bg-slate-950/60 border-slate-800/80 border-dashed'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {part.posterUrl && (
                            <img
                              src={part.posterUrl}
                              alt={part.title}
                              className="w-12 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-white truncate">{part.title}</h5>
                              <span className="text-[10px] font-mono text-slate-400">({part.releaseYear})</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {part.overview || 'TMDB franchise feature entry.'}
                            </p>

                            {ownedItem ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <PackageCheck className="w-3 h-3 text-emerald-400" /> Owned: {ownedItem.format}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Shelf: {ownedItem.shelfLocation}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 mt-1.5">
                                <AlertCircle className="w-3 h-3 text-amber-400" /> Missing from Physical Vault
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
                          {ownedItem ? (
                            <button
                              onClick={() => {
                                setSelectedCollectionId(null);
                                onSelectMediaItem(ownedItem);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                            >
                              <span>View Disc</span>
                              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (onOpenAddMediaModal) {
                                  setSelectedCollectionId(null);
                                  onOpenAddMediaModal(part.title);
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-white" />
                              <span>Add Movie</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  activeSelectedGroup.ownedItems.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">({item.releaseYear})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px]">
                        {item.format}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCollectionId(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Franchise View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
