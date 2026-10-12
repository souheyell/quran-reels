import React from 'react';
import { 
  Play, 
  Check, 
  AlertTriangle, 
  Volume2, 
  Send,
  Trash2,
  Film
} from 'lucide-react';
import type { Reel } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { Badge, ProgressBar } from '../shared';

export const ReelCard: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { 
    selectedReelIds, 
    toggleReelSelection, 
    openDrawer, 
    setDiagnosticsModalReel,
    setPublishModalReel,
    deleteReels,
    pages,
    showToast
  } = useStudio();

  const isSelected = selectedReelIds.includes(reel.id);

  const getStatusBadge = () => {
    switch (reel.status) {
      case 'READY':
        return <Badge variant="ready" dot>READY</Badge>;
      case 'UPLOADING':
        return <Badge variant="uploading" dot>UPLOADING ({reel.uploadProgress}%)</Badge>;
      case 'PUBLISHED':
        return <Badge variant="published" dot>PUBLISHED</Badge>;
      case 'FAILED':
        return <Badge variant="failed" dot>FAILED</Badge>;
      case 'SCHEDULED':
        return reel.isUploadedToCloud ? (
          <Badge variant="scheduled" dot className="bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold">
            ☁️ CLOUD SCHEDULED
          </Badge>
        ) : (
          <Badge variant="scheduled" dot>
            SCHEDULED
          </Badge>
        );
      case 'VALIDATING':
        return <Badge variant="validating" dot>VALIDATING</Badge>;
      case 'PROCESSING':
        return <Badge variant="validating" dot>PROCESSING</Badge>;
      default:
        return <Badge variant="ready">{reel.status}</Badge>;
    }
  };

  const targetPages = pages.filter((p) => reel.targetPageIds.includes(p.id));
  const displayThumb = reel.thumbnailUrl || reel.bgImageUrl;

  const handleQuickPublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPublishModalReel(reel);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReels([reel.id]);
    showToast(`Removed "${reel.title}"`, 'info');
  };

  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden border transition-all duration-200 group relative flex flex-col ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-gold-glow ring-1 ring-primary/40'
          : 'border-white/10 hover:border-primary/40 hover:bg-white/5'
      }`}
    >
      {/* Selection Checkbox */}
      <div 
        className="absolute top-3 left-3 z-30"
        onClick={(e) => {
          e.stopPropagation();
          toggleReelSelection(reel.id);
        }}
      >
        <button
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-primary text-black shadow-gold-glow font-bold'
              : 'bg-black/60 border border-white/30 text-transparent hover:border-white'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Status Badge Top Right */}
      <div className="absolute top-3 right-3 z-30">
        {getStatusBadge()}
      </div>

      {/* 9:16 Clean Unobstructed Thumbnail */}
      <div
        className="relative w-full aspect-[9/14] bg-black overflow-hidden cursor-pointer flex items-center justify-center"
        onClick={() => openDrawer(reel)}
      >
        {displayThumb ? (
          <img
            src={displayThumb}
            alt={reel.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-[#070D18] flex items-center justify-center">
            <Film className="w-10 h-10 text-primary/40" />
          </div>
        )}

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/30 backdrop-blur-[1px]">
          <div className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center shadow-gold-glow transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Uploading Progress Bar Overlay */}
        {reel.status === 'UPLOADING' && (
          <div className="absolute bottom-0 inset-x-0 bg-black/90 p-2.5 z-20">
            <div className="flex justify-between text-[10px] font-mono text-primary mb-1">
              <span>Uploading to Meta Graph...</span>
              <span>{reel.uploadProgress}%</span>
            </div>
            <ProgressBar progress={reel.uploadProgress} height="h-1.5" colorVariant="gold" />
          </div>
        )}

        {/* Audio Level Pill bottom left */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 backdrop-blur-md border ${
              reel.audioNormalized
                ? 'bg-black/75 border-secondary/40 text-secondary'
                : 'bg-amber-950/85 border-amber-500/50 text-amber-300'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>{reel.audioLufs} LUFS</span>
          </span>
        </div>

        {/* Duration bottom right */}
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white border border-white/15 backdrop-blur-md">
            {Math.floor(reel.durationSeconds / 60)}:{String(reel.durationSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Meta Content & Action Bar */}
      <div className="p-3 flex-1 flex flex-col justify-between bg-surface-container/70 space-y-2">
        <div>
          <h4
            onClick={() => openDrawer(reel)}
            className="text-xs font-semibold text-white group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
            title={reel.title}
          >
            {reel.title}
          </h4>
          <p className="text-[10px] font-mono text-on-surface-variant/70 truncate mt-0.5">
            {reel.filename}
          </p>
        </div>

        {/* Scheduled Info Indicator */}
        {reel.status === 'SCHEDULED' && (
          <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[10px] font-mono flex items-center justify-between">
            <span className="text-sky-300 flex items-center gap-1.5 truncate">
              <span>{reel.isUploadedToCloud ? '☁️ Meta Auto-Drop:' : '⏱️ Local Timer:'}</span>
              <span className="text-white font-semibold">
                {reel.scheduledTime ? new Date(reel.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
              </span>
            </span>
            {reel.isUploadedToCloud && (
              <span className="text-[9px] text-emerald-400 font-bold shrink-0 ml-1">
                Laptop Off OK
              </span>
            )}
          </div>
        )}

        {/* Destination Page and Quick Actions */}
        {reel.status === 'FAILED' ? (
          <div 
            onClick={() => setDiagnosticsModalReel(reel)}
            className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-mono cursor-pointer hover:bg-red-500/25 transition-colors flex items-center justify-between"
          >
            <span className="truncate flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Publishing Failed</span>
            </span>
            <span className="text-[10px] text-red-200 underline shrink-0">Fix & Retry →</span>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
            <span className="text-primary truncate font-semibold">
              {targetPages.length > 0 ? targetPages[0].name : 'أجر - Ajr'}
            </span>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1">
              {reel.status !== 'PUBLISHED' && reel.status !== 'UPLOADING' && (
                <button
                  onClick={handleQuickPublish}
                  title="Publish Reel Now"
                  className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-black transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleDelete}
                title="Delete Reel"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
