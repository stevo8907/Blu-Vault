import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MediaCard } from './components/MediaCard';
import { MediaDetailModal } from './components/MediaDetailModal';
import { AddMediaModal } from './components/AddMediaModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { LoanTrackerView } from './components/LoanTrackerView';
import { VaultStatsView } from './components/VaultStatsView';
import { ApiSettingsView } from './components/ApiSettingsView';
import { UserManagementView } from './components/UserManagementView';
import { UserSettingsModal } from './components/UserSettingsModal';
import { OobeSetupView } from './components/OobeSetupView';
import { LoginView } from './components/LoginView';

import { EditMediaModal } from './components/EditMediaModal';
import { SeasonCard } from './components/SeasonCard';
import { MediaItem, User, ViewCategory } from './types';
import { fetchMedia, fetchUsers, checkAuthStatus, logoutUser, updateLoanStatus, toggleFavorite, deleteMediaItem, updateMediaItem } from './lib/api';
import { getSavedNavItems } from './lib/navConfig';
import { Disc, Film, Tv, Sparkles, Filter, Plus, Scan, Lock, Layers, ChevronDown, ChevronUp } from 'lucide-react';

export default function App() {
  const [screenState, setScreenState] = useState<'LOADING' | 'OOBE' | 'LOGIN' | 'APP'>('LOADING');
  const [isOobeAvailable, setIsOobeAvailable] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ViewCategory>('movies-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'year-desc' | 'rating'>('newest');

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('bluvault_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('bluvault_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Media data
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Users data
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modals state
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<MediaItem | null>(null);
  const [selectedSeasonForModal, setSelectedSeasonForModal] = useState<number | undefined>(undefined);
  const [editingMediaItem, setEditingMediaItem] = useState<MediaItem | null>(null);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [prefilledBarcodeData, setPrefilledBarcodeData] = useState<any>(null);

  // TV Shows Seasons Collapse / Expand State
  const [expandedShowIds, setExpandedShowIds] = useState<Set<string>>(new Set());

  // Load initial auth and system status
  useEffect(() => {
    initAuthAndSystem();
  }, []);

  const initAuthAndSystem = async () => {
    setIsLoadingMedia(true);
    try {
      const authStatus = await checkAuthStatus();
      if (authStatus.isOobeRequired) {
        setIsOobeAvailable(true);
        setScreenState('OOBE');
        setIsLoadingMedia(false);
        return;
      }

      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);

      const savedUserStr = localStorage.getItem('bluvault_user');
      if (savedUserStr) {
        try {
          const parsedUser = JSON.parse(savedUserStr);
          const match = fetchedUsers.find(u => u.id === parsedUser.id || u.username.toLowerCase() === parsedUser.username.toLowerCase());
          if (match) {
            setCurrentUser(match);
            setScreenState('APP');
          } else {
            setScreenState('LOGIN');
          }
        } catch (e) {
          setScreenState('LOGIN');
        }
      } else {
        setScreenState('LOGIN');
      }

      const fetchedMedia = await fetchMedia();
      setMediaItems(fetchedMedia);
    } catch (err) {
      console.error('Failed server auth check:', err);
      setScreenState('LOGIN');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [fetchedMedia, fetchedUsers] = await Promise.all([
        fetchMedia(),
        fetchUsers()
      ]);
      setMediaItems(fetchedMedia);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed loading database:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('bluvault_user');
    setCurrentUser(null);
    setScreenState('LOGIN');
  };

  const handleRefreshMedia = async () => {
    try {
      const data = await fetchMedia();
      setMediaItems(data);
    } catch (err) {
      console.error('Failed refreshing media:', err);
    }
  };

  // Helper functions for filtering and counts
  const isAnimeItem = (m: MediaItem) => m.type === 'anime' || (m.genres && m.genres.some(g => g.toLowerCase() === 'anime'));

  const isAnimeMovie = (m: MediaItem) => {
    if (!isAnimeItem(m)) return false;
    if (m.animeType === 'movie') return true;
    if (m.animeType === 'tv') return false;
    return !m.numberOfSeasons || m.numberOfSeasons <= 0;
  };

  const isAnimeTv = (m: MediaItem) => {
    if (!isAnimeItem(m)) return false;
    if (m.animeType === 'tv') return true;
    if (m.animeType === 'movie') return false;
    return Boolean(m.numberOfSeasons && m.numberOfSeasons > 0);
  };

  const isMovieItem = (m: MediaItem) => m.type === 'movie';
  const isTvItem = (m: MediaItem) => m.type === 'tv';

  // Filter media items
  const getFilteredMedia = () => {
    let list = [...mediaItems];

    // Wishlist vs Vault Library split
    if (activeCategory === 'wishlist') {
      list = list.filter(m => Boolean(m.isWishlist));
    } else {
      list = list.filter(m => !m.isWishlist);
    }

    // Global Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.cast && m.cast.some(c => c.toLowerCase().includes(q))) ||
        (m.barcode && m.barcode.includes(q)) ||
        (m.genres && m.genres.some(g => g.toLowerCase().includes(q))) ||
        m.shelfLocation.toLowerCase().includes(q)
      );
    }

    // Category filter
    switch (activeCategory) {
      case 'wishlist':
        // Already filtered above
        break;
      case 'movies-all':
        list = list.filter(m => m.type === 'movie');
        break;
      case 'movies-4k':
        list = list.filter(m => m.type === 'movie' && (m.format.includes('4K') || m.format.includes('Steelbook')));
        break;
      case 'movies-bluray':
        list = list.filter(m => m.type === 'movie' && m.format.includes('Blu-Ray') && !m.format.includes('4K'));
        break;
      case 'movies-dvd':
        list = list.filter(m => m.type === 'movie' && m.format === 'DVD');
        break;
      case 'movies-special':
        list = list.filter(m => m.type === 'movie' && (m.format === '3D Blu-Ray' || (m.edition && m.edition.toLowerCase().includes('criterion'))));
        break;
      case 'tv-all':
        list = list.filter(m => m.type === 'tv');
        break;
      case 'tv-4k':
        list = list.filter(m => m.type === 'tv' && m.format.includes('4K'));
        break;
      case 'tv-bluray':
        list = list.filter(m => m.type === 'tv' && m.format.includes('Blu-Ray'));
        break;
      case 'tv-dvd':
        list = list.filter(m => m.type === 'tv' && m.format === 'DVD');
        break;
      case 'tv-boxsets':
        list = list.filter(m => m.type === 'tv' && m.format === 'Box Set');
        break;
      case 'anime-all':
        list = list.filter(isAnimeItem);
        break;
      case 'anime-movies':
        list = list.filter(isAnimeMovie);
        break;
      case 'anime-tv':
        list = list.filter(isAnimeTv);
        break;
      case 'games-all':
        list = list.filter(m => m.type === 'game');
        break;
      case 'games-ps':
        list = list.filter(m => m.type === 'game' && m.format.includes('PlayStation'));
        break;
      case 'games-xbox':
        list = list.filter(m => m.type === 'game' && m.format.includes('Xbox'));
        break;
      case 'games-nintendo':
        list = list.filter(m => m.type === 'game' && m.format.includes('Nintendo'));
        break;
      default: {
        const customNavItem = getSavedNavItems().find(item => item.id === activeCategory);
        if (customNavItem) {
          const typeMap: Record<string, string> = { movies: 'movie', tv: 'tv', games: 'game', anime: 'anime' };
          const targetType = typeMap[customNavItem.group];
          if (targetType === 'anime') {
            list = list.filter(m => m.type === 'anime' || (m.genres && m.genres.some(g => g.toLowerCase() === 'anime')));
          } else {
            list = list.filter(m => m.type === targetType);
          }

          const kw = (customNavItem.customKeyword || customNavItem.label).toLowerCase().trim();
          if (kw) {
            list = list.filter(m =>
              m.title.toLowerCase().includes(kw) ||
              m.format.toLowerCase().includes(kw) ||
              (m.edition && m.edition.toLowerCase().includes(kw)) ||
              (m.genres && m.genres.some(g => g.toLowerCase().includes(kw))) ||
              (m.shelfLocation && m.shelfLocation.toLowerCase().includes(kw))
            );
          }
        }
        break;
      }
    }

    // Sort order
    if (sortBy === 'year-desc') {
      list.sort((a, b) => b.releaseYear - a.releaseYear);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }

    return list;
  };

  const filteredMedia = getFilteredMedia();

  // Helper to check if item is a TV Show (regular TV or Anime TV series)
  const isTvShowItem = (item: MediaItem) => {
    return item.type === 'tv' || (item.type === 'anime' && isAnimeTv(item)) || Boolean(item.numberOfSeasons && item.numberOfSeasons > 0) || Boolean(item.seasons && item.seasons.length > 0);
  };

  const toggleShowExpand = (showId: string) => {
    setExpandedShowIds(prev => {
      const next = new Set(prev);
      if (next.has(showId)) {
        next.delete(showId);
      } else {
        next.add(showId);
      }
      return next;
    });
  };

  const tvShowsInView = filteredMedia.filter(isTvShowItem);
  const hasTvShowsInView = tvShowsInView.length > 0;
  const allTvShowsExpanded = hasTvShowsInView && tvShowsInView.every(item => expandedShowIds.has(item.id));

  const toggleExpandAllTvShows = () => {
    if (allTvShowsExpanded) {
      setExpandedShowIds(new Set());
    } else {
      setExpandedShowIds(new Set(tvShowsInView.map(m => m.id)));
    }
  };

  const handleToggleSeasonOwned = async (mediaId: string, seasonNumber: number) => {
    const item = mediaItems.find(m => m.id === mediaId);
    if (!item) return;
    const currentSeasons = item.seasons && item.seasons.length > 0 
      ? item.seasons 
      : Array.from({ length: item.numberOfSeasons || 1 }, (_, i) => ({
          seasonNumber: i + 1,
          name: `Season ${i + 1}`,
          episodeCount: 10,
          ownedInVault: true
        }));

    const updatedSeasons = currentSeasons.map(s => {
      if (s.seasonNumber === seasonNumber) {
        return { ...s, ownedInVault: s.ownedInVault === false ? true : false };
      }
      return s;
    });

    const updatedItem: MediaItem = {
      ...item,
      seasons: updatedSeasons
    };

    await handleSaveEditItem(updatedItem);
  };

  // Library vs Wishlist separation
  const ownedMedia = mediaItems.filter(m => !m.isWishlist);
  const wishlistMedia = mediaItems.filter(m => m.isWishlist);

  // Item counts for sidebar
  const itemsCount = {
    total: ownedMedia.length,
    movies: ownedMedia.filter(isMovieItem).length,
    tv: ownedMedia.filter(isTvItem).length,
    anime: ownedMedia.filter(isAnimeItem).length,
    games: ownedMedia.filter(m => m.type === 'game').length,
    loans: ownedMedia.filter(m => m.loanStatus?.isLentOut).length,
    fourK: ownedMedia.filter(m => m.format.includes('4K')).length,
    wishlist: wishlistMedia.length
  };

  // Handlers
  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const isFav = await toggleFavorite(id);
      setMediaItems(prev => prev.map(m => m.id === id ? { ...m, isFavorite: isFav } : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWishlist = async (id: string) => {
    const target = mediaItems.find(m => m.id === id);
    if (!target) return;
    const newWishlistStatus = !target.isWishlist;
    try {
      await updateMediaItem(id, { isWishlist: newWishlistStatus });
      setMediaItems(prev => prev.map(m => m.id === id ? { ...m, isWishlist: newWishlistStatus } : m));
      if (selectedMediaDetail && selectedMediaDetail.id === id) {
        setSelectedMediaDetail({ ...selectedMediaDetail, isWishlist: newWishlistStatus });
      }
    } catch (err) {
      console.error('Failed toggling wishlist state:', err);
    }
  };

  const handleUpdateLoan = async (id: string, loanData: any) => {
    if (currentUser?.permissions && currentUser.permissions.canManageLoans === false) {
      alert('Permission denied: Your user account does not have permission to manage loans.');
      return;
    }
    try {
      const updated = await updateLoanStatus(id, loanData);
      setMediaItems(prev => prev.map(m => m.id === id ? updated : m));
      if (selectedMediaDetail?.id === id) {
        setSelectedMediaDetail(updated);
      }
    } catch (err) {
      alert('Failed to update loan status');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (currentUser?.permissions && currentUser.permissions.canDeleteMedia === false) {
      alert('Permission denied: Your user account does not have permission to delete media.');
      return;
    }
    try {
      await deleteMediaItem(id);
      setMediaItems(prev => prev.filter(m => m.id !== id));
      setSelectedMediaDetail(null);
    } catch (err) {
      alert('Failed to delete item from vault');
    }
  };

  const handleSaveEditItem = async (updatedItem: MediaItem) => {
    if (currentUser?.permissions && currentUser.permissions.canEditMedia === false) {
      alert('Permission denied: Your user account does not have permission to edit media.');
      return;
    }
    try {
      const saved = await updateMediaItem(updatedItem.id, updatedItem);
      setMediaItems(prev => prev.map(m => m.id === saved.id ? saved : m));
      if (selectedMediaDetail?.id === saved.id) {
        setSelectedMediaDetail(saved);
      }
      setEditingMediaItem(null);
    } catch (err) {
      alert('Failed to update item details');
    }
  };

  const handleBarcodeScanned = (barcodeData: any) => {
    setPrefilledBarcodeData(barcodeData);
    setIsAddMediaOpen(true);
  };

  const handleMediaAdded = (newItem: MediaItem) => {
    setMediaItems(prev => [newItem, ...prev]);
    setPrefilledBarcodeData(null);
  };

  if (screenState === 'OOBE') {
    return (
      <OobeSetupView
        onCompleteOobe={() => {
          setIsOobeAvailable(false);
          setScreenState('LOGIN');
        }}
      />
    );
  }

  if (screenState === 'LOGIN') {
    return (
      <LoginView
        onLoginSuccess={(usr) => {
          setCurrentUser(usr);
          localStorage.setItem('bluvault_user', JSON.stringify(usr));
          setScreenState('APP');
          loadInitialData();
        }}
        onRequestOobe={() => setScreenState('OOBE')}
        isOobeAvailable={isOobeAvailable}
      />
    );
  }

  if (screenState === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-4 font-sans">
        <Disc className="w-12 h-12 animate-spin text-cyan-400" />
        <p className="text-xs font-mono">Initializing Blu-Vault Homelab Server...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onOpenUserSettings={() => setIsUserSettingsOpen(true)}
        onOpenAddMedia={() => {
          if (activeCategory === 'add-media') return;
          setIsAddMediaOpen(true);
        }}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onLogout={handleLogout}
        totalMediaCount={mediaItems.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Off-canvas Hamburger Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            if (cat === 'add-media') {
              setIsAddMediaOpen(true);
            } else {
              setActiveCategory(cat);
            }
          }}
          currentUser={currentUser}
          itemsCount={itemsCount}
          onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        />

        {/* Content Body Area */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'} p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full`}>
          
          {/* LOAN TRACKER VIEW */}
          {activeCategory === 'loans' && (
            <LoanTrackerView
              mediaItems={mediaItems}
              currentUser={currentUser}
              onReturnDisc={(id) => handleUpdateLoan(id, { isLentOut: false })}
              onSelectItem={(item) => setSelectedMediaDetail(item)}
            />
          )}

          {/* VAULT STATS VIEW */}
          {activeCategory === 'stats' && (
            <VaultStatsView mediaItems={mediaItems} />
          )}

          {/* API SETTINGS VIEW */}
          {activeCategory === 'api-settings' && (
            <ApiSettingsView
              currentUser={currentUser}
              onMediaImported={handleRefreshMedia}
              onSystemReset={() => {
                localStorage.clear();
                window.location.reload();
              }}
            />
          )}

          {/* USER MANAGEMENT VIEW */}
          {activeCategory === 'user-management' && (
            <UserManagementView
              users={users}
              currentUser={currentUser}
              onRefreshUsers={async () => {
                const u = await fetchUsers();
                setUsers(u);
              }}
            />
          )}

          {/* PRIMARY MEDIA GRID LIBRARIES (Movies / TV / Games) */}
          {activeCategory !== 'loans' && 
           activeCategory !== 'stats' && 
           activeCategory !== 'api-settings' && 
           activeCategory !== 'user-management' && (
            currentUser?.permissions && currentUser.permissions.canViewMedia === false ? (
              <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-w-2xl mx-auto text-center space-y-4 shadow-2xl my-12 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">Access Restricted</h2>
                  <p className="text-sm text-slate-400 mt-2">
                    Your user profile (<span className="text-cyan-400 font-bold">{currentUser.username}</span>) does not have permission to view media titles in this vault.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Library Bar Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white capitalize tracking-wide">
                        {activeCategory === 'wishlist' ? 'Vault Wishlist' : activeCategory.replace('-', ' ')}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold ${
                        activeCategory === 'wishlist'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                          : 'bg-blue-950 text-blue-300 border-blue-700/50'
                      }`}>
                        {filteredMedia.length} titles
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {activeCategory === 'wishlist' ? 'Desired Media & Discs To Acquire For Vault' : 'Shared Homelab Vault Collection'}
                    </p>
                  </div>

                  {/* Sort Controls & Expand Seasons Action */}
                  <div className="flex items-center gap-3">
                    {hasTvShowsInView && (
                      <button
                        onClick={toggleExpandAllTvShows}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-indigo-700/80 hover:border-indigo-500 text-xs font-bold text-indigo-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title={allTvShowsExpanded ? 'Collapse all TV seasons into show covers' : 'Expand all TV show covers to view individual seasons'}
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{allTvShowsExpanded ? 'Collapse All Seasons' : 'Expand All Seasons'}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="newest">Recently Added</option>
                        <option value="year-desc">Release Year</option>
                        <option value="rating">Highest Rating</option>
                        <option value="title">Alphabetical (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grid of Physical Media Discs */}
                {isLoadingMedia ? (
                  <div className="py-20 text-center text-slate-400 space-y-3">
                    <Disc className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                    <p className="text-sm font-mono">Loading Homelab Blu-Vault database...</p>
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto space-y-4">
                    <Disc className="w-12 h-12 text-slate-600 mx-auto" />
                    <div>
                      <h3 className="font-bold text-lg text-white">No Physical Media Found</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        No disc items match your active category or search query "{searchQuery}".
                      </p>
                    </div>
                    {(!currentUser?.permissions || currentUser.permissions.canAddMedia !== false) && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setIsAddMediaOpen(true)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                          <Film className="w-4 h-4" />
                          <span>Add first Movie to Vault</span>
                        </button>

                        <button
                          onClick={() => setIsAddMediaOpen(true)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                          <Tv className="w-4 h-4" />
                          <span>Add first TV Show to Vault</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    {filteredMedia.map((item, idx) => {
                      const isTv = isTvShowItem(item);
                      const seasonsList = item.seasons && item.seasons.length > 0
                        ? item.seasons
                        : Array.from({ length: item.numberOfSeasons || 1 }, (_, i) => ({
                            seasonNumber: i + 1,
                            name: `Season ${i + 1}`,
                            episodeCount: 10,
                            ownedInVault: true
                          }));
                      const isExpanded = isTv && expandedShowIds.has(item.id);

                      return (
                        <React.Fragment key={`${item.id}-${idx}`}>
                          <MediaCard
                            item={item}
                            onClick={() => {
                              setSelectedSeasonForModal(undefined);
                              setSelectedMediaDetail(item);
                            }}
                            onToggleFavorite={(e) => handleToggleFavorite(e, item.id)}
                            isTvShow={isTv}
                            seasonsCount={seasonsList.length}
                            isExpanded={isExpanded}
                            onToggleExpand={() => toggleShowExpand(item.id)}
                          />

                          {/* Expanded TV Show Seasons Drawer */}
                          {isExpanded && (
                            <div className="col-span-full bg-slate-950/95 border-2 border-indigo-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/60 space-y-4 my-2 animate-fade-in relative overflow-hidden">
                              {/* Header banner for expanded seasons */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/40">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-2xl bg-indigo-950 border border-indigo-700/50 text-indigo-400 shadow-md">
                                    <Layers className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                                      <span>{item.title}</span>
                                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-mono font-bold">
                                        {seasonsList.length} {seasonsList.length === 1 ? 'Season' : 'Seasons'}
                                      </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                      Individual season physical media discs in vault • Click any season to view episodes & details
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => toggleShowExpand(item.id)}
                                  className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                  <ChevronUp className="w-4 h-4 text-indigo-400" />
                                  <span>Collapse Seasons</span>
                                </button>
                              </div>

                              {/* Grid of Season Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                                {seasonsList.map((season) => (
                                  <SeasonCard
                                    key={`${item.id}-season-${season.seasonNumber}`}
                                    parentItem={item}
                                    season={season}
                                    onClick={() => {
                                      setSelectedSeasonForModal(season.seasonNumber);
                                      setSelectedMediaDetail(item);
                                    }}
                                    onToggleOwned={(e) => {
                                      e.stopPropagation();
                                      handleToggleSeasonOwned(item.id, season.seasonNumber);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

              </div>
            )
          )}

        </main>
      </div>

      {/* DETAILED MEDIA ITEM MODAL */}
      {selectedMediaDetail && (
        <MediaDetailModal
          item={selectedMediaDetail}
          initialSeasonNum={selectedSeasonForModal}
          currentUser={currentUser}
          onClose={() => {
            setSelectedMediaDetail(null);
            setSelectedSeasonForModal(undefined);
          }}
          onEdit={(item) => setEditingMediaItem(item)}
          onDelete={handleDeleteItem}
          onUpdateLoan={handleUpdateLoan}
          onToggleFavorite={async (id) => {
            const isFav = await toggleFavorite(id);
            setMediaItems(prev => prev.map(m => m.id === id ? { ...m, isFavorite: isFav } : m));
            if (selectedMediaDetail) {
              setSelectedMediaDetail({ ...selectedMediaDetail, isFavorite: isFav });
            }
          }}
          onToggleWishlist={handleToggleWishlist}
          onItemUpdated={(updatedItem) => {
            setMediaItems(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
            setSelectedMediaDetail(updatedItem);
          }}
          onRefreshItem={async () => {
            const data = await fetchMedia();
            setMediaItems(data);
          }}
        />
      )}

      {/* EDIT MEDIA ITEM MODAL */}
      {editingMediaItem && (
        <EditMediaModal
          item={editingMediaItem}
          isOpen={!!editingMediaItem}
          onClose={() => setEditingMediaItem(null)}
          onSave={handleSaveEditItem}
        />
      )}

      {/* ADD MEDIA MODAL (TMDB API SEARCH & REVIEW STEP) */}
      {isAddMediaOpen && (
        <AddMediaModal
          isOpen={isAddMediaOpen}
          onClose={() => {
            setIsAddMediaOpen(false);
            setPrefilledBarcodeData(null);
          }}
          currentUser={currentUser}
          onMediaAdded={handleMediaAdded}
          onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
          prefilledBarcodeData={prefilledBarcodeData}
        />
      )}

      {/* BARCODE SCANNER MODAL */}
      {isBarcodeScannerOpen && (
        <BarcodeScannerModal
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {/* USER SETTINGS MODAL */}
      {isUserSettingsOpen && (
        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          currentUser={currentUser}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            localStorage.setItem('bluvault_user', JSON.stringify(updatedUser));
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          }}
          onNavigateToUserManagement={() => {
            setActiveCategory('user-management');
          }}
        />
      )}

    </div>
  );
}
