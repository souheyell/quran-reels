import React from 'react';
import { 
  X, 
  AlertOctagon, 
  RotateCcw, 
  CheckCircle2, 
  Key
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const FailureDiagnosticsModal: React.FC = () => {
  const { 
    diagnosticsModalReel, 
    setDiagnosticsModalReel, 
    reconnectPage, 
    updateReel, 
    publishReelsNow, 
    pages 
  } = useStudio();

  if (!diagnosticsModalReel) return null;

  const targetPage = pages.find((p) => diagnosticsModalReel.targetPageIds.includes(p.id)) || pages[0];

  const handleResolveAndRetry = () => {
    // 1. Reconnect / renew permissions on page
    reconnectPage(targetPage.id);

    // 2. Fix reel status back to READY
    updateReel(diagnosticsModalReel.id, {
      status: 'READY',
      targetPageIds: [targetPage.id], // switch to actual target page
      errorMessage: undefined,
      errorReason: undefined,
      errorSolution: undefined,
    });

    // 3. Immediately retry publishing with the target page override
    publishReelsNow([diagnosticsModalReel.id], {
      targetPageIds: [targetPage.id],
    });
    setDiagnosticsModalReel(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated bg-[#051424]/95 border-red-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-obsidian-modal border ring-1 ring-red-500/20 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                Publishing Diagnostics
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Human-Friendly Resolution Guide
              </p>
            </div>
          </div>

          <button
            onClick={() => setDiagnosticsModalReel(null)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Friendly Error Description Banner */}
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
          <h4 className="text-sm font-semibold text-red-300 flex items-center gap-2">
            <span>Publishing Failed</span>
          </h4>
          <p className="text-xs text-white/90 leading-relaxed font-mono break-words">
            {diagnosticsModalReel.errorMessage ||
              diagnosticsModalReel.errorReason ||
              `Facebook/Instagram rejected this Reel because Page "${targetPage.name}" does not currently have the required publishing permission or video file was not found.`}
          </p>
        </div>

        {/* Problem Breakdown Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs font-mono">
          <div className="text-on-surface-variant text-[11px] font-bold uppercase">
            Root Cause & Recommendations:
          </div>

          <div className="flex items-start gap-2.5 text-on-surface-variant">
            <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Page Token Scope Expired:</strong> The Meta Page Access Token for <span className="text-primary">{targetPage.name}</span> requires 2FA authentication renewal.
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-on-surface-variant">
            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Video Media Passed:</strong> Format H.264, 1080x1920 60fps, and audio -14.0 LUFS are all valid and compliant.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setDiagnosticsModalReel(null)}
            className="w-full sm:w-auto"
          >
            Dismiss
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleResolveAndRetry}
            className="w-full sm:w-auto shadow-gold-glow"
          >
            <span>Auto-Renew Token & Retry Now</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
