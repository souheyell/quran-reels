import React from 'react';
import { 
  UploadCloud, 
  Settings, 
  CheckCircle2, 
  Play, 
  Pause, 
  AlertTriangle
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export interface TopNavBarProps {
  onSwitchToCreator?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onSwitchToCreator }) => {
  const { 
    pages, 
    reels, 
    isWorkerRunning, 
    toggleWorker, 
    setActiveTab
  } = useStudio();

  const connectedPagesCount = pages.filter((p) => p.status === 'CONNECTED').length;
  const hasTokenWarning = pages.some((p) => p.status === 'TOKEN_WARNING');
  const uploadingReelsCount = reels.filter((r) => r.status === 'UPLOADING').length;

  return (
    <header className="h-16 w-full border-b border-white/10 bg-[#051424]/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#B45309] flex items-center justify-center text-black font-bold shadow-gold-glow group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-2xl text-black font-bold">mosque</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg text-white tracking-wide group-hover:text-primary transition-colors">
                ReelsBulkQuran
              </span>
              <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                STUDIO PRO
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono flex items-center gap-1.5">
              <span>Facebook Bulk Publishing Studio</span>
              <span className="text-white/30">•</span>
              <span className="text-emerald-400/90 font-serif">صدقة جارية</span>
            </p>
          </div>
        </button>
      </div>

      {/* Center Engine Status Pill */}
      <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-on-surface-variant">Publishing Engine:</span>
          <button
            onClick={() => toggleWorker()}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold transition-all ${
              isWorkerRunning
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
            }`}
          >
            {isWorkerRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE {uploadingReelsCount > 0 ? `(${uploadingReelsCount} active)` : 'IDLE'}</span>
                <Pause className="w-3 h-3 ml-1 opacity-70" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>PAUSED</span>
                <Play className="w-3 h-3 ml-1 opacity-70" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Switch to Reel Creator Studio button */}
        {onSwitchToCreator && (
          <button
            onClick={onSwitchToCreator}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-amber-600/25 border border-amber-500/50 text-amber-300 hover:text-white hover:border-amber-400 hover:from-amber-500/40 hover:to-amber-600/40 font-semibold text-xs transition-all shadow-gold-glow cursor-pointer"
            title="Switch back to Quran Reel Creator Studio"
          >
            <span>🎨</span>
            <span>Reel Creator Studio</span>
          </button>
        )}

        {/* Facebook Connection Status */}
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            hasTokenWarning
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
              : 'bg-white/5 border-white/10 text-on-surface hover:bg-white/10 hover:border-white/20'
          }`}
          title="Manage connected Facebook Pages"
        >
          {hasTokenWarning ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
          )}
          <span>{connectedPagesCount} FB Pages</span>
          {hasTokenWarning && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        {/* Quick Upload CTA */}
        <Button
          variant="primary"
          size="sm"
          icon={<UploadCloud className="w-4 h-4" />}
          onClick={() => setActiveTab('upload')}
          className="shadow-gold-glow"
        >
          Upload Reels
        </Button>

        {/* Settings button */}
        <button
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
          title="Studio & Meta API Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
