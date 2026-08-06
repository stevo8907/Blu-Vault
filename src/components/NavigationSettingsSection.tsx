import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Edit3, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Film, 
  Tv, 
  Gamepad2, 
  Check, 
  X, 
  Sparkles, 
  SlidersHorizontal,
  FolderPlus
} from 'lucide-react';
import { 
  NavItem, 
  getSavedNavItems, 
  saveNavItems, 
  resetNavItemsToDefault 
} from '../lib/navConfig';

export const NavigationSettingsSection: React.FC = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editKeyword, setEditKeyword] = useState('');

  // Add Custom Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroup, setNewGroup] = useState<'movies' | 'tv' | 'games'>('movies');
  const [newLabel, setNewLabel] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('blu_vault_nav_updated', handleUpdate);
    return () => window.removeEventListener('blu_vault_nav_updated', handleUpdate);
  }, []);

  const loadItems = () => {
    setNavItems(getSavedNavItems());
  };

  const handleToggleHide = (id: string) => {
    const updated = navItems.map(item => 
      item.id === id ? { ...item, hidden: !item.hidden } : item
    );
    setNavItems(updated);
    saveNavItems(updated);
  };

  const startEditing = (item: NavItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditKeyword(item.customKeyword || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
    setEditKeyword('');
  };

  const saveEditing = (id: string) => {
    if (!editLabel.trim()) return;
    const updated = navItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          label: editLabel.trim(),
          customKeyword: editKeyword.trim() || undefined
        };
      }
      return item;
    });
    setNavItems(updated);
    saveNavItems(updated);
    cancelEditing();
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to remove this menu entry?')) {
      const updated = navItems.filter(item => item.id !== id);
      setNavItems(updated);
      saveNavItems(updated);
    }
  };

  const handleAddCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newItem: NavItem = {
      id: `custom-${newGroup}-${Date.now()}`,
      label: newLabel.trim(),
      group: newGroup,
      filterType: 'custom',
      customKeyword: newKeyword.trim() || newLabel.trim(),
      icon: newGroup === 'movies' ? 'film' : newGroup === 'tv' ? 'tv' : 'gamepad',
      hidden: false,
      isCustom: true
    };

    const updated = [...navItems, newItem];
    setNavItems(updated);
    saveNavItems(updated);

    setNewLabel('');
    setNewKeyword('');
    setShowAddModal(false);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset sidebar menu entries to factory defaults?')) {
      const defaults = resetNavItemsToDefault();
      setNavItems(defaults);
    }
  };

  const renderGroupSection = (
    groupKey: 'movies' | 'tv' | 'games',
    title: string,
    icon: React.ReactNode,
    borderColor: string,
    badgeBg: string
  ) => {
    const groupItems = navItems.filter(item => item.group === groupKey);

    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-slate-950/80 border ${borderColor} space-y-4 shadow-sm`}>
        {/* Group Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {icon}
            <h4 className={`font-extrabold text-sm tracking-wide ${groupKey === 'games' ? 'text-slate-400 line-through' : 'text-white'}`}>
              {title} Section
            </h4>
            {groupKey === 'games' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-bold">
                Feature not currently functional
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap ${badgeBg}`}>
                {groupItems.filter(i => !i.hidden).length} / {groupItems.length} Visible
              </span>
            )}
          </div>

          {groupKey !== 'games' && (
            <button
              onClick={() => {
                setNewGroup(groupKey);
                setShowAddModal(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          )}
        </div>

        {/* List of Entries */}
        <div className="space-y-2">
          {groupItems.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No entries in this section.</p>
          ) : (
            groupItems.map(item => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.hidden 
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60' 
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Entry Name..."
                          className="flex-1 bg-slate-950 border border-blue-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-bold"
                          autoFocus
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => saveEditing(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                            title="Save Changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(item.isCustom || item.filterType === 'custom') && (
                        <input
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          placeholder="Search Filter Keyword..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      {/* Left side: Hide toggle + Label & Keyword */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleHide(item.id)}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            item.hidden 
                              ? 'text-slate-500 hover:text-slate-300 bg-slate-950/60' 
                              : 'text-emerald-400 hover:bg-emerald-950/40 bg-emerald-950/20'
                          }`}
                          title={item.hidden ? 'Unhide / Show in Menu' : 'Hide from Menu'}
                        >
                          {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold leading-snug ${item.hidden ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                              {item.label}
                            </span>
                            {item.isCustom && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[9px] font-mono shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                          {item.customKeyword && (
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              Filter: "{item.customKeyword}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Action controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          title="Rename / Edit Entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" /> Sidebar Navigation & Hamburger Menu Customizer
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Hide/unhide categories, rename menu items, or add custom sub-filter entries for Movies, TV Shows, and Video Games.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setNewGroup('movies');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Custom Entry</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
            title="Reset to Factory Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {renderGroupSection(
          'movies',
          'Movies',
          <Film className="w-4 h-4 text-blue-400" />,
          'border-blue-900/40',
          'bg-blue-950 text-blue-300 border border-blue-800'
        )}

        {renderGroupSection(
          'tv',
          'TV Shows',
          <Tv className="w-4 h-4 text-indigo-400" />,
          'border-indigo-900/40',
          'bg-indigo-950 text-indigo-300 border border-indigo-800'
        )}

        {renderGroupSection(
          'games',
          'Video Games',
          <Gamepad2 className="w-4 h-4 text-emerald-400" />,
          'border-emerald-900/40',
          'bg-emerald-950 text-emerald-300 border border-emerald-800'
        )}
      </div>

      {/* Modal to Add Custom Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Add Custom Menu Entry
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomEntry} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Section</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="movies">Movies</option>
                  <option value="tv">TV Shows</option>
                  <option value="games">Video Games</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Entry Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steelbooks, Criterion, Anime, Retro"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Filter Keyword / Search Term (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Steelbook, Criterion, VHS"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Items containing this keyword in title, format, or edition will be displayed when this menu item is selected.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newLabel.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold disabled:opacity-50"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
