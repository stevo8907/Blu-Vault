import React, { useState, useEffect } from 'react';
import { formatPrice } from '../lib/currency';
import { isCompleteTvSeries } from '../lib/tvUtils';
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
  BookmarkCheck,
  Wand2,
  Image as ImageIcon
} from 'lucide-react';
import { MediaItem, Season, Episode, User, PhysicalFormat, Condition } from '../types';
import { fetchTMDBSeason, saveTVSeason, toggleEpisodeWatched, updateMediaItem, fetchCollectarrItemStack, addMissingCollectarrItem } from '../lib/api';
import { SeasonSegmenterModal } from './SeasonSegmenterModal';
import { UK_RETAILERS, getSavedShelfLocations, saveShelfLocation } from '../lib/shelfAndRetailer';

const FORMAT_OPTIONS: PhysicalFormat[] = [
  '4K Ultra-HD',
  'Steelbook 4K',
  'Blu-Ray 1080p',
  'Steelbook Blu-Ray',
  '3D Blu-Ray',
  'DVD',
  'Box Set'
];

const CONDITION_OPTIONS: Condition[] = ['Mint', 'Like New', 'Good', 'Fair', 'Poor'];

interface MediaDetailModalProps {
  item: MediaItem;
  initialSeasonNum?: number;
  currentUser?: User | null;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onUpdateLoan: (id: string, loanData: { isLentOut: boolean; lentTo?: string; dueDate?: string; notes?: string; lentItems?: string[] }) => void;
  onToggleFavorite: (id: string) => void;
  onToggleWishlist?: (id: string) => void;
  onItemUpdated?: (item: MediaItem) => void;
  onRefreshItem?: () => void;
  onOpenAddMedia?: (initialQuery?: string) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  initialSeasonNum,
  currentUser,
  onClose,
  onEdit,
  onDelete,
  onUpdateLoan,
  onToggleFavorite,
  onToggleWishlist,
  onItemUpdated,
  onRefreshItem,
  onOpenAddMedia
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

  // Collectarr Franchise & Collection Stack State
  const [collectarrStack, setCollectarrStack] = useState<{
    hasCollection: boolean;
    isLocalGroup?: boolean;
    collectionInfo?: { id: number; name: string; overview?: string; posterUrl?: string; backdropUrl?: string };
    parts?: Array<{
      tmdbId: number;
      title: string;
      originalTitle?: string;
      overview: string;
      posterUrl: string;
      backdropUrl: string;
      releaseYear: number;
      rating: number;
      inVault: boolean;
      inWishlist: boolean;
      vaultItemId?: string;
      format?: string;
      shelfLocation?: string;
      condition?: string;
    }>;
    totalParts?: number;
    ownedParts?: number;
    wishlistParts?: number;
    completionPercent?: number;
    message?: string;
  } | null>(null);
  const [isLoadingCollectarr, setIsLoadingCollectarr] = useState<boolean>(false);
  const [collectarrActionId, setCollectarrActionId] = useState<string | null>(null);

  const loadCollectarrStack = async (targetItem: MediaItem = mediaItem) => {
    if (targetItem.type !== 'movie' && !(targetItem.type === 'anime' && targetItem.animeType === 'movie')) {
      setCollectarrStack(null);
      return;
    }
    setIsLoadingCollectarr(true);
    try {
      const res = await fetchCollectarrItemStack({
        mediaItemId: targetItem.id,
        tmdbId: targetItem.tmdbId,
        title: targetItem.title
      });
      if (res && res.success) {
        setCollectarrStack(res);
      }
    } catch (err) {
      console.error('Failed loading Collectarr stack:', err);
    } finally {
      setIsLoadingCollectarr(false);
    }
  };

  useEffect(() => {
    loadCollectarrStack(mediaItem);
  }, [mediaItem.id, mediaItem.tmdbId]);

  const handleCollectarrQuickAdd = async (part: any, targetState: 'wishlist' | 'vault') => {
    setCollectarrActionId(`${part.tmdbId}_${targetState}`);
    try {
      const res = await addMissingCollectarrItem({
        title: part.title,
        tmdbId: part.tmdbId,
        releaseYear: part.releaseYear,
        posterUrl: part.posterUrl,
        backdropUrl: part.backdropUrl,
        overview: part.overview,
        rating: part.rating,
        collectionInfo: collectarrStack?.collectionInfo,
        targetState
      });
      if (res.success) {
        if (onRefreshItem) onRefreshItem();
        await loadCollectarrStack(mediaItem);
      }
    } catch (err) {
      console.error('Collectarr quick add failed:', err);
    } finally {
      setCollectarrActionId(null);
    }
  };

  const handleSelectVaultItemFromStack = async (vaultItemId: string) => {
    try {
      const res = await fetch(`/api/media/${vaultItemId}`);
      const data = await res.json();
      if (data.success && data.media) {
        setMediaItem(data.media);
        if (onItemUpdated) onItemUpdated(data.media);
      }
    } catch (err) {
      console.error('Error opening vault item from Collectarr stack:', err);
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
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(initialSeasonNum || initialSeasons[0]?.seasonNumber || 1);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(false);
  const [showAddSeasonModal, setShowAddSeasonModal] = useState<boolean>(false);
  const [showSegmenterModal, setShowSegmenterModal] = useState<boolean>(false);

  // Add Season Form State
  const [newSeasonNumber, setNewSeasonNumber] = useState<number>(seasons.length + 1);
  const [newSeasonName, setNewSeasonName] = useState<string>(`Season ${seasons.length + 1}`);
  const [newSeasonEpCount, setNewSeasonEpCount] = useState<number>(10);
  const [newSeasonPosterUrl, setNewSeasonPosterUrl] = useState<string>('');
  const [newSeasonFormat, setNewSeasonFormat] = useState<PhysicalFormat>(mediaItem.format || '4K Ultra-HD');
  const [newSeasonEdition, setNewSeasonEdition] = useState<string>('');
  const [newSeasonShelfLocation, setNewSeasonShelfLocation] = useState<string>(mediaItem.shelfLocation || getSavedShelfLocations()[0] || 'Vault Shelf A1');
  const [newSeasonPrice, setNewSeasonPrice] = useState<string>('');
  const [newSeasonRetailer, setNewSeasonRetailer] = useState<string>(mediaItem.purchaseRetailer || 'HMV');
  const [newSeasonPurchaseDate, setNewSeasonPurchaseDate] = useState<string>('');
  const [newSeasonDiscsCount, setNewSeasonDiscsCount] = useState<number>(1);
  const [newSeasonCondition, setNewSeasonCondition] = useState<Condition>(mediaItem.condition || 'Mint');
  const [newSeasonBarcode, setNewSeasonBarcode] = useState<string>('');
  const [newSeasonNotes, setNewSeasonNotes] = useState<string>('');

  // Edit Season Physical Specs Modal State
  const [showEditSeasonSpecsModal, setShowEditSeasonSpecsModal] = useState<boolean>(false);
  const [editSeasonFormat, setEditSeasonFormat] = useState<PhysicalFormat>('4K Ultra-HD');
  const [editSeasonEdition, setEditSeasonEdition] = useState<string>('');
  const [editSeasonShelfLocation, setEditSeasonShelfLocation] = useState<string>('');
  const [editSeasonPrice, setEditSeasonPrice] = useState<string>('');
  const [editSeasonRetailer, setEditSeasonRetailer] = useState<string>('');
  const [editSeasonPurchaseDate, setEditSeasonPurchaseDate] = useState<string>('');
  const [editSeasonDiscsCount, setEditSeasonDiscsCount] = useState<number>(1);
  const [editSeasonCondition, setEditSeasonCondition] = useState<Condition>('Mint');
  const [editSeasonBarcode, setEditSeasonBarcode] = useState<string>('');
  const [editSeasonNotes, setEditSeasonNotes] = useState<string>('');

  const [editingSeasonPoster, setEditingSeasonPoster] = useState<boolean>(false);
  const [seasonPosterInputUrl, setSeasonPosterInputUrl] = useState<string>('');

  const handleStartEditSeasonPoster = () => {
    setSeasonPosterInputUrl(activeSeason?.posterUrl || mediaItem.posterUrl || '');
    setEditingSeasonPoster(true);
  };

  const handleSaveSeasonPoster = async () => {
    if (!activeSeason) return;
    const newUrl = seasonPosterInputUrl.trim() || mediaItem.posterUrl;
    const updatedSeasons = seasons.map(s => {
      if (s.seasonNumber === activeSeason.seasonNumber) {
        return { ...s, posterUrl: newUrl };
      }
      return s;
    });

    setSeasons(updatedSeasons);
    setEditingSeasonPoster(false);

    try {
      const serverUpdatedItem = await updateMediaItem(mediaItem.id, { seasons: updatedSeasons });
      const finalItem = serverUpdatedItem || { ...mediaItem, seasons: updatedSeasons };
      setMediaItem(finalItem);
      if (onItemUpdated) onItemUpdated(finalItem);
    } catch (err) {
      console.error('Failed to save season boxart poster:', err);
    }
  };

  const handleApplySegmentedSeasons = async (updatedSeasons: Season[]) => {
    const totalEps = updatedSeasons.reduce((acc, s) => acc + (s.episodeCount || 0), 0);
    const updatedPayload = {
      numberOfSeasons: updatedSeasons.length,
      numberOfEpisodes: totalEps,
      seasons: updatedSeasons
    };

    try {
      const serverUpdatedItem = await updateMediaItem(mediaItem.id, updatedPayload);
      const finalItem = serverUpdatedItem || {
        ...mediaItem,
        numberOfSeasons: updatedSeasons.length,
        numberOfEpisodes: totalEps,
        seasons: updatedSeasons
      };

      setMediaItem(finalItem);
      setSeasons(updatedSeasons);
      setSelectedSeasonNum(updatedSeasons[0]?.seasonNumber || 1);

      if (onItemUpdated) onItemUpdated(finalItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err: any) {
      console.error('Failed to update media item seasons on server:', err);
      // Fallback local update
      const fallbackItem: MediaItem = {
        ...mediaItem,
        numberOfSeasons: updatedSeasons.length,
        numberOfEpisodes: totalEps,
        seasons: updatedSeasons
      };
      setMediaItem(fallbackItem);
      setSeasons(updatedSeasons);
      if (onItemUpdated) onItemUpdated(fallbackItem);
    }
  };

  useEffect(() => {
    setMediaItem(item);
    if (item.seasons && item.seasons.length > 0) {
      setSeasons(item.seasons);
    }
    if (initialSeasonNum) {
      setSelectedSeasonNum(initialSeasonNum);
    }
  }, [item, initialSeasonNum]);

  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNum) || seasons[0];

  // Auto-fetch episodes for active season if empty and tmdbId exists
  useEffect(() => {
    if ((mediaItem.type === 'tv' || (mediaItem.type === 'anime' && (mediaItem.animeType === 'tv' || (mediaItem.numberOfSeasons && mediaItem.numberOfSeasons > 0)))) && activeSeason && (!activeSeason.episodes || activeSeason.episodes.length === 0)) {
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

    if (seasonToUpdate.ownedInVault === false) {
      setSelectedSeasonNum(seasonNum);
      setEditSeasonFormat(seasonToUpdate.format || mediaItem.format || '4K Ultra-HD');
      setEditSeasonEdition(seasonToUpdate.edition || mediaItem.edition || '');
      setEditSeasonShelfLocation(seasonToUpdate.shelfLocation || mediaItem.shelfLocation || getSavedShelfLocations()[0] || 'Vault Shelf A1');
      setEditSeasonPrice(seasonToUpdate.purchasePrice !== undefined ? seasonToUpdate.purchasePrice.toString() : (mediaItem.purchasePrice ? mediaItem.purchasePrice.toString() : ''));
      setEditSeasonRetailer(seasonToUpdate.purchaseRetailer || mediaItem.purchaseRetailer || 'HMV');
      setEditSeasonPurchaseDate(seasonToUpdate.purchaseDate || mediaItem.purchaseDate || new Date().toISOString().split('T')[0]);
      setEditSeasonDiscsCount(seasonToUpdate.discsCount !== undefined ? seasonToUpdate.discsCount : (mediaItem.discsCount || 1));
      setEditSeasonCondition(seasonToUpdate.condition || mediaItem.condition || 'Mint');
      setEditSeasonBarcode(seasonToUpdate.barcode || mediaItem.barcode || '');
      setEditSeasonNotes(seasonToUpdate.notes || '');
      setShowEditSeasonSpecsModal(true);
    } else {
      const updatedSeason: Season = { ...seasonToUpdate, ownedInVault: false };
      setSeasons(prev => prev.map(s => s.seasonNumber === seasonNum ? updatedSeason : s));

      try {
        const updatedItem = await saveTVSeason(mediaItem.id, updatedSeason);
        setMediaItem(updatedItem);
        if (onRefreshItem) onRefreshItem();
      } catch (err) {
        console.error('Failed to update season vault ownership:', err);
      }
    }
  };

  const handleOpenAddSeasonModal = () => {
    const nextNum = seasons.length + 1;
    setNewSeasonNumber(nextNum);
    setNewSeasonName(`Season ${nextNum}`);
    setNewSeasonEpCount(10);
    setNewSeasonPosterUrl(mediaItem.posterUrl || '');
    setNewSeasonFormat(mediaItem.format || '4K Ultra-HD');
    setNewSeasonEdition(mediaItem.edition || '');
    setNewSeasonShelfLocation(mediaItem.shelfLocation || getSavedShelfLocations()[0] || 'Vault Shelf A1');
    setNewSeasonPrice(mediaItem.purchasePrice ? mediaItem.purchasePrice.toString() : '');
    setNewSeasonRetailer(mediaItem.purchaseRetailer || 'HMV');
    setNewSeasonPurchaseDate(new Date().toISOString().split('T')[0]);
    setNewSeasonDiscsCount(1);
    setNewSeasonCondition(mediaItem.condition || 'Mint');
    setNewSeasonBarcode('');
    setNewSeasonNotes('');
    setShowAddSeasonModal(true);
  };

  const handleOpenEditSeasonSpecsModal = () => {
    if (!activeSeason) return;
    setEditSeasonFormat(activeSeason.format || mediaItem.format || '4K Ultra-HD');
    setEditSeasonEdition(activeSeason.edition || mediaItem.edition || '');
    setEditSeasonShelfLocation(activeSeason.shelfLocation || mediaItem.shelfLocation || 'Vault Shelf A1');
    setEditSeasonPrice(activeSeason.purchasePrice !== undefined ? activeSeason.purchasePrice.toString() : (mediaItem.purchasePrice ? mediaItem.purchasePrice.toString() : ''));
    setEditSeasonRetailer(activeSeason.purchaseRetailer || mediaItem.purchaseRetailer || 'HMV');
    setEditSeasonPurchaseDate(activeSeason.purchaseDate || mediaItem.purchaseDate || '');
    setEditSeasonDiscsCount(activeSeason.discsCount !== undefined ? activeSeason.discsCount : (mediaItem.discsCount || 1));
    setEditSeasonCondition(activeSeason.condition || mediaItem.condition || 'Mint');
    setEditSeasonBarcode(activeSeason.barcode || mediaItem.barcode || '');
    setEditSeasonNotes(activeSeason.notes || '');
    setShowEditSeasonSpecsModal(true);
  };

  const handleSaveEditedSeasonSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return;

    if (editSeasonShelfLocation.trim()) {
      saveShelfLocation(editSeasonShelfLocation.trim());
    }

    const updatedSeason: Season = {
      ...activeSeason,
      ownedInVault: true,
      format: editSeasonFormat,
      edition: editSeasonEdition.trim() || undefined,
      shelfLocation: editSeasonShelfLocation.trim() || 'Vault Shelf A1',
      purchasePrice: editSeasonPrice ? parseFloat(editSeasonPrice) : undefined,
      purchaseRetailer: editSeasonRetailer.trim() || undefined,
      purchaseDate: editSeasonPurchaseDate || undefined,
      discsCount: Number(editSeasonDiscsCount) || 1,
      condition: editSeasonCondition || 'Mint',
      barcode: editSeasonBarcode.trim() || undefined,
      notes: editSeasonNotes.trim() || undefined
    };

    const updatedSeasons = seasons.map(s => s.seasonNumber === activeSeason.seasonNumber ? updatedSeason : s);
    setSeasons(updatedSeasons);
    setShowEditSeasonSpecsModal(false);

    try {
      const updatedItem = await saveTVSeason(mediaItem.id, updatedSeason);
      setMediaItem(updatedItem);
      if (onRefreshItem) onRefreshItem();
    } catch (err) {
      console.error('Failed to update season specs:', err);
    }
  };

  const handleAddCustomSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSeasonShelfLocation.trim()) {
      saveShelfLocation(newSeasonShelfLocation.trim());
    }

    const newSeason: Season = {
      seasonNumber: newSeasonNumber,
      name: newSeasonName.trim() || `Season ${newSeasonNumber}`,
      episodeCount: Number(newSeasonEpCount) || 10,
      posterUrl: newSeasonPosterUrl.trim() || mediaItem.posterUrl,
      ownedInVault: true,
      format: newSeasonFormat,
      edition: newSeasonEdition.trim() || undefined,
      shelfLocation: newSeasonShelfLocation.trim() || 'Vault Shelf A1',
      purchasePrice: newSeasonPrice ? parseFloat(newSeasonPrice) : undefined,
      purchaseRetailer: newSeasonRetailer.trim() || undefined,
      purchaseDate: newSeasonPurchaseDate || undefined,
      discsCount: Number(newSeasonDiscsCount) || 1,
      condition: newSeasonCondition || 'Mint',
      barcode: newSeasonBarcode.trim() || undefined,
      notes: newSeasonNotes.trim() || undefined
    };

    const updatedSeasons = [...seasons.filter(s => s.seasonNumber !== newSeasonNumber), newSeason].sort((a, b) => a.seasonNumber - b.seasonNumber);
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
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              const typeSub = item.type === 'tv' || item.type === 'anime' ? 'tv' : item.type === 'game' ? 'games' : 'movies';
              if (!el.src.includes(`/api/cache/${typeSub}/${item.id}/`) && !el.src.includes(`/api/cache/media/${item.id}/`)) {
                el.src = `/api/cache/${typeSub}/${item.id}/backdrop`;
              }
            }}
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
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                const typeSub = item.type === 'tv' || item.type === 'anime' ? 'tv' : item.type === 'game' ? 'games' : 'movies';
                if (!el.src.includes(`/api/cache/${typeSub}/${item.id}/`) && !el.src.includes(`/api/cache/media/${item.id}/`)) {
                  el.src = `/api/cache/${typeSub}/${item.id}/poster`;
                }
              }}
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wide">
                  {item.format}
                </span>
                {item.edition && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-xs font-mono text-cyan-300">
                    {item.edition}
                  </span>
                )}
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

          {/* AUTOMATIC COLLECTARR FRANCHISE & COLLECTION STACK SECTION */}
          {(mediaItem.type === 'movie' || (mediaItem.type === 'anime' && mediaItem.animeType === 'movie')) && (
            <div className="bg-slate-950/80 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white">
                        {collectarrStack?.collectionInfo?.name || 'Collectarr Franchise Stack'}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                        Collectarr
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {collectarrStack?.hasCollection
                        ? collectarrStack.isLocalGroup
                          ? 'Automated local vault franchise grouping'
                          : 'Automated TMDB collection stack & vault ownership tracking'
                        : 'Automatic multi-film franchise analysis'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {collectarrStack?.hasCollection && (
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
                      {collectarrStack.ownedParts} / {collectarrStack.totalParts} Movies Owned ({collectarrStack.completionPercent}%)
                    </span>
                  )}
                  <button
                    onClick={() => loadCollectarrStack(mediaItem)}
                    disabled={isLoadingCollectarr}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
                    title="Refresh Collectarr Stack"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingCollectarr ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>

              {isLoadingCollectarr ? (
                <div className="p-6 text-center space-y-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">Collectarr Stack Engine auto-matching TMDB collection entries...</p>
                </div>
              ) : collectarrStack?.hasCollection && collectarrStack.parts && collectarrStack.parts.length > 0 ? (
                <div className="space-y-3">
                  {/* Franchise Completion Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Franchise Vault Ownership</span>
                      <span className="text-cyan-300 font-bold">{collectarrStack.completionPercent}% Complete</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                        style={{ width: `${collectarrStack.completionPercent}%` }}
                      />
                      {collectarrStack.wishlistParts ? (
                        <div
                          className="bg-purple-500 h-full transition-all duration-500 opacity-80"
                          style={{ width: `${Math.round((collectarrStack.wishlistParts / collectarrStack.totalParts!) * 100)}%` }}
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* Stack Parts List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {collectarrStack.parts.map((part: any, idx: number) => {
                      const isCurrentViewing = part.vaultItemId === mediaItem.id || (part.tmdbId && part.tmdbId === mediaItem.tmdbId);

                      return (
                        <div
                          key={part.tmdbId || idx}
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                            isCurrentViewing
                              ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-cyan-400/80 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/50'
                              : part.inVault
                                ? 'bg-slate-900/90 border-emerald-900/50 hover:border-emerald-600/60'
                                : part.inWishlist
                                  ? 'bg-slate-900/90 border-purple-900/50 hover:border-purple-600/60'
                                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="relative shrink-0">
                              <img
                                src={part.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80'}
                                alt={part.title}
                                className="w-14 h-20 object-cover rounded-xl border border-slate-700/80 shadow-md bg-slate-950"
                              />
                              <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/90 text-cyan-300 font-mono text-[9px] font-bold border border-slate-800">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <h5 className="text-xs font-black text-white truncate leading-tight" title={part.title}>
                                {part.title}
                              </h5>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{part.releaseYear}</span>
                                {part.rating && (
                                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-400" /> {part.rating}
                                  </span>
                                )}
                              </div>

                              {/* Status Pill */}
                              <div>
                                {isCurrentViewing ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                                    <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Active View
                                  </span>
                                ) : part.inVault ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <Check className="w-3 h-3 text-emerald-400" /> {part.format || 'In Vault'}
                                  </span>
                                ) : part.inWishlist ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    <BookmarkCheck className="w-3 h-3 text-purple-400" /> Wishlist
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    Missing
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-1 border-t border-slate-800/80">
                            {isCurrentViewing ? (
                              <div className="text-[10px] text-cyan-300 font-mono text-center font-bold">
                                Viewing this physical copy
                              </div>
                            ) : part.inVault && part.vaultItemId ? (
                              <button
                                onClick={() => handleSelectVaultItemFromStack(part.vaultItemId!)}
                                className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                              >
                                <span>Open Vault Copy</span>
                                <ExternalLink className="w-3 h-3 text-cyan-400" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (onOpenAddMedia) {
                                    onOpenAddMedia(part.title);
                                  }
                                }}
                                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-white" />
                                <span>Add Movie</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span><strong>Collectarr Intelligence Verified:</strong> Standalone release. No multi-film TMDB collection stack detected for this title.</span>
                </div>
              )}
            </div>
          )}

          {/* TV SHOW / ANIME SERIES SEASONS & EPISODES EXPLORER */}
          {(mediaItem.type === 'tv' || (mediaItem.type === 'anime' && (mediaItem.animeType === 'tv' || (mediaItem.numberOfSeasons && mediaItem.numberOfSeasons > 0) || (mediaItem.seasons && mediaItem.seasons.length > 0)))) && (
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowSegmenterModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-950/60 cursor-pointer"
                    title="Segment single season into multi-season physical release (e.g. Dragon Ball 5 Seasons)"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Auto-Segment / Split Seasons</span>
                  </button>
                  <button
                    onClick={handleOpenAddSeasonModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" /> Add Season
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
                    <div className="flex items-start gap-3">
                      <div className="relative group shrink-0">
                        <img
                          src={activeSeason.posterUrl || mediaItem.posterUrl}
                          alt={activeSeason.name}
                          className="w-13 h-18 object-cover rounded-lg border border-slate-700/80 shadow-md bg-slate-950"
                        />
                        <button
                          onClick={handleStartEditSeasonPoster}
                          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold rounded-lg transition-all border border-indigo-500/50 cursor-pointer"
                          title="Change Season Boxart Poster"
                        >
                          <Edit3 className="w-4 h-4 text-cyan-400 mb-0.5" />
                          <span>Edit Boxart</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{activeSeason.name}</h4>
                          <span className="text-xs text-slate-400 font-mono">({activeSeason.episodeCount || activeSeason.episodes?.length || 0} Episodes)</span>
                          <button
                            onClick={handleStartEditSeasonPoster}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline ml-1 cursor-pointer"
                            title="Edit Season Box Art Poster"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Boxart</span>
                          </button>
                        </div>
                        {activeSeason.overview && (
                          <p className="text-xs text-slate-300 line-clamp-2">{activeSeason.overview}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleSeasonVaultOwnership(activeSeason.seasonNumber)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          activeSeason.ownedInVault !== false
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer'
                        }`}
                      >
                        {activeSeason.ownedInVault !== false ? '✓ In Vault Collection' : '+ Add Season to Vault'}
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

                  {/* Physical Copy Specs for Active Season */}
                  {isCompleteTvSeries(mediaItem) ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-200">
                          <strong>Complete Series Boxset:</strong> Top-level physical specs apply to this entire set ({mediaItem.format} • {mediaItem.purchasePrice !== undefined ? formatPrice(mediaItem.purchasePrice) : 'Price N/A'} at {mediaItem.purchaseRetailer || 'Retailer N/A'} • {mediaItem.shelfLocation}).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-950/90 border border-indigo-500/30 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                          <Disc className="w-4 h-4 text-indigo-400" /> {activeSeason.name || (activeSeason.seasonNumber === 0 ? 'Specials & Christmas Specials' : `Season ${activeSeason.seasonNumber}`)} Physical Disc Specifications
                        </span>
                        <button
                          type="button"
                          onClick={handleOpenEditSeasonSpecsModal}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Season Specs</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Format & Edition</span>
                          <span className="font-bold text-white truncate block">
                            {activeSeason.format || mediaItem.format} {activeSeason.edition ? `(${activeSeason.edition})` : ''}
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Shelf Location</span>
                          <span className="font-bold text-cyan-300 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{activeSeason.shelfLocation || mediaItem.shelfLocation}</span>
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Purchase Price</span>
                          <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-400" />
                            {activeSeason.purchasePrice !== undefined
                              ? formatPrice(activeSeason.purchasePrice)
                              : (mediaItem.purchasePrice ? formatPrice(mediaItem.purchasePrice) : 'Not Specified')}
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Retailer & Date</span>
                          <span className="font-bold text-slate-200 truncate block">
                            {activeSeason.purchaseRetailer || mediaItem.purchaseRetailer || 'N/A'} {activeSeason.purchaseDate ? `(${activeSeason.purchaseDate})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Season Boxart Editor Strip */}
                  {editingSeasonPoster && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/50 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Update Boxart Poster for {activeSeason.name}</span>
                        </span>
                        <button
                          onClick={() => setEditingSeasonPoster(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={seasonPosterInputUrl}
                          onChange={(e) => setSeasonPosterInputUrl(e.target.value)}
                          placeholder="Paste image poster URL (e.g., https://image.tmdb.org/...)"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSeasonPosterInputUrl(mediaItem.posterUrl)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0 transition-all"
                          >
                            Use Show Art
                          </button>
                          <button
                            onClick={handleSaveSeasonPoster}
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1 shrink-0 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Boxart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
            <div className="p-4 bg-slate-950 border border-cyan-500/40 rounded-2xl space-y-4 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" /> Add New Season to Collection
                </h4>
                <button onClick={() => setShowAddSeasonModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomSeason} className="space-y-4">
                {/* Basic Season Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">Season Number *</label>
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

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">Season Title *</label>
                    <input
                      type="text"
                      required
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Episode Count & Poster */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">Episode Count</label>
                    <input
                      type="number"
                      min="1"
                      value={newSeasonEpCount}
                      onChange={(e) => setNewSeasonEpCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">Boxart Poster Image URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newSeasonPosterUrl}
                      onChange={(e) => setNewSeasonPosterUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Physical Copy Details */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <h5 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-indigo-400" /> Season Physical Disc & Purchase Details
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Physical Format</label>
                      <select
                        value={newSeasonFormat}
                        onChange={(e) => setNewSeasonFormat(e.target.value as PhysicalFormat)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        {FORMAT_OPTIONS.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Edition</label>
                      <input
                        type="text"
                        placeholder="e.g. Steelbook / Standard"
                        value={newSeasonEdition}
                        onChange={(e) => setNewSeasonEdition(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Discs Count</label>
                      <input
                        type="number"
                        min="1"
                        value={newSeasonDiscsCount}
                        onChange={(e) => setNewSeasonDiscsCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Purchase Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 19.99"
                        value={newSeasonPrice}
                        onChange={(e) => setNewSeasonPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Retailer / Store</label>
                      <input
                        type="text"
                        list="retailers-list-add"
                        placeholder="e.g. HMV, Zavvi"
                        value={newSeasonRetailer}
                        onChange={(e) => setNewSeasonRetailer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <datalist id="retailers-list-add">
                        {UK_RETAILERS.map(r => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Shelf Location</label>
                      <input
                        type="text"
                        list="shelves-list-add"
                        placeholder="e.g. Vault Shelf A1"
                        value={newSeasonShelfLocation}
                        onChange={(e) => setNewSeasonShelfLocation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-bold"
                      />
                      <datalist id="shelves-list-add">
                        {getSavedShelfLocations().map(loc => (
                          <option key={loc} value={loc} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Purchase Date</label>
                      <input
                        type="date"
                        value={newSeasonPurchaseDate}
                        onChange={(e) => setNewSeasonPurchaseDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Disc Condition</label>
                      <select
                        value={newSeasonCondition}
                        onChange={(e) => setNewSeasonCondition(e.target.value as Condition)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        {CONDITION_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddSeasonModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    Add Season
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Season Specs Modal */}
          {showEditSeasonSpecsModal && activeSeason && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    {activeSeason.ownedInVault === false
                      ? `Add ${activeSeason.name || (activeSeason.seasonNumber === 0 ? 'Specials & Christmas Specials' : `Season ${activeSeason.seasonNumber}`)} to Vault`
                      : `Edit ${activeSeason.name || (activeSeason.seasonNumber === 0 ? 'Specials & Christmas Specials' : `Season ${activeSeason.seasonNumber}`)} Physical Specs`}
                  </h4>
                  <button onClick={() => setShowEditSeasonSpecsModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditedSeasonSpecs} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Format</label>
                      <select
                        value={editSeasonFormat}
                        onChange={(e) => setEditSeasonFormat(e.target.value as PhysicalFormat)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        {FORMAT_OPTIONS.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Edition</label>
                      <input
                        type="text"
                        value={editSeasonEdition}
                        onChange={(e) => setEditSeasonEdition(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Shelf Location</label>
                      <input
                        type="text"
                        list="shelves-list-edit"
                        value={editSeasonShelfLocation}
                        onChange={(e) => setEditSeasonShelfLocation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-bold"
                      />
                      <datalist id="shelves-list-edit">
                        {getSavedShelfLocations().map(loc => (
                          <option key={loc} value={loc} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-mono font-medium">Purchase Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editSeasonPrice}
                        onChange={(e) => setEditSeasonPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Purchase Retailer</label>
                      <input
                        type="text"
                        list="retailers-list-edit"
                        value={editSeasonRetailer}
                        onChange={(e) => setEditSeasonRetailer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <datalist id="retailers-list-edit">
                        {UK_RETAILERS.map(r => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Purchase Date</label>
                      <input
                        type="date"
                        value={editSeasonPurchaseDate}
                        onChange={(e) => setEditSeasonPurchaseDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Discs Count</label>
                      <input
                        type="number"
                        min="1"
                        value={editSeasonDiscsCount}
                        onChange={(e) => setEditSeasonDiscsCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">Condition</label>
                      <select
                        value={editSeasonCondition}
                        onChange={(e) => setEditSeasonCondition(e.target.value as Condition)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        {CONDITION_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowEditSeasonSpecsModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      {activeSeason.ownedInVault === false ? 'Add Season to Vault' : 'Save Season Specs'}
                    </button>
                  </div>
                </form>
              </div>
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

      {/* Season Auto-Segmenter Modal */}
      <SeasonSegmenterModal
        item={mediaItem}
        isOpen={showSegmenterModal}
        onClose={() => setShowSegmenterModal(false)}
        onApplySeasons={handleApplySegmentedSeasons}
      />
    </div>
  );
};
