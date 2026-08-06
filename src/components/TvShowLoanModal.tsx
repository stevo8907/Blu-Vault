import React, { useState, useEffect } from 'react';
import { Tv, X, Check, CheckSquare, Square, Disc, Calendar, User, FileText, Plus, Handshake, Layers, PackageCheck } from 'lucide-react';
import { MediaItem } from '../types';

interface TvShowLoanModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirmLoan: (loanData: {
    isLentOut: boolean;
    lentTo: string;
    dueDate?: string;
    notes?: string;
    lentItems: string[];
  }) => void;
}

export const TvShowLoanModal: React.FC<TvShowLoanModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirmLoan
}) => {
  const [lentTo, setLentTo] = useState(item.loanStatus?.lentTo || '');
  const [dueDate, setDueDate] = useState(item.loanStatus?.dueDate || '');
  const [notes, setNotes] = useState(item.loanStatus?.notes || '');
  const [selectedItems, setSelectedItems] = useState<string[]>(
    item.loanStatus?.lentItems && item.loanStatus.lentItems.length > 0
      ? item.loanStatus.lentItems
      : []
  );
  const [customItemInput, setCustomItemInput] = useState('');

  // Available selectable items generator
  const availableSeasons = item.seasons || [];
  const numSeasons = availableSeasons.length > 0 
    ? availableSeasons.length 
    : (item.numberOfSeasons || 1);

  // Generate list of season options
  const seasonOptions: { id: string; label: string; subtext?: string }[] = [];
  
  if (availableSeasons.length > 0) {
    availableSeasons.forEach((s) => {
      seasonOptions.push({
        id: `Season ${s.seasonNumber}`,
        label: s.name || `Season ${s.seasonNumber}`,
        subtext: `${s.episodeCount || 0} Episodes${s.discsCount ? ` • ${s.discsCount} Discs` : ''}`
      });
    });
  } else {
    for (let i = 1; i <= numSeasons; i++) {
      seasonOptions.push({
        id: `Season ${i}`,
        label: `Season ${i}`,
        subtext: `Full Season Set`
      });
    }
  }

  // Generate disc options if discsCount exists
  const discOptions: { id: string; label: string }[] = [];
  if (item.discsCount && item.discsCount > 1) {
    for (let d = 1; d <= item.discsCount; d++) {
      discOptions.push({
        id: `Disc ${d}`,
        label: `Disc ${d}`
      });
    }
  }

  // Default to selecting all seasons on modal open if nothing previously selected
  useEffect(() => {
    if (isOpen && selectedItems.length === 0) {
      if (seasonOptions.length > 0) {
        setSelectedItems(seasonOptions.map(s => s.id));
      } else {
        setSelectedItems(['Full Series Box Set']);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(i => i !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllSeasons = () => {
    const all = seasonOptions.map(s => s.id);
    setSelectedItems(all);
  };

  const handleSelectFullBoxSet = () => {
    setSelectedItems(['Full Complete Series Box Set']);
  };

  const handleAddCustomItem = () => {
    if (!customItemInput.trim()) return;
    const clean = customItemInput.trim();
    if (!selectedItems.includes(clean)) {
      setSelectedItems(prev => [...prev, clean]);
    }
    setCustomItemInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lentTo.trim()) return;
    if (selectedItems.length === 0) {
      alert('Please select at least one season, disc, or item to lend out.');
      return;
    }

    onConfirmLoan({
      isLentOut: true,
      lentTo: lentTo.trim(),
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      lentItems: selectedItems
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full my-auto space-y-5 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-12 h-16 object-cover rounded-xl border border-slate-800 bg-slate-950 shrink-0 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Tv className="w-3 h-3" /> TV Show Loan Selection
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                  {item.format}
                </span>
              </div>
              <h3 className="font-extrabold text-lg text-white mt-1 leading-tight">{item.title}</h3>
              <p className="text-xs text-slate-400">Select which seasons or discs are being lent out</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          
          {/* QUICK SELECT PRESETS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Items to Lend Out</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAllSeasons}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Select All Seasons ({seasonOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={handleSelectFullBoxSet}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Full Box Set / Complete Series</span>
              </button>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 text-xs font-bold border border-slate-800 transition-all"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* SEASONS CHECKBOX LIST */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Seasons Checklist ({seasonOptions.length} Available)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {seasonOptions.map((s) => {
                const isSelected = selectedItems.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleItem(s.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/70 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1 rounded-md ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <p className={`font-extrabold text-xs truncate ${isSelected ? 'text-amber-200' : 'text-slate-300'}`}>
                          {s.label}
                        </p>
                        {s.subtext && <p className="text-[10px] text-slate-400 font-mono">{s.subtext}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DISCS CHECKLIST (IF MULTI-DISC) */}
          {discOptions.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Individual Discs ({discOptions.length} Total Discs)
              </span>

              <div className="flex flex-wrap gap-2">
                {discOptions.map((d) => {
                  const isSelected = selectedItems.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleItem(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADD CUSTOM ITEM INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold block">Add Custom Item / Special Disc</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Season 1 Bonus Features Disc, Steelbook Case..."
                value={customItemInput}
                onChange={(e) => setCustomItemInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* LIVE SELECTION SUMMARY BADGES */}
          {selectedItems.length > 0 && (
            <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>Items Selected for Loan ({selectedItems.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedItems.map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className="text-amber-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* BORROWER & LOAN DETAILS FORM */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Borrower Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus (Cousin)"
                  value={lentTo}
                  onChange={(e) => setLentTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expected Return Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Loan Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Lent at movie night, promised return by next weekend"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!lentTo.trim() || selectedItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/50 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Handshake className="w-4 h-4" />
              <span>Confirm & Lend Selected Items ({selectedItems.length})</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
