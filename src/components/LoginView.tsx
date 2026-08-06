import React, { useState } from 'react';
import { Lock, User as UserIcon, LogIn, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { loginUser } from '../lib/api';
import { User } from '../types';
import { LogoIcon } from './LogoIcon';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  onRequestOobe?: () => void;
  isOobeAvailable?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onRequestOobe,
  isOobeAvailable = false
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginUser(username.trim(), password);
      if (res.user) {
        onLoginSuccess(res.user, res.token || 'session_token');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden my-auto animate-fade-in">
        
        {/* Header Branding */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 text-center relative flex flex-col items-center">
          <LogoIcon size="xl" className="mb-3" animated />

          <h1 className="text-2xl font-black text-white tracking-wider">BLU-VAULT</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">Physical Media Collection Server</p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold text-white">Sign In to Your Vault</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[11px] text-indigo-300 font-mono">
              <AlertCircle className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Username & Password are case sensitive ('A' ≠ 'a')</span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-950/80 border border-rose-800 p-3.5 rounded-2xl text-xs text-rose-200 font-medium text-center">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" /> Username
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" /> Password
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                </button>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-cyan-300" />
                  <span>Sign In</span>
                </>
              )}
            </button>

          </form>

          {isOobeAvailable && onRequestOobe && (
            <div className="pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onRequestOobe}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono flex items-center justify-center gap-1 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5" /> First-time server setup? Run OOBE Wizard
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
