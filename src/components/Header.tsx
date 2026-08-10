import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Scan, 
  Plus, 
  User as UserIcon, 
  ChevronDown,
  ShieldCheck,
  Settings,
  Users,
  LogOut,
  Sparkles,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { User } from '../types';
import { LogoIcon } from './LogoIcon';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser: User | null;
  onOpenUserSettings?: () => void;
  onOpenSettings?: () => void;
  onOpenAddMedia: () => void;
  onOpenBarcodeScanner?: () => void;
  onLogout?: () => void;
  totalMediaCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  currentUser,
  onOpenUserSettings,
  onOpenSettings,
  onOpenAddMedia,
  onOpenBarcodeScanner,
  onLogout,
  totalMediaCount,
  theme = 'dark',
  onToggleTheme
}) => {

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-white h-16 px-4 lg:px-6 flex items-center justify-between shadow-xl">
      {/* Left side: Hamburger Toggle & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-6 h-6 text-blue-400" />
        </button>

        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          <LogoIcon size="md" />
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-wider">BLU-VAULT</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                0.1 Alpha
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono -mt-1">Homelab Physical Media Manager</p>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Input */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search titles, barcode, director, genres, or shelf location..."
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right side: Action Buttons & Dropdown User Window */}
      <div className="flex items-center gap-2">
        {/* Add Media Button */}
        {(!currentUser?.permissions || currentUser.permissions.canAddMedia) && (
          <button
            onClick={onOpenAddMedia}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Add Media</span>
          </button>
        )}

        {/* User Dropdown Window Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all border ${
              isDropdownOpen
                ? 'bg-slate-800 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200'
            }`}
          >
            <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-base border border-slate-700/80 shadow-inner">
              {currentUser?.avatar || '🛡️'}
            </span>
            <div className="text-left hidden md:block">
              <p className="font-semibold text-white leading-none text-xs">{currentUser?.username || 'Vault Master'}</p>
              <p className="text-[10px] text-slate-400 capitalize font-mono mt-0.5">{currentUser?.role || 'Shared Library'}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/80 z-50 p-2 text-slate-100 animate-fade-in divide-y divide-slate-800/80">
              
              {/* Profile Card Header */}
              <div className="p-3 bg-slate-950/60 rounded-xl mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                    {currentUser?.avatar || '🛡️'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-white truncate">{currentUser?.username || 'Vault Master'}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize bg-indigo-950 text-indigo-300 border border-indigo-800/60 mt-0.5">
                      {currentUser?.role || 'Master Admin'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Actions Group */}
              <div className="py-1 space-y-0.5">
                
                {/* System Settings Option */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 group-hover:bg-cyan-900/80 transition-colors">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white group-hover:text-cyan-300 transition-colors">Settings</p>
                    <p className="text-[10px] text-slate-400">API keys, TMDB & system controls</p>
                  </div>
                </button>

                {/* User Profile Option */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenUserSettings) onOpenUserSettings();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/50 text-indigo-400 group-hover:bg-indigo-900/80 transition-colors">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">User Profile</p>
                    <p className="text-[10px] text-slate-400">Password, avatar & account details</p>
                  </div>
                </button>

                {/* Dark / White Theme Toggle Option */}
                <button
                  onClick={() => {
                    if (onToggleTheme) onToggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border transition-colors ${
                      theme === 'light'
                        ? 'bg-amber-950/80 border-amber-800/50 text-amber-400 group-hover:bg-amber-900/80'
                        : 'bg-indigo-950/80 border-indigo-800/50 text-indigo-400 group-hover:bg-indigo-900/80'
                    }`}>
                      {theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Theme Mode
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {theme === 'light' ? 'Light / White canvas' : 'Dark / Vault canvas'}
                      </p>
                    </div>
                  </div>

                  <div className={`px-2 py-1 rounded-lg text-[10px] font-mono font-extrabold border transition-all ${
                    theme === 'light'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                  }`}>
                    {theme === 'light' ? '☀️ WHITE' : '🌙 DARK'}
                  </div>
                </button>

              </div>

              {/* Log Out Group */}
              {onLogout && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 text-xs font-medium text-left transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-400 group-hover:bg-rose-900/80 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-rose-300 group-hover:text-rose-200 transition-colors">Log Out</p>
                      <p className="text-[10px] text-rose-400/80">End session & exit server</p>
                    </div>
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </header>
  );
};
