import React, { useState, useEffect, useRef } from 'react';
import { getCurrencyOption } from '../lib/currency';
import { 
  X, 
  Search, 
  Scan, 
  Disc, 
  Sparkles, 
  Check, 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Tag, 
  Plus, 
  Film, 
  Tv, 
  Gamepad2, 
  Layers, 
  Box,
  Loader2,
  Barcode,
  Info,
  Calendar,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MediaItem, PhysicalFormat, Condition, MediaType, TMDBSearchResult, User, Season } from '../types';
import { searchTMDB, getTMDBDetails, addMediaItem } from '../lib/api';
import { UK_RETAILERS, getSavedShelfLocations, saveShelfLocation } from '../lib/shelfAndRetailer';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onMediaAdded: (newItem: MediaItem) => void;
  initialQuery?: string;
}

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onMediaAdded,
  initialQuery
}) => {
  // Step 1: 'search', Step 2: 'review'
  const [step, setStep] = useState<'search' | 'review'>('search');
  const [activeTab, setActiveTab] = useState<'multi' | 'movie' | 'tv' | 'anime' | 'game'>('multi');

  // Search input ref for instant blinking cursor autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [apiSource, setApiSource] = useState<string>('tmdb');

  // Selected item for review & customization
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('movie');
  const [animeType, setAnimeType] = useState<'movie' | 'tv'>('movie');

  // TV Show Specific state
  const [tvCollectionType, setTvCollectionType] = useState<'complete' | 'seasons'>('complete');
  const [selectedSeasonsList, setSelectedSeasonsList] = useState<number[]>([]);
  const [existingTvMatch, setExistingTvMatch] = useState<MediaItem | null>(null);
  const [showSeasonSelectPopup, setShowSeasonSelectPopup] = useState<boolean>(false);

  // Physical specs state for review
  const [format, setFormat] = useState<PhysicalFormat>('4K Ultra-HD');
  const [edition, setEdition] = useState('');
  const [discsCount, setDiscsCount] = useState<number>(1);
  const [condition, setCondition] = useState<Condition>('Mint');
  
  // Shelf locations list & selection state
  const [shelfLocations, setShelfLocations] = useState<string[]>(getSavedShelfLocations());
  const [shelfLocation, setShelfLocation] = useState<string>(getSavedShelfLocations()[0] || 'Vault Shelf A1');
  const [isAddingCustomShelf, setIsAddingCustomShelf] = useState(false);
  const [customShelfInput, setCustomShelfInput] = useState('');

  // Purchase details
  const [purchasePrice, setPurchasePrice] = useState<string>('24.99');
  const [purchaseRetailer, setPurchaseRetailer] = useState<string>('HMV');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [digitalCodeRedeemed, setDigitalCodeRedeemed] = useState(false);
  const [isWishlist, setIsWishlist] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!isOpen) return null;

  // Auto-focus the search input with a blinking cursor whenever modal opens or returns to search step
  useEffect(() => {
    if (isOpen && step === 'search') {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Position cursor at end if query already populated
          if (searchInputRef.current.value) {
            const len = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(len, len);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  // Execute TMDB Search immediately
  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!queryToSearch) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchType = activeTab === 'movie' || activeTab === 'tv' ? activeTab : 'multi';
      const res = await searchTMDB(queryToSearch, searchType);
      setSearchResults(res.results || []);
      setApiSource(res.source || 'tmdb');
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Live Autofill Results While Typing (debounced 250ms)
  useEffect(() => {
    if (!isOpen || step !== 'search') return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const searchType = activeTab === 'movie' || activeTab === 'tv' ? activeTab : 'multi';
        const res = await searchTMDB(trimmed, searchType);
        setSearchResults(res.results || []);
        setApiSource(res.source || 'tmdb');
      } catch (err) {
        console.error('Real-time typing search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeTab, isOpen, step]);

  // Trigger search on initial query prop when modal opens
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      setSearchQuery(initialQuery);
      setStep('search');
      handleSearch(undefined, initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Trigger search on tab change and keep focus in input
  useEffect(() => {
    if (isOpen && step === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  // Select a result to enter Review Mode
  const handleSelectResult = async (res: TMDBSearchResult) => {
    setIsSearching(true);
    try {
      // Fetch full TMDB details if tmdb item
      let details: any = null;
      if (res.id) {
        details = await getTMDBDetails(res.id, res.media_type === 'tv' ? 'tv' : 'movie');
      }

      const isTv = res.media_type === 'tv' || activeTab === 'tv';
      const seasonsList = details?.seasons && details.seasons.length > 0
        ? details.seasons
        : Array.from({ length: details?.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1, name: `Season ${i + 1}` }));
      const allSeasonsNums = seasonsList.map((s: any) => s.seasonNumber);
      const numSeasons = seasonsList.length;

      setSelectedResult({
        ...res,
        ...details,
        title: details?.title || res.title || res.name,
        overview: details?.overview || res.overview,
        poster_path: details?.posterUrl || res.poster_path,
        backdrop_path: details?.backdropUrl || res.backdrop_path,
        release_date: details?.releaseYear ? `${details.releaseYear}-01-01` : (res.release_date || res.first_air_date),
        director: details?.director || '',
        cast: details?.cast || [],
        genres: details?.genres || ['Action'],
        studio: details?.studio || ''
      });

      // Default TV state
      if (isTv) {
        setFormat('4K Ultra-HD');
        setEdition('');
        setDiscsCount(numSeasons * 3);
        setTvCollectionType('complete');
        setSelectedSeasonsList(allSeasonsNums);
        setShowSeasonSelectPopup(true);

        // Check if show already exists in vault
        try {
          const resVault = await fetch('/api/media?type=tv');
          const dataVault = await resVault.json();
          const existingShow = (dataVault.media || []).find((m: MediaItem) => 
            (res.id && m.tmdbId === res.id) || 
            m.title.toLowerCase().includes((res.title || res.name || '').toLowerCase())
          );
          setExistingTvMatch(existingShow || null);
        } catch (e) {
          setExistingTvMatch(null);
        }
      } else {
        setFormat('4K Ultra-HD');
        setEdition('');
        setDiscsCount(1);
        setExistingTvMatch(null);
      }

      // Set default media type based on search tab or item details
      const rawGenres = (res as any).genres || (details as any).genres || [];
      if (activeTab === 'anime' || rawGenres.some((g: any) => typeof g === 'string' && g.toLowerCase() === 'anime')) {
        setSelectedMediaType('anime');
        setAnimeType(res.media_type === 'tv' || isTv ? 'tv' : 'movie');
      } else if (isTv) {
        setSelectedMediaType('tv');
      } else if (activeTab === 'game') {
        setSelectedMediaType('game');
      } else {
        setSelectedMediaType('movie');
      }

      setStep('review');
    } catch (err) {
      console.error('Error fetching details:', err);
      setSelectedResult(res);
      if (activeTab === 'anime') {
        setSelectedMediaType('anime');
      }
      setStep('review');
    } finally {
      setIsSearching(false);
    }
  };

  // Quick add directly to Wishlist without needing physical specs
  const handleQuickAddToWishlist = async (res: TMDBSearchResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSubmitting(true);
    try {
      const rawRes = res as any;
      const isAnime = activeTab === 'anime' || (rawRes.genres && rawRes.genres.some((g: any) => typeof g === 'string' && g.toLowerCase() === 'anime'));
      const isTv = res.media_type === 'tv' || activeTab === 'tv';
      const type = isAnime ? 'anime' : (isTv ? 'tv' : (activeTab === 'game' ? 'game' : 'movie'));

      const existingGenres: string[] = rawRes.genres || ['Action'];
      const finalGenres = isAnime && !existingGenres.some(g => g.toLowerCase() === 'anime')
        ? ['Anime', ...existingGenres]
        : existingGenres;

      const newItem: Partial<MediaItem> = {
        tmdbId: res.id ? Number(res.id) : undefined,
        type,
        animeType: isAnime ? (res.media_type === 'tv' || isTv ? 'tv' : 'movie') : undefined,
        title: res.title || res.name || 'Untitled Media',
        originalTitle: res.original_title || res.title,
        releaseYear: res.release_date || res.first_air_date ? new Date(res.release_date || res.first_air_date!).getFullYear() : 2023,
        posterUrl: res.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
        backdropUrl: res.backdrop_path || undefined,
        overview: res.overview || '',
        genres: finalGenres,
        rating: res.vote_average || 8.0,
        runtimeMinutes: rawRes.runtimeMinutes || undefined,
        numberOfSeasons: isTv ? (rawRes.numberOfSeasons || 1) : undefined,
        director: rawRes.director || undefined,
        cast: rawRes.cast || [],
        studio: rawRes.studio || undefined,

        format: '4K Ultra-HD',
        edition: 'Wishlist Item',
        discsCount: 1,
        condition: 'Mint',
        shelfLocation: 'Wishlist',
        digitalCodeRedeemed: false,
        isWishlist: true,

        addedByUserId: currentUser?.id || 'usr-1',
        addedByUserName: currentUser?.username || 'Vault Master',
        isFavorite: false
      };

      const saved = await addMediaItem(newItem);

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }

      onMediaAdded(saved);
      onClose();
    } catch (err) {
      console.error('Failed quick adding to wishlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final submit to save into physical collection
  const handleSaveToVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult) return;

    setIsSubmitting(true);
    try {
      const isAnime = selectedMediaType === 'anime';
      const isTv = selectedMediaType === 'tv' || (isAnime && animeType === 'tv');
      const allSeasons = selectedResult.seasons || Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: 10
      }));

      let finalSeasons: Season[] = [];
      if (isTv) {
        const isAllSelected = selectedSeasonsList.length === allSeasons.length;
        if (tvCollectionType === 'complete' && isAllSelected) {
          finalSeasons = allSeasons.map((s: any) => ({ ...s, ownedInVault: true }));
        } else {
          finalSeasons = allSeasons
            .filter((s: any) => selectedSeasonsList.includes(s.seasonNumber))
            .map((s: any) => ({
              ...s,
              ownedInVault: true,
              format,
              edition: edition || `Season ${s.seasonNumber}`,
              shelfLocation: shelfLocation || 'Vault Shelf A1',
              purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
              purchaseRetailer: purchaseRetailer || undefined,
              purchaseDate: purchaseDate || undefined,
              discsCount: Number(discsCount) || 1,
              condition: condition || 'Mint',
              barcode: barcode || undefined,
              notes: notes || undefined
            }));
        }
      }

      const existingGenres: string[] = selectedResult.genres || ['Action'];
      const finalGenres = isAnime && !existingGenres.some(g => g.toLowerCase() === 'anime')
        ? ['Anime', ...existingGenres]
        : existingGenres;

      const newItem: Partial<MediaItem> & { mergeIntoId?: string } = {
        tmdbId: selectedResult.id ? Number(selectedResult.id) : undefined,
        barcode: barcode || undefined,
        type: selectedMediaType,
        animeType: isAnime ? animeType : undefined,
        title: selectedResult.title || selectedResult.name || 'Untitled Media',
        originalTitle: selectedResult.original_title || selectedResult.title,
        releaseYear: selectedResult.release_date ? new Date(selectedResult.release_date).getFullYear() : 2023,
        posterUrl: selectedResult.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
        backdropUrl: selectedResult.backdrop_path || undefined,
        overview: selectedResult.overview || '',
        genres: finalGenres,
        rating: selectedResult.vote_average || 8.0,
        runtimeMinutes: selectedResult.runtimeMinutes || undefined,
        numberOfSeasons: isTv ? finalSeasons.length : undefined,
        numberOfEpisodes: selectedResult.numberOfEpisodes || undefined,
        seasons: isTv ? finalSeasons : undefined,
        isCompleteSeries: isTv && tvCollectionType === 'complete' && selectedSeasonsList.length === allSeasons.length,
        director: selectedResult.director || undefined,
        cast: selectedResult.cast || [],
        studio: selectedResult.studio || undefined,

        mergeIntoId: isTv && existingTvMatch ? existingTvMatch.id : undefined,

        format: isWishlist ? (format || '4K Ultra-HD') : format,
        edition: isWishlist ? (edition || 'Wishlist Item') : edition,
        discsCount: isWishlist ? 1 : Number(discsCount),
        condition: isWishlist ? 'Mint' : condition,
        shelfLocation: isWishlist ? 'Wishlist' : (shelfLocation || 'Vault Shelf A1'),
        purchasePrice: isWishlist ? undefined : (purchasePrice ? parseFloat(purchasePrice) : undefined),
        purchaseRetailer: isWishlist ? undefined : (purchaseRetailer || undefined),
        purchaseDate: isWishlist ? new Date().toISOString().split('T')[0] : purchaseDate,
        digitalCodeRedeemed: isWishlist ? false : digitalCodeRedeemed,
        isWishlist,
        notes,

        addedByUserId: currentUser?.id || 'usr-1',
        addedByUserName: currentUser?.username || 'Vault Master',
        isFavorite: false
      };

      const saved = await addMediaItem(newItem);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }

      onMediaAdded(saved);
      onClose();
    } catch (err: any) {
      console.error('Error saving item:', err);
      setSaveError(err.message || 'Failed to save item to Blu-Vault. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'review' && (
              <button
                onClick={() => setStep('search')}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Back to search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-[1px] flex items-center justify-center text-white shadow-md">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">
                {step === 'search' ? 'Add Media to Collection' : 'Review & Physical Copy Specs'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {step === 'search' ? 'Search TMDB Database by title, director, or franchise' : 'Verify metadata and set shelf location, format & specs'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* STEP 1: TMDB SEARCH ENTRY */}
        {step === 'search' && (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">

            {/* TMDB Search Input & Category Tabs */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search TMDB API by title (e.g., Oppenheimer, Dune, Breaking Bad, Inception)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="text-xs text-slate-400 hover:text-white p-1"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Category selector tabs */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('multi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'multi'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  All TMDB Media
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('movie')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'movie'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  Movies Only
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tv')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'tv'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  TV Shows Only
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('anime')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'anime'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  Anime Only
                </button>
              </div>
            </form>

            {/* Results Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                <span>TMDB Search Results ({searchResults.length})</span>
                <span className="font-mono text-[10px] text-cyan-400">
                  {apiSource === 'tmdb-api' ? '⚡ Connected to Live TMDB API' : '📦 TMDB Catalog Engine'}
                </span>
              </div>

              {isSearching && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-xs">Fetching TMDB metadata and artwork...</p>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && (
                <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6">
                  <Film className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-300">Type a Title or Scan Barcode</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Search for movies like "Oppenheimer", "The Dark Knight", or "Breaking Bad" to quickly import metadata, cast, director, and cover art.
                  </p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => handleSelectResult(res)}
                      className="group bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-3 flex gap-3 transition-all cursor-pointer shadow-md hover:shadow-xl"
                    >
                      <img
                        src={res.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80'}
                        alt={res.title || res.name}
                        className="w-16 h-24 object-cover rounded-xl bg-slate-900 shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                              res.media_type === 'tv' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50' : 'bg-blue-950 text-blue-300 border border-blue-700/50'
                            }`}>
                              {res.media_type}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {res.release_date || res.first_air_date ? new Date(res.release_date || res.first_air_date).getFullYear() : ''}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 truncate">
                            {res.title || res.name}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                            {res.overview}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-1">
                          <span className="text-xs font-semibold text-blue-400 group-hover:text-cyan-300 flex items-center gap-1">
                            <span>Select & Review</span> →
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleQuickAddToWishlist(res, e)}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/50 text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-sm shrink-0"
                            title="Add directly to Wishlist (no other information required)"
                          >
                            <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                            <span>+ Wishlist</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* STEP 2: MANDATORY REVIEW & PHYSICAL SPECS STEP */}
        {step === 'review' && selectedResult && (
          <form onSubmit={handleSaveToVault} className="flex-1 flex flex-col overflow-hidden">
            
            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              
              {/* Wishlist Toggle Banner */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isWishlist
                  ? 'bg-amber-950/60 border-amber-500/60 shadow-lg shadow-amber-950/40'
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isWishlist ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isWishlist ? 'text-amber-200' : 'text-slate-200'}`}>
                      {isWishlist ? 'Wishlist Mode Active (Desired Title)' : 'Physical Vault Item'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {isWishlist
                        ? 'No physical information, price, or shelf location is required.'
                        : 'Check if this item is on your wishlist instead of physical inventory.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWishlist(!isWishlist)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center ${
                    isWishlist
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-amber-950/80 text-slate-300 hover:text-amber-300 border-slate-700'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isWishlist ? '✓ Marked as Wishlist' : 'Set as Wishlist'}</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={selectedResult.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80'}
                    alt={selectedResult.title}
                    className="w-20 aspect-[2/3] object-cover rounded-xl border border-slate-700 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-xs font-bold uppercase">
                        TMDB #{selectedResult.id || 'Custom'}
                      </span>
                      {barcode && (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold">
                          UPC #{barcode}
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400">
                        Release: {selectedResult.release_date ? new Date(selectedResult.release_date).getFullYear() : '2023'}
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-white">{selectedResult.title || selectedResult.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{selectedResult.overview}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('search')}
                  className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all self-stretch sm:self-auto justify-center"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search TMDB to Re-link Metadata</span>
                </button>
              </div>

              {/* TV SHOW SEASONS SELECTOR */}
              {(selectedResult.media_type === 'tv' || activeTab === 'tv') && (
                <div className="bg-indigo-950/30 border border-indigo-800/50 p-4 sm:p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-indigo-200 flex items-center gap-2">
                        <Tv className="w-4 h-4 text-indigo-400" /> TV Show Seasons & Box Set Configuration
                      </h4>
                      <p className="text-xs text-slate-400">
                        {selectedSeasonsList.length} Season(s) selected for this physical release
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSeasonSelectPopup(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 shrink-0"
                      >
                        <Layers className="w-3.5 h-3.5" /> Manage Seasons (Pop-Up)
                      </button>
                    </div>
                  </div>

                  {existingTvMatch && (
                    <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Show already exists in Vault! Saving will automatically merge newly selected season(s) into your existing <strong>"{existingTvMatch.title}"</strong> entry.
                      </span>
                    </div>
                  )}

                  {/* Release Set Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                      Release Set Type:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div
                        onClick={() => {
                          setTvCollectionType('complete');
                          const seasonsToUse = selectedResult.seasons && selectedResult.seasons.length > 0
                            ? selectedResult.seasons
                            : Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1 }));
                          const allS = seasonsToUse.map((s: any) => s.seasonNumber);
                          setSelectedSeasonsList(allS);
                          setFormat('Box Set');
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          tvCollectionType === 'complete'
                            ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 ring-1 ring-amber-400/50'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <Box className={`w-5 h-5 shrink-0 ${tvCollectionType === 'complete' ? 'text-amber-400' : 'text-slate-500'}`} />
                        <div>
                          <span className="text-xs font-bold block text-white">Complete Series / Box Set</span>
                          <span className="text-[10px] text-slate-400 block">Full series set — goes inside Complete Box Sets menu</span>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setTvCollectionType('seasons');
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          tvCollectionType === 'seasons'
                            ? 'bg-indigo-500/20 border-indigo-400/80 text-indigo-200 ring-1 ring-indigo-400/50'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <Disc className={`w-5 h-5 shrink-0 ${tvCollectionType === 'seasons' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <span className="text-xs font-bold block text-white">Individual / Selected Season(s)</span>
                          <span className="text-[10px] text-slate-400 block">Single or specific seasons added to collection</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-indigo-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-bold">Included Season(s):</span>
                      <button
                        type="button"
                        onClick={() => setShowSeasonSelectPopup(true)}
                        className="text-cyan-400 hover:underline font-semibold text-[11px]"
                      >
                        + Edit in Pop-Up
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const seasonsToUse = selectedResult.seasons && selectedResult.seasons.length > 0
                          ? selectedResult.seasons
                          : Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1, name: `Season ${i + 1}` }));
                        
                        return seasonsToUse.map((sData: any) => {
                          const sn = sData.seasonNumber;
                          const isSelected = selectedSeasonsList.includes(sn);
                          const label = sData.name || (sn === 0 ? 'Specials' : `Season ${sn}`);

                          return (
                            <button
                              key={sn}
                              type="button"
                              onClick={() => {
                                let next: number[];
                                if (isSelected) {
                                  next = selectedSeasonsList.filter(s => s !== sn);
                                } else {
                                  next = [...selectedSeasonsList, sn].sort((a, b) => a - b);
                                }
                                setSelectedSeasonsList(next);
                                if (next.length === seasonsToUse.length) {
                                  setTvCollectionType('complete');
                                } else {
                                  setTvCollectionType('seasons');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                              <span>{label}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Copy Form Specs */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Disc className="w-4 h-4 text-cyan-400" /> Review Physical Format & Copy Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Media Category Picker */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Vault Media Type *</label>
                    <select
                      value={selectedMediaType === 'anime' ? `anime-${animeType}` : selectedMediaType}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('anime')) {
                          setSelectedMediaType('anime');
                          setAnimeType(val === 'anime-tv' ? 'tv' : 'movie');
                        } else {
                          setSelectedMediaType(val as MediaType);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-semibold"
                    >
                      <option value="movie">🎬 Movie</option>
                      <option value="tv">📺 TV Show</option>
                      <option value="anime-movie">✨ Anime (Movie)</option>
                      <option value="anime-tv">✨ Anime (TV Series)</option>
                      <option value="game">🎮 Video Game</option>
                    </select>
                  </div>

                  {/* Physical Format Picker */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Physical Format {isWishlist ? '(Optional)' : '*'}</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as PhysicalFormat)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-semibold"
                    >
                      <option value="4K Ultra-HD">📀 4K Ultra-HD</option>
                      <option value="Steelbook 4K">✨ Steelbook 4K UHD</option>
                      <option value="Blu-Ray 1080p">💿 Blu-Ray 1080p</option>
                      <option value="Steelbook Blu-Ray">✨ Steelbook Blu-Ray</option>
                      <option value="3D Blu-Ray">🕶️ 3D Blu-Ray</option>
                      <option value="DVD">🎞️ DVD</option>
                      <option value="Box Set">📦 Complete Box Set</option>
                    </select>
                  </div>

                  {/* Edition / Edition Title */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Edition Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Criterion Collection, Steelbook, Director's Cut"
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500"
                    />
                  </div>

                  {/* Number of Discs */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Number of Discs</label>
                    <input
                      type="number"
                      min="1"
                      value={discsCount}
                      onChange={(e) => setDiscsCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Shelf Location Dropdown & Custom Entry */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-slate-300 font-semibold block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Shelf Location {isWishlist ? '(Not Required)' : '*'}
                      </span>
                      {!isAddingCustomShelf && (
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomShelf(true)}
                          className="text-[10px] text-cyan-400 hover:underline font-bold"
                        >
                          + Create New Shelf
                        </button>
                      )}
                    </label>

                    {isAddingCustomShelf ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type new shelf name (e.g. Master Bedroom Rack 3)..."
                          value={customShelfInput}
                          onChange={(e) => setCustomShelfInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customShelfInput.trim()) {
                              const updated = saveShelfLocation(customShelfInput.trim());
                              setShelfLocations(updated);
                              setShelfLocation(customShelfInput.trim());
                              setCustomShelfInput('');
                              setIsAddingCustomShelf(false);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomShelf(false)}
                          className="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        value={shelfLocation}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingCustomShelf(true);
                          } else {
                            setShelfLocation(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-semibold"
                      >
                        {shelfLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            📍 {loc}
                          </option>
                        ))}
                        <option value="__add_new__">➕ Add New Shelf Location...</option>
                      </select>
                    )}
                  </div>

                  {/* Disc Condition */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Disc Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500"
                    >
                      <option value="Mint">Mint (Brand New / Sealed)</option>
                      <option value="Like New">Like New (Perfect Discs)</option>
                      <option value="Good">Good (Minor case wear)</option>
                      <option value="Fair">Fair (Scratched/Playable)</option>
                    </select>
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Purchase Price ({getCurrencyOption().symbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="24.99"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* UK Retailer Dropdown */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" /> Retailer (United Kingdom)
                    </label>
                    <select
                      value={purchaseRetailer}
                      onChange={(e) => setPurchaseRetailer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-semibold"
                    >
                      {UK_RETAILERS.map((ret) => (
                        <option key={ret} value={ret}>
                          🛒 {ret}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barcode UPC */}
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-cyan-400" /> Barcode Number (UPC)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 025192067082"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Digital Code Redeemed & Wishlist Option */}
                  <div className="flex flex-wrap items-center gap-6 pt-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="codeRedeemed"
                        checked={digitalCodeRedeemed}
                        onChange={(e) => setDigitalCodeRedeemed(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="codeRedeemed" className="text-xs text-slate-300 font-medium cursor-pointer">
                        Digital Code Redeemed
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isWishlistOption"
                        checked={isWishlist}
                        onChange={(e) => setIsWishlist(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                      />
                      <label htmlFor="isWishlistOption" className="text-xs text-amber-300 font-bold cursor-pointer flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" /> Wishlist Item (Not Yet Acquired)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Custom Vault Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. IMAX aspect ratio shift, Dolby Atmos demo disc, includes Slipcover"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('search')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Back to Search
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all ${
                  isWishlist
                    ? 'bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-amber-600/25'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-600/25'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isWishlist ? (
                  <Bookmark className="w-4 h-4 text-amber-200 fill-amber-200/20" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isWishlist ? 'Save to Wishlist' : 'Save to Blu-Vault'}</span>
              </button>
            </div>

          </form>
        )}

      </div>

      {/* TV SHOW SEASONS POP-UP MODAL */}
      {showSeasonSelectPopup && selectedResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-2xl rounded-3xl shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Add TV Show Seasons
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select multiple seasons included in your physical box set
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSeasonSelectPopup(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Show Info & Preset Controls Header */}
            <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedResult.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80'}
                  alt={selectedResult.title || selectedResult.name}
                  className="w-14 aspect-[2/3] object-cover rounded-xl border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-base text-white truncate">{selectedResult.title || selectedResult.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{selectedResult.release_date ? new Date(selectedResult.release_date).getFullYear() : '2023'}</span>
                    <span>•</span>
                    <span className="font-bold text-cyan-400">
                      {(selectedResult.seasons && selectedResult.seasons.length > 0 ? selectedResult.seasons.length : (selectedResult.numberOfSeasons || 1))} Total Seasons Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Preset Selector Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const seasonsToUse = selectedResult.seasons && selectedResult.seasons.length > 0
                      ? selectedResult.seasons
                      : Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1 }));
                    const all = seasonsToUse.map((s: any) => s.seasonNumber);
                    setSelectedSeasonsList(all);
                    setTvCollectionType('complete');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Select All ({(selectedResult.seasons && selectedResult.seasons.length > 0 ? selectedResult.seasons.length : (selectedResult.numberOfSeasons || 1))} Seasons)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeasonsList([]);
                    setTvCollectionType('seasons');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Clear All
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeasonsList([1]);
                    setTvCollectionType('seasons');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Season 1 Only
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const seasonsToUse = selectedResult.seasons && selectedResult.seasons.length > 0
                      ? selectedResult.seasons
                      : Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1, name: `Season ${i + 1}` }));
                    const lastSeason = seasonsToUse[seasonsToUse.length - 1];
                    if (lastSeason) {
                      setSelectedSeasonsList([lastSeason.seasonNumber]);
                      setTvCollectionType('seasons');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Latest Season ({(selectedResult.seasons && selectedResult.seasons.length > 0 ? selectedResult.seasons.length : (selectedResult.numberOfSeasons || 1))}) Only
                </button>
              </div>
            </div>

            {/* Seasons Selection Grid (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Check All Seasons Belonging to This Physical Release:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const seasonsToUse = selectedResult.seasons && selectedResult.seasons.length > 0
                    ? selectedResult.seasons
                    : Array.from({ length: selectedResult.numberOfSeasons || 1 }, (_, i) => ({ seasonNumber: i + 1, name: `Season ${i + 1}`, episodeCount: 10 }));

                  return seasonsToUse.map((seasonData: any) => {
                    const sn = seasonData.seasonNumber;
                    const isSelected = selectedSeasonsList.includes(sn);
                    const epCount = seasonData.episodeCount || 10;
                    const nameLabel = seasonData.name || (sn === 0 ? 'Specials & Christmas Specials' : `Season ${sn}`);
                    const badgeLabel = sn === 0 ? 'Specials' : `S${sn}`;

                    return (
                      <div
                        key={sn}
                        onClick={() => {
                          if (isSelected) {
                            const next = selectedSeasonsList.filter(s => s !== sn);
                            setSelectedSeasonsList(next);
                            if (next.length === seasonsToUse.length) setTvCollectionType('complete');
                            else setTvCollectionType('seasons');
                          } else {
                            const next = [...selectedSeasonsList, sn].sort((a, b) => a - b);
                            setSelectedSeasonsList(next);
                            if (next.length === seasonsToUse.length) setTvCollectionType('complete');
                            else setTvCollectionType('seasons');
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`px-2 py-1.5 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {badgeLabel}
                          </div>
                          <div className="min-w-0">
                            <h5 className={`text-xs font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {nameLabel}
                            </h5>
                            <p className="text-[11px] text-slate-400 font-mono">
                              ~{epCount} Episodes
                            </p>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded-xl transition-all shrink-0 ${
                          isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}>
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-300 font-mono">
                <span className="font-bold text-cyan-400">{selectedSeasonsList.length}</span> Season(s) Selected
                <span className="text-slate-500 ml-2">({selectedSeasonsList.length * 3} Discs)</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const num = selectedResult.numberOfSeasons || 1;
                  const isAll = selectedSeasonsList.length === num;
                  if (isAll) {
                    setTvCollectionType('complete');
                  } else {
                    setTvCollectionType('seasons');
                  }
                  setDiscsCount(selectedSeasonsList.length * 3);
                  setShowSeasonSelectPopup(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Seasons Selection</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
