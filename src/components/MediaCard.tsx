import React from 'react';
import { 
  Disc, 
  Sparkles, 
  Star, 
  MapPin, 
  Handshake, 
  Tv, 
  Gamepad2, 
  Film,
  Box,
  CheckCircle2,
  Tag,
  Bookmark
} from 'lucide-react';
import { MediaItem, PhysicalFormat } from '../types';

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onClick,
  onToggleFavorite
}) => {
  // Format styling badge helpers
  const getFormatBadge = (format: PhysicalFormat) => {
    switch (format) {
      case 'Steelbook 4K':
        return {
          bg: 'bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-500 text-slate-950 font-black',
          border: 'border-amber-300 shadow-lg shadow-amber-500/30',
          label: '4K STEELBOOK'
        };
      case '4K Ultra-HD':
        return {
          bg: 'bg-amber-500/90 text-slate-950 font-extrabold',
          border: 'border-amber-400',
          label: '4K ULTRA-HD'
        };
      case 'Steelbook Blu-Ray':
        return {
          bg: 'bg-gradient-to-r from-cyan-500 via-blue-400 to-indigo-500 text-slate-950 font-black',
          border: 'border-cyan-300 shadow-lg shadow-cyan-500/30',
          label: 'BD STEELBOOK'
        };
      case 'Blu-Ray 1080p':
        return {
          bg: 'bg-cyan-600/90 text-white font-bold',
          border: 'border-cyan-400',
          label: 'BLU-RAY'
        };
      case 'DVD':
        return {
          bg: 'bg-slate-700/90 text-slate-200 font-bold',
          border: 'border-slate-500',
          label: 'DVD'
        };
      case '3D Blu-Ray':
        return {
          bg: 'bg-purple-600/90 text-white font-bold',
          border: 'border-purple-400',
          label: '3D BLU-RAY'
        };
      case 'Box Set':
        return {
          bg: 'bg-emerald-600/90 text-white font-extrabold',
          border: 'border-emerald-400',
          label: 'BOX SET'
        };
      case 'PlayStation 5':
      case 'PlayStation 4':
        return {
          bg: 'bg-blue-600 text-white font-bold',
          border: 'border-blue-400',
          label: format.toUpperCase()
        };
      case 'Xbox Series X/S':
      case 'Xbox One':
        return {
          bg: 'bg-emerald-600 text-white font-bold',
          border: 'border-emerald-400',
          label: 'XBOX'
        };
      case 'Nintendo Switch':
        return {
          bg: 'bg-rose-600 text-white font-bold',
          border: 'border-rose-400',
          label: 'SWITCH'
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-200 font-medium',
          border: 'border-slate-700',
          label: format
        };
    }
  };

  const badge = getFormatBadge(item.format);

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/90 hover:bg-slate-800/90 rounded-2xl border border-slate-800/90 hover:border-blue-500/50 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer flex flex-col transform hover:-translate-y-1.5"
    >
      {/* Poster Media Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80');
          }}
        />

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Format Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md border backdrop-blur-md ${badge.bg} ${badge.border}`}>
            {badge.label}
          </span>
          {item.isWishlist && (
            <span className="text-[10px] tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded-md border backdrop-blur-md bg-amber-950/90 text-amber-300 border-amber-500/50 flex items-center gap-1 shadow-md shadow-amber-900/30">
              <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              Wishlist
            </span>
          )}
          {(item.type === 'anime' || (item.genres && item.genres.some(g => g.toLowerCase() === 'anime'))) && (
            <span className="text-[10px] tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded-md border backdrop-blur-md bg-purple-950/90 text-purple-300 border-purple-500/50 flex items-center gap-1 shadow-md shadow-purple-900/30">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Anime
            </span>
          )}
        </div>

        {/* Favorite Button (Top Right) */}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
            item.isFavorite
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'bg-slate-950/60 text-slate-400 hover:text-amber-400 hover:bg-slate-900/80'
          }`}
          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-slate-950' : ''}`} />
        </button>

        {/* Lent Out Banner if borrowed */}
        {item.loanStatus?.isLentOut && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-500/95 text-slate-950 px-3 py-1 text-xs font-bold flex items-center justify-between z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 truncate">
              <Handshake className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Lent to: {item.loanStatus.lentTo || 'Friend'}
                {item.loanStatus.lentItems && item.loanStatus.lentItems.length > 0 && (
                  <span className="opacity-80 ml-1 font-mono text-[10px]">
                    ({item.loanStatus.lentItems.join(', ')})
                  </span>
                )}
              </span>
            </div>
            {item.loanStatus.dueDate && (
              <span className="text-[10px] font-mono opacity-90 shrink-0 ml-1">
                Due: {item.loanStatus.dueDate}
              </span>
            )}
          </div>
        )}

        {/* Rating overlay bottom left if not lent out */}
        {!item.loanStatus?.isLentOut && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-800 text-xs font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{item.rating ? item.rating.toFixed(1) : '7.5'}</span>
          </div>
        )}
      </div>

      {/* Info Content Section */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 line-clamp-1 transition-colors">
              {item.title}
            </h3>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {item.releaseYear}
            </span>
          </div>

          <p className="text-xs text-slate-400 line-clamp-1 mb-2">
            {item.director || (item.genres && item.genres.join(', ')) || 'Physical Media Disc'}
          </p>
        </div>

        {/* Location & Specs Row */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 truncate max-w-[140px]" title={`Location: ${item.shelfLocation}`}>
            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate font-mono">{item.shelfLocation}</span>
          </div>

          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px] font-mono border border-slate-700/50">
            {item.discsCount} {item.discsCount === 1 ? 'Disc' : 'Discs'}
          </span>
        </div>
      </div>
    </div>
  );
};
