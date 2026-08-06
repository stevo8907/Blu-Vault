import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Film, 
  Tv, 
  Gamepad2, 
  Disc, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Tag, 
  Barcode, 
  Star, 
  FileText, 
  Check, 
  Layers, 
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { MediaItem, PhysicalFormat, Condition, MediaType, Season } from '../types';
import { getCurrencyOption } from '../lib/currency';
import { UK_RETAILERS, getSavedShelfLocations, saveShelfLocation } from '../lib/shelfAndRetailer';

interface EditMediaModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: MediaItem) => Promise<void>;
}

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

export const EditMediaModal: React.FC<EditMediaModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave
}) => {
  // Form State
  const [title, setTitle] = useState(item.title);
  const [releaseYear, setReleaseYear] = useState<number>(item.releaseYear || new Date().getFullYear());
  const [type, setType] = useState<MediaType>(item.type);
  const [animeType, setAnimeType] = useState<'movie' | 'tv'>(item.animeType || (item.numberOfSeasons && item.numberOfSeasons > 0 ? 'tv' : 'movie'));
  const [format, setFormat] = useState<PhysicalFormat>(item.format);
  const [edition, setEdition] = useState(item.edition || '');
  const [discsCount, setDiscsCount] = useState<number>(item.discsCount || 1);
  const [condition, setCondition] = useState<Condition>(item.condition || 'Mint');
  
  // Shelf locations list & selection state
  const [shelfLocations, setShelfLocations] = useState<string[]>(getSavedShelfLocations());
  const [shelfLocation, setShelfLocation] = useState<string>(item.shelfLocation || getSavedShelfLocations()[0] || 'Vault Shelf A1');
  const [isAddingCustomShelf, setIsAddingCustomShelf] = useState(false);
  const [customShelfInput, setCustomShelfInput] = useState('');

  const [purchasePrice, setPurchasePrice] = useState<string>(item.purchasePrice ? item.purchasePrice.toString() : '');
  const [purchaseRetailer, setPurchaseRetailer] = useState<string>(item.purchaseRetailer || 'HMV');
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate || '');
  const [barcode, setBarcode] = useState(item.barcode || '');
  const [digitalCodeRedeemed, setDigitalCodeRedeemed] = useState<boolean>(item.digitalCodeRedeemed || false);
  const [notes, setNotes] = useState(item.notes || '');
  const [overview, setOverview] = useState(item.overview || '');
  const [rating, setRating] = useState<number>(item.rating || 8.0);
  const [director, setDirector] = useState(item.director || '');
  const [studio, setStudio] = useState(item.studio || '');
  const [genresInput, setGenresInput] = useState<string>(item.genres?.join(', ') || '');
  const [posterUrl, setPosterUrl] = useState(item.posterUrl || '');

  // TV Show Specific Fields
  const [numberOfSeasons, setNumberOfSeasons] = useState<number>(item.numberOfSeasons || item.seasons?.length || 1);
  const [numberOfEpisodes, setNumberOfEpisodes] = useState<number>(item.numberOfEpisodes || 0);
  const [isCompleteSeries, setIsCompleteSeries] = useState<boolean>(item.isCompleteSeries || false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const currencySymbol = getCurrencyOption().symbol;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setSaveError('');
    try {
      const parsedGenres = genresInput
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);

      const baseGenres = parsedGenres.length > 0 ? parsedGenres : item.genres;
      const finalGenres = type === 'anime' && !baseGenres.some(g => g.toLowerCase() === 'anime')
        ? ['Anime', ...baseGenres]
        : baseGenres;

      const isTvLike = type === 'tv' || (type === 'anime' && animeType === 'tv');

      const updatedItem: MediaItem = {
        ...item,
        title: title.trim(),
        releaseYear: Number(releaseYear),
        type,
        animeType: type === 'anime' ? animeType : undefined,
        format,
        edition: edition.trim() || undefined,
        discsCount: Number(discsCount),
        condition,
        shelfLocation: shelfLocation.trim(),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchaseRetailer: purchaseRetailer.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        barcode: barcode.trim() || undefined,
        digitalCodeRedeemed,
        notes: notes.trim() || undefined,
        overview: overview.trim(),
        rating: Number(rating),
        director: director.trim() || undefined,
        studio: studio.trim() || undefined,
        genres: finalGenres,
        posterUrl: posterUrl.trim() || item.posterUrl,
        numberOfSeasons: isTvLike ? Number(numberOfSeasons) : undefined,
        numberOfEpisodes: isTvLike ? Number(numberOfEpisodes) : undefined,
        isCompleteSeries: isTvLike ? isCompleteSeries : undefined,
        updatedAt: new Date().toISOString()
      };

      await onSave(updatedItem);
      onClose();
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full my-auto shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              {type === 'tv' ? <Tv className="w-5 h-5" /> : type === 'game' ? <Gamepad2 className="w-5 h-5" /> : <Film className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Edit Vault Item Details</h3>
              <p className="text-xs text-slate-400">Update metadata, format, shelf location, and TV show specs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {saveError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          
          {/* TOP SECTION: MEDIA TYPE & FORMAT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Media Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MediaType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-medium"
              >
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
                <option value="anime">Anime</option>
                <option value="game">Video Game</option>
              </select>
              {type === 'anime' && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Sub-type:</span>
                  <label className="text-[11px] text-slate-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="animeSubtype"
                      value="movie"
                      checked={animeType === 'movie'}
                      onChange={() => setAnimeType('movie')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    Movie
                  </label>
                  <label className="text-[11px] text-slate-300 flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="animeSubtype"
                      value="tv"
                      checked={animeType === 'tv'}
                      onChange={() => setAnimeType('tv')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    TV Series
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Physical Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as PhysicalFormat)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-medium"
              >
                {FORMAT_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-medium"
              >
                {CONDITION_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TITLE & RELEASE YEAR */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-slate-300 block mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Release Year</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* TV SHOW SPECIFIC CONFIGURATION */}
          {type === 'tv' && (
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Tv className="w-4 h-4 text-amber-400" /> TV Show Details & Seasons
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompleteSeries}
                    onChange={(e) => setIsCompleteSeries(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                  />
                  <span className="text-xs font-bold text-amber-200">Complete Series Box Set</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Number of Seasons</label>
                  <input
                    type="number"
                    min="1"
                    value={numberOfSeasons}
                    onChange={(e) => setNumberOfSeasons(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Total Episodes (Approx.)</label>
                  <input
                    type="number"
                    min="0"
                    value={numberOfEpisodes}
                    onChange={(e) => setNumberOfEpisodes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* EDITION, DISCS & SHELF LOCATION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-400" /> Special Edition Name
              </label>
              <input
                type="text"
                placeholder="e.g. Steelbook / Criterion / Collector's"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Disc className="w-3.5 h-3.5 text-blue-400" /> Number of Discs
              </label>
              <input
                type="number"
                min="1"
                value={discsCount}
                onChange={(e) => setDiscsCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Shelf Location Dropdown with Custom Option */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Shelf Location *
                </span>
                {!isAddingCustomShelf && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomShelf(true)}
                    className="text-[10px] text-cyan-400 hover:underline font-bold"
                  >
                    + New
                  </button>
                )}
              </label>

              {isAddingCustomShelf ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New Shelf name..."
                    value={customShelfInput}
                    onChange={(e) => setCustomShelfInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-cyan-500 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
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
                    className="px-2.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                  >
                    Add
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
          </div>

          {/* PURCHASE DETAILS & BARCODE */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Purchase Price ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">UK Retailer</label>
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

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-blue-400" /> UPC / Barcode
              </label>
              <input
                type="text"
                placeholder="e.g. 0883929731213"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* DIGITAL CODE & RATING */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2 flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="digitalCode"
                checked={digitalCodeRedeemed}
                onChange={(e) => setDigitalCodeRedeemed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-900"
              />
              <label htmlFor="digitalCode" className="text-xs text-slate-300 font-semibold cursor-pointer">
                Digital Movie Code Redeemed
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Rating (0 - 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* GENRES & POSTER URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Genres (Comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Drama, Sci-Fi, Mystery"
                value={genresInput}
                onChange={(e) => setGenresInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Poster Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* OVERVIEW & NOTES */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Overview / Description</label>
              <textarea
                rows={3}
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Private Collector Notes</label>
              <input
                type="text"
                placeholder="e.g. Bought at Comic-Con, includes slipcover"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Vault Details'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
