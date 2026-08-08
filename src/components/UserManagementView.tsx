import React, { useState } from 'react';
import { Users, Shield, Plus, Lock, CheckCircle, Trash2, Edit3, UserPlus, KeyRound, Check, X, ShieldAlert, Sparkles, Eye, PowerOff, Ban, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [isDisabled, setIsDisabled] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewMedia: true,
    canAddMedia: true,
    canEditMedia: true,
    canDeleteMedia: false,
    canManageLoans: true,
    canManageApiKeys: false,
    canManageUsers: false
  });

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [adminDeletePassword, setAdminDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsDisabled(false);
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
    setIsDisabled(Boolean(user.disabled));
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

  const isSelfEditing = editingUserId === currentUser?.id;

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setFormError('');

    // Security guard: prevent modifying own role or permissions or self-disabling
    const finalRole = isSelfEditing && currentUser ? currentUser.role : role;
    const finalPermissions = isSelfEditing && currentUser ? (currentUser.permissions || permissions) : permissions;
    const finalDisabled = isSelfEditing ? false : isDisabled;

    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          username: username.trim(),
          password: password ? password : undefined,
          role: finalRole,
          avatar,
          pin: pin || undefined,
          disabled: finalDisabled,
          permissions: finalPermissions
        });
      } else {
        await createUser({
          username: username.trim(),
          password: password ? password : undefined,
          role,
          avatar,
          pin: pin || undefined,
          disabled: finalDisabled,
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

  const handleToggleDisable = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot disable your own active administrator account.');
      return;
    }
    try {
      await updateUser(targetUser.id, { disabled: !targetUser.disabled });
      onRefreshUsers();
    } catch (err: any) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleOpenDeleteModal = (usr: User) => {
    if (usr.role === 'admin') {
      alert('Master Administrator accounts cannot be deleted.');
      return;
    }
    setDeletingUser(usr);
    setAdminDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser) return;
    if (!adminDeletePassword.trim()) {
      setDeleteError('Master Admin Password is required.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteUser(deletingUser.id, adminDeletePassword.trim());
      setDeletingUser(null);
      onRefreshUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion failed. Incorrect admin password.');
    } finally {
      setIsDeleting(false);
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
              Manage household profiles, account status, passwords, and access permission controls
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Role Preset {isSelfEditing && <span className="text-amber-400 font-normal">(Locked)</span>}
              </label>
              <select
                value={role}
                disabled={isSelfEditing}
                onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none capitalize ${
                  isSelfEditing ? 'opacity-60 border-amber-800/60 cursor-not-allowed bg-slate-950/80' : 'border-slate-800 focus:border-cyan-500'
                }`}
              >
                <option value="admin">Master Administrator (Full Access)</option>
                <option value="editor">Editor / Collector (Add/Edit Media & Loans)</option>
                <option value="viewer">Viewer / Guest (Read Only)</option>
                <option value="custom">Custom Permissions</option>
              </select>
            </div>

            {/* Account Status Toggle */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Account Status</label>
              <button
                type="button"
                disabled={isSelfEditing}
                onClick={() => setIsDisabled(!isDisabled)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  isDisabled
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                } ${isSelfEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  {isDisabled ? <Ban className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {isDisabled ? 'Disabled' : 'Active Account'}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950">Toggle</span>
              </button>
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
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> User Permission Settings
              </h4>
              {isSelfEditing && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Permissions Locked
                </span>
              )}
            </div>

            {isSelfEditing && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>As a security safeguard, you cannot modify or revoke your own active permissions or disable yourself.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canViewMedia}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canViewMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">👁️ View Media Collection</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canAddMedia}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canAddMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">➕ Add New Media Items</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canEditMedia}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canEditMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">✏️ Edit Media Details</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canDeleteMedia}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canDeleteMedia: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">🗑️ Delete Media Items</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canManageLoans}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canManageLoans: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">🤝 Manage Loans & Borrowers</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canManageApiKeys}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canManageApiKeys: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-slate-200">🔑 Configure API Keys</span>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isSelfEditing ? 'bg-slate-950/50 border-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-850'
              }`}>
                <input
                  type="checkbox"
                  disabled={isSelfEditing}
                  checked={permissions.canManageUsers}
                  onChange={(e) => {
                    if (isSelfEditing) return;
                    setPermissions({ ...permissions, canManageUsers: e.target.checked });
                    setRole('custom');
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 disabled:opacity-50"
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
          const isActiveSession = currentUser?.id === usr.id;
          const isAdminRole = usr.role === 'admin';

          return (
            <div
              key={usr.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                usr.disabled
                  ? 'bg-rose-950/20 border-rose-900/60 opacity-80'
                  : isActiveSession
                    ? 'bg-blue-950/40 border-blue-500/80 shadow-xl shadow-blue-500/10'
                    : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner shrink-0 relative">
                      {usr.avatar}
                      {usr.disabled && (
                        <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white">
                          <Ban className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-base text-white truncate flex items-center gap-2">
                        <span>{usr.username}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                          {usr.role}
                        </span>
                        {usr.disabled ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Disable/Enable Quick Toggle */}
                    {!isAdminRole && usr.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleDisable(usr)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          usr.disabled
                            ? 'text-emerald-400 hover:bg-emerald-950/60'
                            : 'text-amber-400 hover:bg-amber-950/60'
                        }`}
                        title={usr.disabled ? 'Enable Account' : 'Disable Account'}
                      >
                        {usr.disabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => handleStartEdit(usr)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Profile & Permissions"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete button: ADMIN users CANNOT be deleted */}
                    {isAdminRole ? (
                      <span
                        className="p-1.5 rounded-lg text-slate-600 bg-slate-950/50 border border-slate-800/50 cursor-not-allowed"
                        title="Master Administrator accounts cannot be deleted"
                      >
                        <Lock className="w-4 h-4 text-slate-500" />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenDeleteModal(usr)}
                        disabled={usr.id === currentUser?.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          usr.id === currentUser?.id
                            ? 'text-slate-700 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/50'
                        }`}
                        title="Delete User Account"
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
                {isActiveSession ? (
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

      {/* Delete User Modal with Admin Password Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDelete} className="bg-slate-900 border border-rose-800/80 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Confirm User Account Deletion</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete user <span className="text-rose-300 font-bold font-mono">{deletingUser.username}</span>?
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-xs text-rose-200 font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Enter Master Admin Password to Authorize *
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter Master Admin Password..."
                value={adminDeletePassword}
                onChange={(e) => setAdminDeletePassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting || !adminDeletePassword.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirm & Delete User</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
