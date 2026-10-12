import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layers,
  UploadCloud
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button, ProgressBar } from '../shared';

export const ActiveBatchCard: React.FC = () => {
  const { batches, pauseBatch, resumeBatch, retryFailedInBatch, setActiveTab, pages } = useStudio();
  const activeBatch = batches.find((b) => b.status === 'ACTIVE' || b.status === 'PAUSED') || batches[0];

  if (!activeBatch) {
    return (
      <div className="glass-panel-gold p-6 md:p-8 rounded-3xl border border-primary/30 relative overflow-hidden flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              LIVE PUBLISHING READY
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              ● {pages.length} Connected Facebook Pages
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-white tracking-wide">
            No Active Batches Running
          </h3>
          <p className="text-xs text-on-surface-variant font-mono mt-1 leading-relaxed">
            Drop your vertical 9:16 Quran videos in the Bulk Upload dropzone to create your first publishing batch and distribute across your Facebook Pages.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud className="w-4 h-4" />}
            onClick={() => setActiveTab('upload')}
            className="shadow-gold-glow"
          >
            Upload Quran Reels
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Layers className="w-4 h-4" />}
            onClick={() => setActiveTab('queue')}
          >
            Open Reel Queue
          </Button>
        </div>
      </div>
    );
  }

  const isPaused = activeBatch.status === 'PAUSED';

  return (
    <div className="glass-panel-gold p-6 rounded-2xl border relative overflow-hidden">
      {/* Background mosque geometric accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              ACTIVE BATCH
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Created recently
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <span>{activeBatch.name}</span>
          </h3>
          <p className="text-xs text-on-surface-variant font-mono mt-1">
            Target Pages: <span className="text-primary">{pages.slice(0, 2).map((p) => p.name).join(', ')}</span>
          </p>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex items-center gap-2.5">
          {isPaused ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => resumeBatch(activeBatch.id)}
            >
              Resume
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pause className="w-3.5 h-3.5" />}
              onClick={() => pauseBatch(activeBatch.id)}
            >
              Pause
            </Button>
          )}

          {activeBatch.failedCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => retryFailedInBatch(activeBatch.id)}
            >
              Retry Failed ({activeBatch.failedCount})
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('batches')}
            className="text-primary hover:text-white"
          >
            <span>Monitor Batch</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Progress Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/10 mb-4 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-on-surface-variant/70 text-[10px]">TOTAL REELS</span>
          <span className="text-white font-bold text-base mt-0.5">{activeBatch.totalReels}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-secondary text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> PUBLISHED
          </span>
          <span className="text-secondary font-bold text-base mt-0.5">{activeBatch.publishedCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-primary text-[10px] flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> QUEUED
          </span>
          <span className="text-primary font-bold text-base mt-0.5">{activeBatch.queuedCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-amber-400 text-[10px] flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> UPLOADING
          </span>
          <span className="text-amber-400 font-bold text-base mt-0.5">{activeBatch.uploadingCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-red-400 text-[10px] flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" /> FAILED
          </span>
          <span className="text-red-400 font-bold text-base mt-0.5">{activeBatch.failedCount}</span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-on-surface-variant">
            Batch Completion Rate: <strong className="text-white">{activeBatch.progressPercent}%</strong> ({activeBatch.publishedCount} of {activeBatch.totalReels} reels)
          </span>
          <span className="text-primary flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>~{activeBatch.estimatedRemainingMins} mins remaining</span>
          </span>
        </div>
        <ProgressBar progress={activeBatch.progressPercent} height="h-3" colorVariant="gradient" />
      </div>
    </div>
  );
};
