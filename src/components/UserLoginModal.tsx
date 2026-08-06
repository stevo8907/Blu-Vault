import React, { useState } from 'react';
import { Users, Shield, Lock, Check, Plus, X, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';
import { createUser } from '../lib/api';
import { LogoIcon } from './LogoIcon';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onUserCreated: (newUser: User) => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onUserCreated
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');
  const [selectedProfile, setSelectedProfile] = useState<User | null>(currentUser);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // New Profile Form state
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('editor');
  const [newAvatar, setNewAvatar] = useState('🎬');
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const EMOJI_AVATARS = ['🎬', '🛡️', '📺', '🍿', '📀', '🎮', '⭐', '🚀', '👾', '🎧'];

  const handleProfileClick = (usr: User) => {
    setSelectedProfile(usr);
    setPinInput('');
    setPinError('');
    if (!usr.pin) {
      onSelectUser(usr);
      onClose();
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    if (selectedProfile.pin && pinInput !== selectedProfile.pin) {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }

    onSelectUser(selectedProfile);
    onClose();
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    try {
      const created = await createUser({ username: newUsername, role: newRole, avatar: newAvatar, pin: newPin || undefined });
      onUserCreated(created);
      onSelectUser(created);
      onClose();
    } catch (err: any) {
      alert(`Failed to create user profile: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon size="md" />
            <div>
              <h2 className="font-extrabold text-lg text-white">Blu-Vault User Profiles</h2>
              <p className="text-xs text-slate-400 font-mono">Shared Homelab Disc Library Access</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('select')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'select'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Switch Profile ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            + Create New Profile
          </button>
        </div>

        {/* TAB 1: SELECT PROFILE */}
        {activeTab === 'select' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {users.map((usr) => {
                const isActive = currentUser?.id === usr.id;
                const isSelected = selectedProfile?.id === usr.id;

                return (
                  <button
                    key={usr.id}
                    onClick={() => handleProfileClick(usr)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-2 group ${
                      isSelected
                        ? 'bg-blue-950/80 border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      {usr.avatar}
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-sm text-white block group-hover:text-cyan-300">
                        {usr.username}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize font-mono block">
                        {usr.role} {usr.pin ? '🔒' : ''}
                      </span>
                    </div>

                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                        Active Now
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* If Selected Profile has PIN */}
            {selectedProfile && selectedProfile.pin && (
              <form onSubmit={handleVerifyPin} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Enter PIN for {selectedProfile.username}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter PIN..."
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Login
                  </button>
                </div>

                {pinError && <p className="text-xs text-rose-400 font-mono">{pinError}</p>}
              </form>
            )}

          </div>
        )}

        {/* TAB 2: CREATE PROFILE */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Profile Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Media Room, Sarah"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">User Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="member">Household Member</option>
                  <option value="admin">Vault Master (Admin)</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">PIN Code (Optional)</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Choose Avatar Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      newAvatar === emoji
                        ? 'bg-blue-600 border-2 border-white scale-110 shadow-lg'
                        : 'bg-slate-950 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                Create & Switch
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
