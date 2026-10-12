import React from 'react';
import { 
  CheckCircle2, 
  ArrowUpCircle, 
  AlertTriangle, 
  Calendar, 
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Badge } from '../shared';

export const ActivityStream: React.FC = () => {
  const { activityLogs, setDiagnosticsModalReel, reels } = useStudio();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PUBLISHED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'UPLOADING':
        return <ArrowUpCircle className="w-4 h-4 text-primary animate-pulse" />;
      case 'SCHEDULED':
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case 'FAILED':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'VALIDATED':
        return <ShieldCheck className="w-4 h-4 text-secondary" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-on-surface-variant" />;
    }
  };

  const getBadgeVariant = (action: string) => {
    switch (action) {
      case 'PUBLISHED': return 'published';
      case 'UPLOADING': return 'uploading';
      case 'SCHEDULED': return 'scheduled';
      case 'FAILED': return 'failed';
      case 'VALIDATED': return 'ready';
      default: return 'ready';
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-secondary animate-pulse" />
          <h3 className="font-serif font-bold text-white text-base tracking-wide">
            Live Publishing Stream
          </h3>
        </div>
        <span className="text-[11px] font-mono text-on-surface-variant">
          Real-time Meta Graph Events
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
        {activityLogs.map((log) => (
          <div
            key={log.id}
            className={`p-3 rounded-xl border transition-all ${
              log.isError
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                : 'bg-white/5 border-white/5 hover:border-white/15'
            } flex items-start gap-3`}
          >
            <div className="p-1.5 rounded-lg bg-black/40 mt-0.5">
              {getActionIcon(log.actionType)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-white truncate">
                  {log.reelTitle}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant/70 shrink-0">
                  {log.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getBadgeVariant(log.actionType) as any}>
                  {log.actionType}
                </Badge>
                <span className="text-[11px] text-on-surface-variant font-mono truncate">
                  → {log.pageName}
                </span>
              </div>

              <p className="text-[11px] text-on-surface-variant leading-relaxed">
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
  );
};
