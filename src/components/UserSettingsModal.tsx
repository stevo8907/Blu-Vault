import React, { useState, useEffect } from 'react';
import { Settings, Shield, User as UserIcon, Lock, Check, X, KeyRound, Eye, EyeOff, Sparkles, Users } from 'lucide-react';
import { User } from '../types';
import { updateUser } from '../lib/api';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdated: (updatedUser: User) => void;
  onNavigateToUserManagement?: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onNavigateToUserManagement
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState('🎬');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const EMOJI_AVATARS = ['🎬', '🛡️', '📺', '🍿', '📀', '🎮', '⭐', '🚀', '👾', '🎧'];

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setAvatar(currentUser.avatar || '🎬');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Username cannot be empty.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (password && password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateUser(currentUser.id, {
        username: username.trim(),
        avatar,
        password: password ? password.trim() : undefined
      });

      onUserUpdated(updated);
      setSuccessMsg('User settings updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">User Account Settings</h2>
              <p className="text-xs text-slate-400 font-mono">Personal Profile & Security Credentials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 p-3 rounded-xl text-xs text-rose-200 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-200 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Role & Permissions Summary Card */}
          <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono uppercase font-bold">Active Profile:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold capitalize bg-indigo-950 text-indigo-300 border border-indigo-800">
                {currentUser.role}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-2xl">{currentUser.avatar}</span>
              <div>
                <p className="text-sm font-extrabold text-white">{currentUser.username}</p>
                <p className="text-[11px] text-slate-400 font-mono">Created: {new Date(currentUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" /> Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none transition-all"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Avatar Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_AVATARS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setAvatar(e)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      avatar === e ? 'bg-cyan-500 text-slate-950 scale-105 border-2 border-white' : 'bg-slate-950 border border-slate-800'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <label className="text-xs font-bold text-slate-300 block flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Change Password (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                </button>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none font-mono"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-between gap-3">
              {onNavigateToUserManagement && (currentUser.permissions?.canManageUsers || currentUser.role === 'admin') ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToUserManagement();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>User Admin Console</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
