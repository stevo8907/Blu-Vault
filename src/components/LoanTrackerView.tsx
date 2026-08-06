import React from 'react';
import { Handshake, Calendar, CheckCircle, Clock, MapPin, Disc, User, AlertTriangle, Lock } from 'lucide-react';
import { MediaItem, User as UserType } from '../types';

interface LoanTrackerViewProps {
  mediaItems: MediaItem[];
  currentUser?: UserType | null;
  onReturnDisc: (id: string) => void;
  onSelectItem: (item: MediaItem) => void;
}

export const LoanTrackerView: React.FC<LoanTrackerViewProps> = ({
  mediaItems,
  currentUser,
  onReturnDisc,
  onSelectItem
}) => {
  if (currentUser?.permissions && currentUser.permissions.canManageLoans === false) {
    return (
      <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-w-2xl mx-auto text-center space-y-4 shadow-2xl my-12 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your user profile (<span className="text-cyan-400 font-bold">{currentUser.username}</span>) does not have permission to manage physical disc loans.
          </p>
        </div>
      </div>
    );
  }

  const lentItems = mediaItems.filter(m => m.loanStatus?.isLentOut);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-950 border border-amber-800/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <Handshake className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">Physical Disc Loan Tracker</h2>
            <p className="text-xs text-slate-400 font-mono">
              Never lose a DVD, 4K Blu-Ray, or Game box lent to friends or family
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-amber-950/80 border border-amber-700/60 text-amber-300 font-mono text-sm font-bold flex items-center gap-2">
          <Disc className="w-4 h-4 text-amber-400" />
          <span>{lentItems.length} Discs Currently Lent Out</span>
        </div>
      </div>

      {lentItems.length === 0 && (
        <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">All Physical Discs Safely in Vault</h3>
          <p className="text-xs text-slate-400 mt-1">
            None of your physical movies or TV show box sets are currently lent out. You can mark any disc as lent out directly from its detail page!
          </p>
        </div>
      )}

      {lentItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lentItems.map((item) => {
            const isOverdue = item.loanStatus?.dueDate 
              ? new Date(item.loanStatus.dueDate) < new Date() 
              : false;

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-amber-800/40 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-lg"
              >
                <div className="flex gap-3">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-16 h-24 object-cover rounded-xl border border-slate-800 bg-slate-950 shrink-0 cursor-pointer"
                    onClick={() => onSelectItem(item)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.format}
                      </span>
                    </div>
                    <h4 
                      onClick={() => onSelectItem(item)}
                      className="font-bold text-sm text-white hover:text-cyan-300 truncate cursor-pointer"
                    >
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Location: {item.shelfLocation}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.loanStatus?.lentTo || 'Borrower'}</span>
                    </span>
                    {item.loanStatus?.lentDate && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Lent: {item.loanStatus.lentDate}
                      </span>
                    )}
                  </div>

                  {/* Lent Items / Seasons / Discs List Badges */}
                  {item.loanStatus?.lentItems && item.loanStatus.lentItems.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lent Items / Seasons:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.loanStatus.lentItems.map((lentItem, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold"
                          >
                            {lentItem}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.loanStatus?.dueDate && (
                    <div className={`flex items-center gap-1 font-mono text-[11px] ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      <Clock className="w-3 h-3" />
                      <span>Due: {item.loanStatus.dueDate} {isOverdue ? '(OVERDUE)' : ''}</span>
                    </div>
                  )}

                  {item.loanStatus?.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                      "{item.loanStatus.notes}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onReturnDisc(item.id)}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Disc Returned</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
