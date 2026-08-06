import React, { useState, useEffect } from 'react';
import { formatPrice } from '../lib/currency';
import { TvShowLoanModal } from './TvShowLoanModal';
import { 
  X, 
  MapPin, 
  Tag, 
  Disc, 
  Star, 
  Calendar, 
  Clock, 
  Film, 
  DollarSign, 
  Handshake, 
  Check, 
  Edit3, 
  Trash2, 
  Barcode, 
  ExternalLink,
  ShieldCheck,
  Tv,
  Box,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Plus,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { MediaItem, Season, Episode, User } from '../types';
import { fetchTMDBSeason, saveTVSeason, toggleEpisodeWatched } from '../lib/api';

interface MediaDetailModalProps {
  item: MediaItem;
  currentUser?: User | null;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onUpdateLoan: (id: string, loanData: { isLentOut: boolean; lentTo?: string; dueDate?: string; notes?: string; lentItems?: string[] }) => void;
  onToggleFavorite: (id: string) => void;
  onToggleWishlist?: (id: string) => void;
  onRefreshItem?: () => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  currentUser,
  onClose,
  onEdit,
  onDelete,
  onUpdateLoan,
  onToggleFavorite,
  onToggleWishlist,
  onRefreshItem
}) => {
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showTvLoanModal, setShowTvLoanModal] = useState(false);
  const [lentToName, setLentToName] = useState(item.loanStatus?.lentTo || '');
  const [dueDate, setDueDate] = useState(item.loanStatus?.dueDate || '');
  const [loanNotes, setLoanNotes] = useState(item.loanStatus?.notes || '');
  const [mediaItem, setMediaItem] = useState<MediaItem>(item);

  const handleWishlistClick = () => {
    setMediaItem(prev => ({ ...prev, isWishlist: !prev.isWishlist }));
    if (onToggleWishlist) {
      onToggleWishlist(mediaItem.id);
    }
  };

  // TV Seasons & Episodes State
  const initialSeasons: Season[] = mediaItem.seasons && mediaItem.seasons.length > 0
    ? mediaItem.seasons
    : Array.from({ length: mediaItem.numberOfSeasons || 1 }, (_, i) => ({
        seasonNumber: i + 1,
        name: `Season ${i + 1}`,
        episodeCount: 10,
        ownedInVault: true
      }));

  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(initialSeasons[0]?.seasonNumber || 1);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(false);
  const [showAddSeasonModal, setShowAddSeasonModal] = useState<boolean>(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState<number>(seasons.length + 1);
  const [newSeasonName, setNewSeasonName] = useState<string>(`Season ${seasons.length + 1}`);

  useEffect(() => {
    setMediaItem(item);
    if (item.seasons && item.seasons.length > 0) {
      setSeasons(item.seasons);
    }
  }, [item]);

  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNum) || seasons[0];

  // Auto-fetch episodes for active season if empty and tmdbId exists
  useEffect(() => {
    if (mediaItem.type === 'tv' && activeSeason && (!activeSeason.episodes || activeSeason.episodes.length === 0)) {
      handleFetchSeasonEpisodes(activeSeason.seasonNumber);
    }
  }, [selectedSeasonNum, mediaItem.type]);

  const handleFetchSeasonEpisodes = async (seasonNum: number) => {
    setIsLoadingEpisodes(true);
    try {
      const fetchedSeason = await fetchTMDBSeason(mediaItem.tmdbId || 100088, seasonNum);
      const updatedSeasons = seasons.map(s => {
        if (s.seasonNumber === seasonNum) {
          return {
            ...s,
            name: fetchedSeason.name || s.name,
            overview: fetchedSeason.overview || s.overview,
            episodeCount: fetchedSeason.episodeCount || s.episodeCount,
            episodes: fetchedSeason.episodes
          };
        }
        return s;
      });
      setSeasons(updatedSeasons);

      // Persist to server
      const targetSeason = updatedSeasons.find(s => s.seasonNumber === seasonNum);
      if (targetSeason) {
        const updatedItem = await saveTVSeason(mediaItem.id, targetSeason);
        setMediaItem(updatedItem);
        if (onRefreshItem) onRefreshItem();
      }
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  const handleToggleEpisodeWatched = async (seasonNum: number, epNum: number, currentWatched?: boolean) => {
    const newWatchedState = !currentWatched;

    // Optimistic UI update
    setSeasons(prevSeasons => prevSeasons.map(s => {
      if (s.seasonNumber === seasonNum && s.episodes) {
        return {
          ...s,
          episodes: s.episodes.map(ep => ep.episodeNumber === epNum ? { ...ep, isWatched: newWatchedState } : ep)
        };
      }
      return s;
    }));

    try {
      const updatedItem = await toggleEpisodeWatched(mediaItem.id, seasonNum, epNum, newWatchedState);
      setMediaItem(updatedItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err) {
      console.error('Failed to toggle episode watched state:', err);
    }
  };

  const handleToggleAllSeasonEpisodesWatched = async (seasonNum: number, markAllWatched: boolean) => {
    if (!activeSeason || !activeSeason.episodes) return;

    const updatedEpisodes = activeSeason.episodes.map(e => ({ ...e, isWatched: markAllWatched }));
    const updatedSeason: Season = { ...activeSeason, episodes: updatedEpisodes };

    setSeasons(prev => prev.map(s => s.seasonNumber === seasonNum ? updatedSeason : s));

    try {
      const updatedItem = await saveTVSeason(mediaItem.id, updatedSeason);
      setMediaItem(updatedItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err) {
      console.error('Failed to update season episodes:', err);
    }
  };

  const handleToggleSeasonVaultOwnership = async (seasonNum: number) => {
    const seasonToUpdate = seasons.find(s => s.seasonNumber === seasonNum);
    if (!seasonToUpdate) return;

    const updatedSeason: Season = { ...seasonToUpdate, ownedInVault: !seasonToUpdate.ownedInVault };
    setSeasons(prev => prev.map(s => s.seasonNumber === seasonNum ? updatedSeason : s));

    try {
      const updatedItem = await saveTVSeason(mediaItem.id, updatedSeason);
      setMediaItem(updatedItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err) {
      console.error('Failed to update season vault ownership:', err);
    }
  };

  const handleAddCustomSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSeason: Season = {
      seasonNumber: newSeasonNumber,
      name: newSeasonName,
      episodeCount: 10,
      ownedInVault: true
    };

    const updatedSeasons = [...seasons, newSeason].sort((a, b) => a.seasonNumber - b.seasonNumber);
    setSeasons(updatedSeasons);
    setSelectedSeasonNum(newSeasonNumber);
    setShowAddSeasonModal(false);

    try {
      const updatedItem = await saveTVSeason(mediaItem.id, newSeason);
      setMediaItem(updatedItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err) {
      console.error('Failed to add new season:', err);
    }
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLoan(mediaItem.id, {
      isLentOut: true,
      lentTo: lentToName,
      dueDate,
      notes: loanNotes
    });
    setShowLoanForm(false);
  };

  const handleReturnDisc = () => {
    onUpdateLoan(mediaItem.id, { isLentOut: false });
  };

  const handleDeleteConfirm = () => {
    if (window.confirm(`Are you sure you want to delete "${mediaItem.title}" from your Blu-Vault library?`)) {
      onDelete(mediaItem.id);
    }
  };

  // Watched stats calculation
  const totalEpisodesCount = activeSeason?.episodes?.length || 0;
  const watchedEpisodesCount = activeSeason?.episodes?.filter(e => e.isWatched).length || 0;
  const watchedPercent = totalEpisodesCount > 0 ? Math.round((watchedEpisodesCount / totalEpisodesCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Backdrop Banner Header */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 shrink-0">
          <img
            src={item.backdropUrl || item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover opacity-40 blur-xs scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner Overlaid Quick Details */}
          <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col sm:flex-row items-start sm:items-end gap-5">
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl border-2 border-slate-700/80 shadow-2xl shrink-0 -mb-10 sm:-mb-6 bg-slate-950"
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wide">
                  {item.format}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-xs font-mono text-cyan-300">
                  {item.edition || 'Standard Edition'}
                </span>
                {mediaItem.isWishlist && (
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-950/90 border border-purple-500/50 text-xs font-extrabold text-purple-300 flex items-center gap-1 shadow-md shadow-purple-900/30">
                    <BookmarkCheck className="w-3.5 h-3.5 text-purple-400" /> Wishlist Item
                  </span>
                )}
                {item.barcode && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Barcode className="w-3 h-3 text-cyan-400" /> #{item.barcode}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {item.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                <span>{item.releaseYear}</span>
                <span>•</span>
                {item.runtimeMinutes && (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" /> {item.runtimeMinutes} min
                    </span>
                    <span>•</span>
                  </>
                )}
                {item.numberOfSeasons && (
                  <>
                    <span>{item.numberOfSeasons} Seasons ({item.numberOfEpisodes || '?'} Ep)</span>
                    <span>•</span>
                  </>
                )}
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {item.rating?.toFixed(1) || '8.0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 pt-10 sm:pt-12 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {/* Overview Paragraph */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Overview</h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              {item.overview || 'No overview provided for this physical copy.'}
            </p>
          </div>

          {/* PHYSICAL COLLECTION SPECS GRID */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Disc className="w-4 h-4 text-cyan-400" /> Physical Disc Specs & Location
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block mb-1">Shelf Location</span>
                <span className="text-sm font-bold text-cyan-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{mediaItem.shelfLocation}</span>
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block mb-1">Discs Count</span>
                <span className="text-sm font-bold text-white font-mono">{mediaItem.discsCount} Disc(s)</span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block mb-1">Condition</span>
                <span className="text-sm font-bold text-emerald-400">{mediaItem.condition}</span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium block mb-1">Digital Code</span>
                <span className={`text-sm font-bold ${mediaItem.digitalCodeRedeemed ? 'text-amber-400' : 'text-slate-400'}`}>
                  {mediaItem.digitalCodeRedeemed ? 'Redeemed' : 'Unredeemed / Included'}
                </span>
              </div>
            </div>
          </div>

          {/* TV SHOW SEASONS & EPISODES EXPLORER */}
          {mediaItem.type === 'tv' && (
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Tv className="w-5 h-5 text-cyan-400" /> TV Show Seasons & Episode Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    Explore seasons, manage vault ownership, and track watched episodes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddSeasonModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Add Season
                  </button>
                </div>
              </div>

              {/* Season Tabs List */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {seasons.map(season => {
                  const isActive = season.seasonNumber === selectedSeasonNum;
                  return (
                    <button
                      key={season.seasonNumber}
                      onClick={() => setSelectedSeasonNum(season.seasonNumber)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : season.ownedInVault !== false
                            ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                            : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <span>{season.name || `Season ${season.seasonNumber}`}</span>
                      {season.ownedInVault !== false ? (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'}`}>
                          In Vault
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-400">
                          Missing
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Season Banner & Overview */}
              {activeSeason && (
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{activeSeason.name}</h4>
                        <span className="text-xs text-slate-400 font-mono">({activeSeason.episodeCount || activeSeason.episodes?.length || 0} Episodes)</span>
                      </div>
                      {activeSeason.overview && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">{activeSeason.overview}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleSeasonVaultOwnership(activeSeason.seasonNumber)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          activeSeason.ownedInVault !== false
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {activeSeason.ownedInVault !== false ? '✓ In Vault Collection' : '+ Mark Owned in Vault'}
                      </button>

                      <button
                        onClick={() => handleFetchSeasonEpisodes(activeSeason.seasonNumber)}
                        disabled={isLoadingEpisodes}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                        title="Reload episode details from TMDB"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingEpisodes ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Watched Progress Bar & Batch Actions */}
                  {activeSeason.episodes && activeSeason.episodes.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Season Progress: {watchedEpisodesCount} / {totalEpisodesCount} Episodes Watched</span>
                          <span className="font-mono text-cyan-400 font-bold">{watchedPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${watchedPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleAllSeasonEpisodesWatched(activeSeason.seasonNumber, true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" /> Watch All
                        </button>
                        <button
                          onClick={() => handleToggleAllSeasonEpisodesWatched(activeSeason.seasonNumber, false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3 text-slate-400" /> Unwatch All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Episodes List Grid */}
              {isLoadingEpisodes ? (
                <div className="p-8 text-center space-y-2 bg-slate-950/40 rounded-xl border border-slate-800">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading season episode guide...</p>
                </div>
              ) : activeSeason?.episodes && activeSeason.episodes.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {activeSeason.episodes.map(ep => (
                    <div
                      key={ep.episodeNumber}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        ep.isWatched
                          ? 'bg-slate-900/60 border-slate-800/80 opacity-90'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Still image preview or Episode Badge */}
                        <div className="relative w-20 aspect-video bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                          {ep.stillUrl ? (
                            <img src={ep.stillUrl} alt={ep.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                              Ep {ep.episodeNumber}
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 bg-slate-950/90 text-slate-200 text-[9px] font-mono px-1 rounded">
                            E{ep.episodeNumber}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h5 className={`text-xs font-bold ${ep.isWatched ? 'text-slate-400 line-through' : 'text-white'}`}>
                              {ep.episodeNumber}. {ep.name}
                            </h5>
                            {ep.runtimeMinutes && (
                              <span className="text-[10px] text-slate-500 font-mono">• {ep.runtimeMinutes}m</span>
                            )}
                            {ep.voteAverage && (
                              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400" /> {ep.voteAverage.toFixed(1)}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {ep.overview || 'No synopsis available for this episode.'}
                          </p>

                          {ep.airDate && (
                            <p className="text-[10px] text-slate-500 font-mono">Air Date: {ep.airDate}</p>
                          )}
                        </div>
                      </div>

                      {/* Watched Toggle Checkbox */}
                      <button
                        onClick={() => handleToggleEpisodeWatched(activeSeason.seasonNumber, ep.episodeNumber, ep.isWatched)}
                        className={`p-2 rounded-xl transition-all shrink-0 ${
                          ep.isWatched
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title={ep.isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/80">
                  <p className="text-xs text-slate-400">No episode guide loaded for {activeSeason?.name}.</p>
                  <button
                    onClick={() => handleFetchSeasonEpisodes(selectedSeasonNum)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 text-slate-950 font-bold text-xs hover:bg-cyan-500 transition-all"
                  >
                    Fetch Season Episodes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add Season Modal Inline */}
          {showAddSeasonModal && (
            <div className="p-4 bg-slate-950 border border-cyan-500/40 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Season to Collection
                </h4>
                <button onClick={() => setShowAddSeasonModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomSeason} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Season Number</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newSeasonNumber}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNewSeasonNumber(val);
                        setNewSeasonName(`Season ${val}`);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Season Title</label>
                    <input
                      type="text"
                      required
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSeasonModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400"
                  >
                    Add Season
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CAST & CREW / GENRES */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cast & Crew</h4>
              <p className="text-xs text-slate-300"><strong className="text-slate-200">Director:</strong> {item.director || 'Not listed'}</p>
              <p className="text-xs text-slate-300"><strong className="text-slate-200">Cast:</strong> {item.cast && item.cast.length > 0 ? item.cast.join(', ') : 'Not listed'}</p>
              {item.studio && <p className="text-xs text-slate-300"><strong className="text-slate-200">Studio:</strong> {item.studio}</p>}
            </div>

            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase & Added Info</h4>
              <p className="text-xs text-slate-300"><strong className="text-slate-200">Price Paid:</strong> {item.purchasePrice ? formatPrice(item.purchasePrice) : 'N/A'}</p>
              <p className="text-xs text-slate-300"><strong className="text-slate-200">Added By:</strong> {item.addedByUserName} ({new Date(item.addedAt).toLocaleDateString()})</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.genres?.map((genre, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* NOTES SECTION */}
          {item.notes && (
            <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-2xl">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> Vault Master Notes
              </h4>
              <p className="text-xs text-slate-300 italic">{item.notes}</p>
            </div>
          )}

          {/* LOAN TRACKER CARD / FORM */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">Physical Copy Loan Tracker</h4>
                  <p className="text-xs text-slate-400">Track who in your network or household has borrowed this disc</p>
                </div>
              </div>

              {(!currentUser?.permissions || currentUser.permissions.canManageLoans !== false) && (
                item.loanStatus?.isLentOut ? (
                  <button
                    onClick={handleReturnDisc}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    Mark Returned
                  </button>
                ) : item.type === 'tv' ? (
                  <button
                    onClick={() => setShowTvLoanModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Select Items & Lend Out TV Show</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoanForm(!showLoanForm)}
                    className="px-3.5 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md"
                  >
                    {showLoanForm ? 'Cancel' : 'Lend Out Disc'}
                  </button>
                )
              )}
            </div>

            {/* If currently lent out status banner */}
            {item.loanStatus?.isLentOut && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-2xl text-xs space-y-2">
                <p className="text-amber-200 font-bold flex items-center justify-between">
                  <span>Currently Lent Out</span>
                  {item.type === 'tv' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      TV Show Loan
                    </span>
                  )}
                </p>
                <p className="text-slate-300"><strong>Borrowed By:</strong> {item.loanStatus.lentTo || 'Unknown'}</p>

                {/* Display Selected Lent Items / Seasons / Discs */}
                {item.loanStatus.lentItems && item.loanStatus.lentItems.length > 0 && (
                  <div className="pt-1.5 border-t border-amber-900/40 space-y-1">
                    <span className="text-[10px] font-bold text-amber-300/80 uppercase tracking-wider block">Lent Items / Seasons:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.loanStatus.lentItems.map((lentItem, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px] font-mono font-bold"
                        >
                          {lentItem}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.loanStatus.lentDate && <p className="text-slate-400"><strong>Lent Date:</strong> {item.loanStatus.lentDate}</p>}
                {item.loanStatus.dueDate && <p className="text-slate-400"><strong>Expected Return:</strong> {item.loanStatus.dueDate}</p>}
                {item.loanStatus.notes && <p className="text-slate-400 italic">"{item.loanStatus.notes}"</p>}
              </div>
            )}

            {/* Loan Out Form for Non-TV items (with option to launch popup) */}
            {showLoanForm && !item.loanStatus?.isLentOut && (
              <form onSubmit={handleSaveLoan} className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Lend Out Details</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoanForm(false);
                      setShowTvLoanModal(true);
                    }}
                    className="text-[11px] text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" /> Select Specific Discs / Seasons Popup →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Borrower Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dave (Neighbor)"
                      value={lentToName}
                      onChange={(e) => setLentToName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Due Date (Optional)</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Loan Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Lent disc 1"
                    value={loanNotes}
                    onChange={(e) => setLoanNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                  >
                    Confirm Loan
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* TV Show / Multi-Disc Item Loan Selection Popup Modal */}
        <TvShowLoanModal
          item={item}
          isOpen={showTvLoanModal}
          onClose={() => setShowTvLoanModal(false)}
          onConfirmLoan={(loanData) => onUpdateLoan(item.id, loanData)}
        />

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {(!currentUser?.permissions || currentUser.permissions.canDeleteMedia !== false) ? (
            <button
              onClick={handleDeleteConfirm}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={handleWishlistClick}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                mediaItem.isWishlist
                  ? 'bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/50 shadow-md shadow-purple-900/20'
                  : 'bg-slate-800/80 hover:bg-purple-950/60 text-slate-300 hover:text-purple-300 border border-slate-700 hover:border-purple-500/40'
              }`}
              title={mediaItem.isWishlist ? 'Move item into main Vault Library' : 'Move item into Wishlist'}
            >
              {mediaItem.isWishlist ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-purple-400" />
                  <span>Move to Library</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-purple-400" />
                  <span>Move to Wishlist</span>
                </>
              )}
            </button>

            {(!currentUser?.permissions || currentUser.permissions.canEditMedia !== false) && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
