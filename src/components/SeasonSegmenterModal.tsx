import React, { useState, useEffect } from 'react';
import { MediaItem, Season } from '../types';
import { segmentShowSeasons } from '../lib/api';
import { Layers, Sparkles, X, Check, RefreshCw, Wand2, Sliders, AlertCircle, PlayCircle, Image as ImageIcon } from 'lucide-react';

interface SeasonSegmenterModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onApplySeasons: (updatedSeasons: Season[]) => Promise<void>;
}

export const SeasonSegmenterModal: React.FC<SeasonSegmenterModalProps> = ({
  item,
  isOpen,
  onClose,
  onApplySeasons
}) => {
  const [totalEpisodes, setTotalEpisodes] = useState<number>(() => {
    if (item.numberOfEpisodes && item.numberOfEpisodes > 0) return item.numberOfEpisodes;
    if (item.seasons && item.seasons.length > 0) {
      return item.seasons.reduce((acc, s) => acc + (s.episodeCount || 0), 0);
    }
    return 153; // default for Dragon Ball or standard single season
  });

  const [requestedSeasonsCount, setRequestedSeasonsCount] = useState<number>(5);
  const [mode, setMode] = useState<'ai' | 'split' | 'manual'>('ai');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUsed, setSourceUsed] = useState<string | null>(null);
  const [previewSeasons, setPreviewSeasons] = useState<Season[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Auto trigger AI auto segment on open
      handleAutoSegment();
    }
  }, [isOpen]);

  const handleAutoSegment = async (customSeasons?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await segmentShowSeasons(
        item.title,
        totalEpisodes,
        customSeasons,
        item.tmdbId
      );
      if (res.success && res.seasons) {
        setPreviewSeasons(res.seasons);
        setSourceUsed(res.source);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to auto-segment seasons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSplit = (count: number) => {
    setRequestedSeasonsCount(count);
    handleAutoSegment(count);
  };

  const handleUpdateSeasonName = (idx: number, name: string) => {
    setPreviewSeasons(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], name };
      return copy;
    });
  };

  const handleUpdateSeasonEpCount = (idx: number, newCount: number) => {
    const count = Math.max(1, newCount);
    setPreviewSeasons(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], episodeCount: count };
      return copy;
    });
  };

  const handleUpdateSeasonPosterUrl = (idx: number, posterUrl: string) => {
    setPreviewSeasons(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], posterUrl };
      return copy;
    });
  };

  const handleApply = async () => {
    if (previewSeasons.length === 0) return;
    setIsSaving(true);
    try {
      await onApplySeasons(previewSeasons);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save updated seasons');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl shadow-indigo-950/80 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Season Auto-Segmenter & Splitter</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[11px] font-mono font-bold">
                  TMDB Fix Tool
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Segment single-season TMDB anime & series like <span className="text-indigo-300 font-semibold">"{item.title}"</span> into proper physical seasons
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 text-xs flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">Why are some shows listed as 1 season?</p>
              <p className="text-slate-300 leading-relaxed">
                Many online databases (like TMDB) catalog original anime broadcasts (e.g. <span className="text-white font-semibold">Dragon Ball 153 episodes</span>, Naruto 220 episodes) as a single broadcast season. Physical Blu-ray & DVD sets split them into standard seasons and story sagas. This tool automatically retrieves or splits them!
              </p>
            </div>
          </div>

          {/* Controls Mode Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                setMode('ai');
                handleAutoSegment();
              }}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-white">AI / Catalog Auto-Detect</p>
                <p className="text-[10px] text-slate-400">Finds official arcs & season names online</p>
              </div>
            </button>

            <button
              onClick={() => {
                setMode('split');
                handleCustomSplit(5);
              }}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                mode === 'split'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs font-bold text-white">Custom N Seasons</p>
                <p className="text-[10px] text-slate-400">Divide total episodes into equal parts</p>
              </div>
            </button>

            <button
              onClick={() => setMode('manual')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs font-bold text-white">Manual Fine-Tune</p>
                <p className="text-[10px] text-slate-400">Edit titles & episode counts manually</p>
              </div>
            </button>
          </div>

          {/* Quick Select Buttons for N Seasons (when in split mode) */}
          {mode === 'split' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Select Number of Seasons to Split into:</span>
                <span className="text-indigo-400 font-mono font-bold">{requestedSeasonsCount} Seasons</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleCustomSplit(num)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      requestedSeasonsCount === num
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {num} Seasons
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Total Episodes Config */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <PlayCircle className="w-4 h-4 text-indigo-400" />
              <span>Series Total Episodes:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="2000"
                value={totalEpisodes}
                onChange={(e) => setTotalEpisodes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-1 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleAutoSegment()}
                className="px-3 py-1 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-detect</span>
              </button>
            </div>
          </div>

          {/* Status & Errors */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sourceUsed && !isLoading && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Season breakdown generated via <strong className="text-indigo-300 uppercase">{sourceUsed}</strong></span>
              </span>
              <span>{previewSeasons.length} Seasons • {previewSeasons.reduce((a, b) => a + (b.episodeCount || 0), 0)} Total Episodes</span>
            </div>
          )}

          {/* Season Preview Grid / List */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-indigo-300">Retrieving multi-season story breakdown with AI...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                <span>Generated Seasons Preview ({previewSeasons.length})</span>
                <span className="text-[11px] text-slate-500">Edit titles or episode counts below</span>
              </div>

              <div className="space-y-2">
                {previewSeasons.map((season, idx) => {
                  const poster = season.posterUrl || item.posterUrl;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {/* Season Box Art Poster Thumbnail */}
                        <div className="relative group shrink-0">
                          <img
                            src={poster}
                            alt={`Season ${season.seasonNumber} Boxart`}
                            className="w-11 h-15 object-cover rounded-xl border border-slate-700/80 shadow-md bg-slate-900"
                          />
                          <div className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-[10px] shadow">
                            S{season.seasonNumber}
                          </div>
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={season.name}
                            onChange={(e) => handleUpdateSeasonName(idx, e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-700/80 hover:border-indigo-500 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none"
                            placeholder={`Season ${season.seasonNumber} Name`}
                          />

                          {/* Box Art Poster URL Input */}
                          <div className="flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <input
                              type="text"
                              value={season.posterUrl || ''}
                              onChange={(e) => handleUpdateSeasonPosterUrl(idx, e.target.value)}
                              className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-md px-2 py-0.5 text-[11px] font-mono text-slate-300 focus:outline-none placeholder:text-slate-600"
                              placeholder="Season Boxart Poster URL (https://...)"
                            />
                            {!season.posterUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSeasonPosterUrl(idx, item.posterUrl)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-semibold shrink-0 transition-all"
                                title="Copy Show Poster URL"
                              >
                                Use Show Art
                              </button>
                            )}
                          </div>

                          {season.overview && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 px-0.5">{season.overview}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-[11px] text-slate-400">Episodes:</span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={season.episodeCount}
                          onChange={(e) => handleUpdateSeasonEpCount(idx, parseInt(e.target.value) || 1)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isSaving || previewSeasons.length === 0 || isLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Seasons to Item...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Done — Save {previewSeasons.length} Seasons to Vault Item</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
