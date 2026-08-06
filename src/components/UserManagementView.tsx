import React, { useState } from 'react';
import { Users, Shield, Plus, Lock, CheckCircle, Trash2, Edit3, UserPlus, KeyRound, Check, X, ShieldAlert, Sparkles, Eye } from 'lucide-react';
import { User, UserRole, UserPermissions } from '../types';
import { createUser, updateUser, deleteUser } from '../lib/api';

interface UserManagementViewProps {
  users: User[];
  currentUser: User | null;
  onSelectUser?: (user: User) => void;
  onRefreshUsers: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onRefreshUsers
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [avatar, setAvatar] = useState('🎬');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewMedia: true,
    canAddMedia: true,
    canEditMedia: true,
    canDeleteMedia: false,
    canManageLoans: true,
    canManageApiKeys: false,
    canManageUsers: false
  });

  if (currentUser?.permissions && currentUser.permissions.canManageUsers === false) {
    return (
      <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-w-2xl mx-auto text-center space-y-4 shadow-2xl my-12 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your user profile (<span className="text-cyan-400 font-bold">{currentUser.username}</span>) does not have permission to manage user accounts.
          </p>
        </div>
      </div>
    );
  }

  const EMOJI_AVATARS = ['🎬', '🛡️', '📺', '🍿', '📀', '🎮', '⭐', '🚀', '👾', '🎧'];

  const handleRolePresetChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setPermissions({
        canViewMedia: true,
        canAddMedia: true,
        canEditMedia: true,
        canDeleteMedia: true,
        canManageLoans: true,
        canManageApiKeys: true,
        canManageUsers: true
      });
    } else if (selectedRole === 'editor') {
      setPermissions({
        canViewMedia: true,
        canAddMedia: true,
        canEditMedia: true,
        canDeleteMedia: false,
        canManageLoans: true,
        canManageApiKeys: false,
        canManageUsers: false
      });
    } else if (selectedRole === 'viewer') {
      setPermissions({
        canViewMedia: true,
        canAddMedia: false,
        canEditMedia: false,
        canDeleteMedia: false,
        canManageLoans: false,
        canManageApiKeys: false,
        canManageUsers: false
      });
    }
  };

  const handleStartAdd = () => {
    setEditingUserId(null);
    setUsername('');
    setPassword('');
    setRole('editor');
    setAvatar('🎬');
    setPin('');
    handleRolePresetChange('editor');
    setShowAddForm(true);
  };

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setAvatar(user.avatar);
    setPin(user.pin || '');
    setPermissions(user.permissions || {
      canViewMedia: true,
      canAddMedia: true,
      canEditMedia: true,
      canDeleteMedia: false,
      canManageLoans: true,
      canManageApiKeys: false,
      canManageUsers: false
    });
    setShowAddForm(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setFormError('');

    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          username: username.trim(),
          password: password ? password : undefined,
          role,
          avatar,
          pin: pin || undefined,
          permissions
        });
      } else {
        await createUser({
          username: username.trim(),
          password: password ? password : undefined,
          role,
          avatar,
          pin: pin || undefined,
          permissions
        });
      }

      onRefreshUsers();
      setShowAddForm(false);
      setEditingUserId(null);
    } catch (err: any) {
      setFormError(`User Operation Failed: ${err.message}`);
    }
  };

  const handleDelete = async (usr: User) => {
    try {
      await deleteUser(usr.id);
      onRefreshUsers();
    } catch (err: any) {
      setFormError(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">User Accounts & Permissions</h2>
            <p className="text-xs text-slate-400 font-mono">
              Manage household profiles, passwords, and access permission controls
            </p>
          </div>
        </div>

        <button
          onClick={handleStartAdd}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add User Profile</span>
        </button>
      </div>

      {/* Add / Edit User Form Modal/Card */}
      {showAddForm && (
        <form onSubmit={handleSaveUser} className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-3 animate-fade-in">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              {editingUserId ? 'Edit User Credentials & Permissions' : 'Create New User Profile'}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Username *</label>
              <input
                type="text"
                required
                placeholder="e.g. Living Room, Alex"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Password {editingUserId ? '(Leave blank to keep unchanged)' : '(Optional)'}
              </label>
              <input
                type="password"
                placeholder={editingUserId ? "••••••••" : "Set login password..."}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Role Preset</label>
              <select
                value={role}
                onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 capitalize"
              >
                <option value="admin">Master Administrator (Full Access)</option>
                <option value="editor">Editor / Collector (Add/Edit Media & Loans)</option>
                <option value="viewer">Viewer / Guest (Read Only)</option>
                <option value="custom">Custom Permissions</option>
              </select>
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">Avatar Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_AVATARS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    avatar === e ? 'bg-cyan-500 border-2 border-white text-slate-950 scale-105' : 'bg-slate-950 border border-slate-800'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> User Permission Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canViewMedia}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canViewMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">👁️ View Media Collection</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canAddMedia}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canAddMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">➕ Add New Media Items</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canEditMedia}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canEditMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">✏️ Edit Media Details</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canDeleteMedia}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canDeleteMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">🗑️ Delete Media Items</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canManageLoans}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canManageLoans: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">🤝 Manage Loans & Borrowers</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canManageApiKeys}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canManageApiKeys: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">🔑 Configure API Keys</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={permissions.canManageUsers}
                  onChange={(e) => {
                    setPermissions({ ...permissions, canManageUsers: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">👥 Manage System Users</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition-all"
            >
              {editingUserId ? 'Save Changes' : 'Create User Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Users List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((usr) => {
          const isActive = currentUser?.id === usr.id;

          return (
            <div
              key={usr.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500/80 shadow-xl shadow-blue-500/10'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {usr.avatar}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-base text-white truncate">{usr.username}</h4>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                        {usr.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(usr)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Profile & Permissions"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {users.length > 1 && (
                      <button
                        onClick={() => handleDelete(usr)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-mono font-semibold block uppercase">Active Permissions:</span>
                  <div className="flex flex-wrap gap-1">
                    {usr.permissions?.canViewMedia && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">View</span>
                    )}
                    {usr.permissions?.canAddMedia && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">Add</span>
                    )}
                    {usr.permissions?.canEditMedia && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">Edit</span>
                    )}
                    {usr.permissions?.canDeleteMedia && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">Delete</span>
                    )}
                    {usr.permissions?.canManageLoans && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50">Loans</span>
                    )}
                    {usr.permissions?.canManageApiKeys && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">APIs</span>
                    )}
                    {usr.permissions?.canManageUsers && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Admin</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {isActive ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Active Session User
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Log out to switch account
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
