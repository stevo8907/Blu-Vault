import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Tv, 
  Gamepad2, 
  Handshake, 
  BarChart3, 
  PlusCircle, 
  Settings, 
  Users, 
  Disc, 
  Sparkles, 
  ChevronDown,
  ChevronRight,
  Box,
  Library,
  Star,
  PanelLeftClose,
  Wrench,
  Scan,
  Barcode,
  Lock,
  Bookmark
} from 'lucide-react';
import { ViewCategory, User } from '../types';
import { getSavedNavItems, NavItem } from '../lib/navConfig';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: ViewCategory;
  onSelectCategory: (cat: ViewCategory) => void;
  onOpenBarcodeScanner?: () => void;
  currentUser?: User | null;
  itemsCount: {
    total: number;
    movies: number;
    tv: number;
    anime: number;
    games: number;
    loans: number;
    fourK: number;
    wishlist?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
  onOpenBarcodeScanner,
  currentUser,
  itemsCount
}) => {
  // Navigation items from centralized navConfig state
  const [navItems, setNavItems] = useState<NavItem[]>(getSavedNavItems());
  const [showGameNotice, setShowGameNotice] = useState(false);

  useEffect(() => {
    const handleNavUpdated = () => {
      setNavItems(getSavedNavItems());
    };
    window.addEventListener('blu_vault_nav_updated', handleNavUpdated);
    return () => window.removeEventListener('blu_vault_nav_updated', handleNavUpdated);
  }, []);

  // Accordion open state for each category group
  const [openSections, setOpenSections] = useState({
    movies: true,
    tv: true,
    anime: true,
    games: true,
    tools: true
  });

  // Auto-expand section if active category is inside it
  useEffect(() => {
    if (activeCategory.startsWith('movies-') || activeCategory.startsWith('custom-movies-')) {
      setOpenSections(prev => ({ ...prev, movies: true }));
    } else if (activeCategory.startsWith('tv-') || activeCategory.startsWith('custom-tv-')) {
      setOpenSections(prev => ({ ...prev, tv: true }));
    } else if (activeCategory.startsWith('anime-') || activeCategory.startsWith('custom-anime-')) {
      setOpenSections(prev => ({ ...prev, anime: true }));
    } else if (activeCategory.startsWith('games-') || activeCategory.startsWith('custom-games-')) {
      setOpenSections(prev => ({ ...prev, games: true }));
    } else if (['loans', 'stats', 'add-media', 'api-settings', 'user-management'].includes(activeCategory)) {
      setOpenSections(prev => ({ ...prev, tools: true }));
    }
  }, [activeCategory]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNav = (category: ViewCategory) => {
    onSelectCategory(category);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const renderNavIcon = (iconName?: string, group?: 'movies' | 'tv' | 'games' | 'anime') => {
    switch (iconName) {
      case 'film':
        return <Film className="w-3.5 h-3.5 text-blue-400" />;
      case 'tv':
        return <Tv className="w-3.5 h-3.5 text-indigo-400" />;
      case 'gamepad':
        return <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'disc':
        return <Disc className="w-3.5 h-3.5 text-cyan-400" />;
      case 'box':
        return <Box className="w-3.5 h-3.5 text-emerald-400" />;
      case 'star':
        return <Star className="w-3.5 h-3.5 text-purple-400" />;
      default:
        if (group === 'movies') return <Film className="w-3.5 h-3.5 text-blue-400" />;
        if (group === 'tv') return <Tv className="w-3.5 h-3.5 text-indigo-400" />;
        if (group === 'anime') return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
        return <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const visibleMovies = navItems.filter(i => i.group === 'movies' && !i.hidden);
  const visibleTv = navItems.filter(i => i.group === 'tv' && !i.hidden);
  const visibleAnime = navItems.filter(i => i.group === 'anime' && !i.hidden);
  const visibleGames = navItems.filter(i => i.group === 'games' && !i.hidden);

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Off-canvas / Collapsible Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800/80 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:z-30 lg:top-16`}
      >
        {/* Mobile Header / Desktop Collapse Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Disc className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide">BLU-VAULT</h1>
              <p className="text-[10px] text-cyan-400 font-mono">Disc Collection OS</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1 text-xs"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
          </button>
        </div>

        {/* Library Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          
          {/* MOVIES LIBRARY ACCORDION */}
          {visibleMovies.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('movies')}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Movies</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/50 font-mono font-bold">
                    {itemsCount.movies}
                  </span>
                  {openSections.movies ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {openSections.movies && (
                <div className="px-1.5 pb-2 pt-0.5 space-y-0.5 border-t border-slate-800/40">
                  {visibleMovies.map((item) => {
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {renderNavIcon(item.icon, 'movies')}
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TV SHOWS ACCORDION */}
          {visibleTv.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('tv')}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">TV Shows</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono font-bold">
                    {itemsCount.tv}
                  </span>
                  {openSections.tv ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {openSections.tv && (
                <div className="px-1.5 pb-2 pt-0.5 space-y-0.5 border-t border-slate-800/40">
                  {visibleTv.map((item) => {
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {renderNavIcon(item.icon, 'tv')}
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ANIME LIBRARY ACCORDION */}
          {visibleAnime.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleSection('anime')}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Anime</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 font-mono font-bold">
                    {itemsCount.anime}
                  </span>
                  {openSections.anime ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {openSections.anime && (
                <div className="px-1.5 pb-2 pt-0.5 space-y-0.5 border-t border-slate-800/40">
                  {visibleAnime.map((item) => {
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id as ViewCategory)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {renderNavIcon(item.icon, 'anime')}
                          <span className="truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* WISHLIST CATEGORY */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden transition-all">
            <button
              onClick={() => handleNav('wishlist')}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left ${
                activeCategory === 'wishlist'
                  ? 'bg-gradient-to-r from-purple-600 to-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bookmark className={`w-4 h-4 ${activeCategory === 'wishlist' ? 'text-amber-200' : 'text-amber-400'}`} />
                <span className={`text-xs font-bold tracking-wide uppercase ${activeCategory === 'wishlist' ? 'text-white' : 'text-slate-200'}`}>Wishlist</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  activeCategory === 'wishlist'
                    ? 'bg-amber-950/80 text-amber-200 border-amber-400/50'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/50'
                }`}>
                  {itemsCount.wishlist || 0}
                </span>
              </div>
            </button>
          </div>

          {/* VIDEO GAMES ACCORDION - GREYED OUT NON-FUNCTIONAL FEATURE */}
          <div className="bg-slate-950/20 border border-slate-800/40 rounded-2xl overflow-hidden opacity-60 transition-all">
            <button
              onClick={() => {
                setShowGameNotice(true);
                setTimeout(() => setShowGameNotice(false), 3500);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 transition-colors text-left cursor-not-allowed"
              title="Video Game Library is currently non-functional"
            >
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-400 tracking-wide uppercase line-through">Video Games</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-semibold">
                  Non-Functional
                </span>
              </div>
            </button>
            {showGameNotice && (
              <div className="px-3 py-2 bg-amber-950/80 border-t border-amber-800/60 text-[11px] text-amber-200 font-medium animate-fade-in flex items-center gap-1.5">
                <span>⚠️ Video Game Library is currently non-functional.</span>
              </div>
            )}
          </div>

          {/* MANAGEMENT & TOOLS ACCORDION */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden transition-all">
            <button
              onClick={() => toggleSection('tools')}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Vault Tools</span>
              </div>
              {openSections.tools ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.tools && (
              <div className="px-1.5 pb-2 pt-0.5 space-y-1 border-t border-slate-800/40">
                {onOpenBarcodeScanner && (!currentUser?.permissions || currentUser.permissions.canAddMedia !== false) && (
                  <button
                    onClick={() => {
                      onOpenBarcodeScanner();
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-950/80 to-blue-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/40 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Scan className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Scan Disc Barcode</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-700/50">Camera</span>
                  </button>
                )}

                {(!currentUser?.permissions || currentUser.permissions.canAddMedia !== false) && (
                  <button
                    onClick={() => handleNav('add-media')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeCategory === 'add-media'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-md'
                        : 'bg-blue-950/40 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Add Media Disc</span>
                    </div>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">TMDB</span>
                  </button>
                )}

                <button
                  onClick={() => handleNav('loans')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === 'loans'
                      ? 'bg-amber-600 text-white font-bold shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Handshake className="w-3.5 h-3.5 text-amber-400" />
                    <span>Loan Tracker</span>
                  </div>
                  {currentUser?.permissions && currentUser.permissions.canManageLoans === false ? (
                    <Lock className="w-3 h-3 text-slate-500" />
                  ) : itemsCount.loans > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                      {itemsCount.loans}
                    </span>
                  ) : null}
                </button>

                <button
                  onClick={() => handleNav('stats')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === 'stats'
                      ? 'bg-purple-600 text-white font-bold shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Vault Analytics</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('api-settings')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === 'api-settings'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Settings & Power Controls</span>
                  </div>
                  {currentUser?.permissions && currentUser.permissions.canManageApiKeys === false && (
                    <Lock className="w-3 h-3 text-slate-500" />
                  )}
                </button>

                <button
                  onClick={() => handleNav('user-management')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === 'user-management'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>User Accounts</span>
                  </div>
                  {currentUser?.permissions && currentUser.permissions.canManageUsers === false && (
                    <Lock className="w-3 h-3 text-slate-500" />
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* System Footer Status */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px]">Database Online</span>
          </div>
          <span className="text-slate-500 text-[10px]">v0.1 Alpha</span>
        </div>
      </aside>
    </>
  );
};
