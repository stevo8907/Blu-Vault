import React from 'react';
import { 
  Tv, 
  Disc, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Star,
  Film,
  Tag
} from 'lucide-react';
import { MediaItem, Season, PhysicalFormat } from '../types';
import { formatPrice } from '../lib/currency';

interface SeasonCardProps {
  parentItem: MediaItem;
  season: Season;
  onClick: () => void;
  onToggleOwned?: (e: React.MouseEvent) => void;
}

export const SeasonCard: React.FC<SeasonCardProps> = ({
  parentItem,
  season,
  onClick,
  onToggleOwned
}) => {
  const isOwned = season.ownedInVault !== false;
  const poster = season.posterUrl || parentItem.posterUrl;
  const format: PhysicalFormat = season.format || parentItem.format;
  const discs = season.discsCount !== undefined ? season.discsCount : 1;
  const location = season.shelfLocation || parentItem.shelfLocation;
  const price = season.purchasePrice !== undefined ? season.purchasePrice : (parentItem.isCompleteSeries ? parentItem.purchasePrice : undefined);
  const retailer = season.purchaseRetailer || (parentItem.isCompleteSeries ? parentItem.purchaseRetailer : undefined);

  return (
    <div
      onClick={onClick}
      className={`group relative bg-slate-900/95 hover:bg-slate-800/95 rounded-2xl border ${
        isOwned ? 'border-slate-800 hover:border-indigo-500/60' : 'border-amber-900/40 opacity-80 hover:opacity-100 hover:border-amber-500/60'
      } overflow-hidden shadow-md hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col transform hover:-translate-y-1`}
    >
      {/* Poster Media Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={poster}
          alt={`${parentItem.title} - ${season.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).setAttribute('src', parentItem.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80');
          }}
        />

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-85 group-hover:opacity-70 transition-opacity" />

        {/* Season Badge (Top Left) */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 flex-wrap">
          <span className="text-[10px] tracking-wider font-black uppercase px-2 py-0.5 rounded-md border backdrop-blur-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-md">
            SEASON {season.seasonNumber}
          </span>
          <span className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-md border backdrop-blur-md bg-slate-900/80 text-slate-300 border-slate-700">
            {format.replace('Ultra-HD', '4K').replace('1080p', '')}
          </span>
        </div>

        {/* Ownership Toggle Badge (Top Right) */}
        {onToggleOwned && (
          <button
            onClick={onToggleOwned}
            className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md backdrop-blur-md text-[10px] font-bold flex items-center gap-1 transition-all ${
              isOwned 
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900' 
                : 'bg-amber-950/90 text-amber-300 border border-amber-500/50 hover:bg-amber-900'
            }`}
            title={isOwned ? 'Mark as missing from vault' : 'Mark as owned in vault'}
          >
            {isOwned ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Vault</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-amber-400" />
                <span>Not Owned</span>
              </>
            )}
          </button>
        )}

        {/* Rating & Price overlay bottom left */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-800 text-[10px] font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{parentItem.rating ? parentItem.rating.toFixed(1) : '8.0'}</span>
          </div>

          {price !== undefined && (
            <div className="bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
              <Tag className="w-2.5 h-2.5 text-emerald-400" />
              <span>{formatPrice(price)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info Content Section */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
        <div>
          <h4 className="font-extrabold text-xs text-white group-hover:text-indigo-300 line-clamp-1 transition-colors">
            {season.name || `Season ${season.seasonNumber}`}
          </h4>
          <p className="text-[10px] text-slate-400 line-clamp-1">
            {parentItem.title} {retailer ? `• ${retailer}` : ''}
          </p>
        </div>

        {/* Location & Discs Footer */}
        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1 truncate max-w-[100px]" title={`Location: ${location}`}>
            <MapPin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span className="truncate font-mono">{location}</span>
          </div>

          <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-mono border border-slate-700/50">
            {discs} {discs === 1 ? 'Disc' : 'Discs'}
          </span>
        </div>
      </div>
    </div>
  );
};
