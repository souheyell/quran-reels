import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  XOctagon, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Radio, 
  Zap, 
  Share2, 
  Sparkles
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button, ProgressBar } from '../shared';

export const BatchProgressScreen: React.FC = () => {
  const { 
    batches, 
    activityLogs, 
    pages, 
    pauseBatch, 
    resumeBatch, 
    cancelBatch, 
    retryFailedInBatch, 
    setDiagnosticsModalReel, 
    reels, 
    setActiveTab 
  } = useStudio();

  const activeBatch = batches.find((b) => b.status === 'ACTIVE' || b.status === 'PAUSED') || batches[0];

  if (!activeBatch) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl max-w-lg mx-auto my-12">
        <h3 className="font-serif font-bold text-xl text-white">No active batches</h3>
        <p className="text-xs text-on-surface-variant mt-2">
          Create a batch from the Reel Queue to start monitoring bulk publishing progress.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => setActiveTab('queue')}
          className="mt-4"
        >
          Go to Reel Queue
        </Button>
      </div>
    );
  }

  const isPaused = activeBatch.status === 'PAUSED';
  const targetPages = pages.filter((p) => activeBatch.targetPageIds.includes(p.id));

  return (
    <div className="space-y-6 pb-16">
      {/* Screen Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              BATCH STUDIO
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Pipeline Monitor
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Batch Publishing Progress
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => alert('Publishing Report downloaded (CSV/JSON)')}
          >
            Export Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('queue')}
          >
            View All Reels
          </Button>
        </div>
      </div>

      {/* Main Header Batch Monitor Card */}
      <div className="glass-panel-gold p-6 md:p-8 rounded-3xl border relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isPaused ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-secondary/20 text-secondary border border-secondary/40'
              }`}>
                ● {activeBatch.status}
              </span>
              <span className="text-xs font-mono text-on-surface-variant">
                ID: {activeBatch.id}
              </span>
            </div>

            <h2 className="text-2xl font-serif font-bold text-white tracking-wide">
              {activeBatch.name}
            </h2>

            <div className="text-xs text-on-surface-variant font-mono mt-1 flex items-center gap-2">
              <span>Target Pages:</span>
              {targetPages.map((p) => (
                <span key={p.id} className="text-white font-semibold flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-primary-container" /> {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isPaused ? (
              <Button
                variant="primary"
                size="md"
                icon={<Play className="w-4 h-4" />}
                onClick={() => resumeBatch(activeBatch.id)}
                className="shadow-gold-glow"
              >
                Resume Publishing
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                icon={<Pause className="w-4 h-4" />}
                onClick={() => pauseBatch(activeBatch.id)}
              >
                Pause Batch
              </Button>
            )}

            {activeBatch.failedCount > 0 && (
              <Button
                variant="danger"
                size="md"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => retryFailedInBatch(activeBatch.id)}
              >
                Retry Failed ({activeBatch.failedCount})
              </Button>
            )}

            <Button
              variant="ghost"
              size="md"
              icon={<XOctagon className="w-4 h-4 text-red-400" />}
              onClick={() => cancelBatch(activeBatch.id)}
              className="hover:bg-red-500/10 text-red-400"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Counter Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-black/50 border border-white/10 mb-6 font-mono">
          <div className="p-2">
            <div className="text-[11px] text-on-surface-variant/70">TOTAL REELS</div>
            <div className="text-2xl font-bold text-white mt-1">{activeBatch.totalReels}</div>
          </div>
          <div className="p-2 border-l border-white/10">
            <div className="text-[11px] text-secondary flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PUBLISHED
            </div>
            <div className="text-2xl font-bold text-secondary mt-1">{activeBatch.publishedCount}</div>
          </div>
          <div className="p-2 border-l border-white/10">
            <div className="text-[11px] text-primary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> QUEUED
            </div>
            <div className="text-2xl font-bold text-primary mt-1">{activeBatch.queuedCount}</div>
          </div>
          <div className="p-2 border-l border-white/10">
            <div className="text-[11px] text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> UPLOADING
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{activeBatch.uploadingCount}</div>
          </div>
          <div className="p-2 border-l border-white/10">
            <div className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> FAILED
            </div>
            <div className="text-2xl font-bold text-red-400 mt-1">{activeBatch.failedCount}</div>
          </div>
        </div>

        {/* Progress Bar & Eta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-semibold">
              Publishing Progress: {activeBatch.progressPercent}% Complete ({activeBatch.publishedCount} of {activeBatch.totalReels} Reels published)
            </span>
            <span className="text-primary font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Est. {activeBatch.estimatedRemainingMins} minutes remaining</span>
            </span>
          </div>
          <ProgressBar progress={activeBatch.progressPercent} height="h-4" colorVariant="gradient" />
        </div>
      </div>

      {/* Two Column Layout: Live Activity Feed vs Diagnostics & Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Live Event Stream */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-secondary animate-pulse" />
              <h3 className="font-serif font-bold text-white text-base">
                Batch Real-Time Event Stream
              </h3>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">
              Active WebSocket Pipe
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                  log.isError
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="p-2 rounded-lg bg-black/50 shrink-0 mt-0.5">
                  {log.actionType === 'PUBLISHED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : log.actionType === 'UPLOADING' ? (
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-semibold text-white truncate">
                      {log.reelTitle}
                    </h5>
                    <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                    → Page: {log.pageName}
                  </p>

                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {log.message}
                  </p>

                  {log.isError && (
                    <button
                      onClick={() => {
                        const matchedReel = reels.find((r) => r.id === log.reelId) || reels[0];
                        setDiagnosticsModalReel(matchedReel);
                      }}
                      className="mt-2 text-xs font-mono font-semibold text-red-300 hover:text-red-200 underline flex items-center gap-1"
                    >
                      <span>View Diagnostics & 1-Click Fix →</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Diagnostics & Health */}
        <div className="lg:col-span-5 space-y-6">
          {/* Publishing Health & Rate */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-container" />
              <h4 className="font-serif font-bold text-white text-sm">
                Publishing Pipeline Diagnostics
              </h4>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <span className="text-on-surface-variant">Dispatch Pacing</span>
                <span className="text-white font-semibold">1 Reel every 3 mins</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <span className="text-on-surface-variant">Meta Rate-Limit Budget</span>
                <span className="text-emerald-400 font-semibold">92% Available</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <span className="text-on-surface-variant">Audio Standard</span>
                <span className="text-primary font-semibold">-14.0 LUFS Normalized</span>
              </div>
            </div>
          </div>

          {/* Target Pages Health Status */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
            <h4 className="font-serif font-bold text-white text-sm">
              Target Facebook Pages Health
            </h4>

            <div className="space-y-2.5">
              {targetPages.map((page) => (
                <div
                  key={page.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={page.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-white/15"
                    />
                    <div>
                      <h5 className="text-xs font-semibold text-white">{page.name}</h5>
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {(page.followersCount / 1000).toFixed(0)}K Followers
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    HEALTHY
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
