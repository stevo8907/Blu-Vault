import React, { useState, useEffect } from 'react';
import { Disc, Radio, Eye, Layers, Sparkles, Check } from 'lucide-react';

export type LogoTheme = 'aperture' | 'neon-shutter' | 'cyber-shield' | 'laser-disc';

export interface LogoOptionInfo {
  id: LogoTheme;
  name: string;
  description: string;
}

export const LOGO_OPTIONS: LogoOptionInfo[] = [
  {
    id: 'aperture',
    name: 'Holographic Aperture Lens',
    description: 'A modern, high-tech optical aperture lens with cyan laser iris'
  },
  {
    id: 'neon-shutter',
    name: 'Neon Vault Disc',
    description: 'Concentric glowing neon vault rings with metallic core'
  },
  {
    id: 'cyber-shield',
    name: 'Cyber Archival Shield',
    description: 'High-security vault emblem housing a physical disc silhouette'
  },
  {
    id: 'laser-disc',
    name: 'Minimal Laser Disc',
    description: 'Clean geometric physical disc with optical track apertures'
  }
];

export function getSavedLogoTheme(): LogoTheme {
  const saved = localStorage.getItem('blu_vault_logo_theme');
  if (saved && ['aperture', 'neon-shutter', 'cyber-shield', 'laser-disc'].includes(saved)) {
    return saved as LogoTheme;
  }
  return 'aperture'; // Default sleek logo
}

export function setSavedLogoTheme(theme: LogoTheme): void {
  localStorage.setItem('blu_vault_logo_theme', theme);
  window.dispatchEvent(new Event('blu_vault_logo_updated'));
}

interface LogoIconProps {
  theme?: LogoTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  theme: customTheme,
  size = 'md',
  className = '',
  animated = false
}) => {
  const [activeTheme, setActiveTheme] = useState<LogoTheme>(customTheme || getSavedLogoTheme());

  useEffect(() => {
    if (customTheme) {
      setActiveTheme(customTheme);
      return;
    }
    const handleUpdate = () => {
      setActiveTheme(getSavedLogoTheme());
    };
    window.addEventListener('blu_vault_logo_updated', handleUpdate);
    return () => window.removeEventListener('blu_vault_logo_updated', handleUpdate);
  }, [customTheme]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl'
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  }[size];

  if (activeTheme === 'neon-shutter') {
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-500/10 blur-sm rounded-full" />
          <Radio className={`${iconSizes} text-cyan-400 ${animated ? 'animate-pulse' : ''}`} />
        </div>
      </div>
    );
  }

  if (activeTheme === 'cyber-shield') {
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-[1.5px] shadow-lg shadow-indigo-500/25 flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative">
          <Layers className={`${iconSizes} text-indigo-400 ${animated ? 'animate-bounce' : ''}`} />
        </div>
      </div>
    );
  }

  if (activeTheme === 'laser-disc') {
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-slate-800 via-blue-900 to-cyan-500 p-[1.5px] shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
          <Disc className={`${iconSizes} text-cyan-300 ${animated ? 'animate-spin-slow' : ''}`} />
        </div>
      </div>
    );
  }

  // Default: Holographic Aperture Lens
  return (
    <div className={`relative rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-xl shadow-cyan-500/30 flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}>
      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-blue-600/10 rounded-full blur-md" />
        <Eye className={`${iconSizes} text-cyan-400 relative z-10 ${animated ? 'animate-pulse' : ''}`} />
      </div>
    </div>
  );
};

export const LogoSelectorCard: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<LogoTheme>(getSavedLogoTheme());

  const handleSelect = (theme: LogoTheme) => {
    setSelectedTheme(theme);
    setSavedLogoTheme(theme);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" /> Blu-Vault Branding & Logo Style
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose your preferred Vault icon design for Header, Login screens, and Sidebar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LOGO_OPTIONS.map((opt) => {
          const isSelected = selectedTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/80 to-slate-950 border-cyan-500 text-white shadow-lg ring-2 ring-cyan-500/30'
                  : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/90 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <LogoIcon theme={opt.id} size="lg" />
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <div>
                <div className="font-extrabold text-xs text-white mb-0.5">{opt.name}</div>
                <div className="text-[10px] text-slate-400 leading-relaxed">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
