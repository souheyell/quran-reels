import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Sparkles, 
  CloudUpload, 
  Layers, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { formatLocalDate, formatLocalTime, formatDisplayDate } from '../../utils/dateUtils';
import { 
  generatePrayerSequence, 
  type PrayerPacingType, 
  PRAYER_LOCATIONS,
  getPrayerSlot
} from '../../services/prayerTimes';

export const BulkScheduleModal: React.FC = () => {
  const { 
    bulkScheduleModalOpen, 
    setBulkScheduleModalOpen, 
    scheduleReelsBulk, 
    selectedReelIds,
    reels,
    pages,
    showToast,
    targetScheduleDate,
    setTargetScheduleDate
  } = useStudio();

  // Dynamically compute safe future default start time (now + 30 mins) strictly in local timezone
  const getDefaultFutureDateTime = () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const dateStr = formatLocalDate(future);
    const timeStr = formatLocalTime(future);
    return { dateStr, timeStr };
  };

  const initialDateTime = getDefaultFutureDateTime();
  const [startDate, setStartDate] = useState(initialDateTime.dateStr);
  const [startTime, setStartTime] = useState(initialDateTime.timeStr);
  const [intervalMinutes, setIntervalMinutes] = useState(180); // Default 3 hours
  const [pacingMode, setPacingMode] = useState<'prayer' | 'interval'>('prayer');
  const [prayerPacingType, setPrayerPacingType] = useState<PrayerPacingType>('all_prayers');
  const [preUploadToCloud, setPreUploadToCloud] = useState(true);
  const [targetPageId, setTargetPageId] = useState(pages[0]?.id || '');

  const [selectedPlatforms, setSelectedPlatforms] = useState<('facebook' | 'instagram' | 'tiktok')[]>([
    'facebook',
    'instagram',
    'tiktok',
  ]);

  // Batch isolation state to prevent scheduling old generations unintentionally
  const [scopeMode, setScopeMode] = useState<'latest' | 'selected' | 'all'>('latest');
  const [targetReelIds, setTargetReelIds] = useState<string[]>([]);
  const [showReelList, setShowReelList] = useState(false);

  // Sync default targetPageId when pages are loaded
  useEffect(() => {
    if (!targetPageId && pages.length > 0) {
      setTargetPageId(pages[0].id);
    }
  }, [pages, targetPageId]);

  // Sync targetScheduleDate if modal was opened from clicking a specific calendar date cell
  useEffect(() => {
    if (targetScheduleDate) {
      setStartDate(targetScheduleDate);
    }
  }, [targetScheduleDate]);

  // Detect latest batch name from reels
  const latestBatchName = useMemo(() => {
    return reels.find((r) => !!r.batchName)?.batchName || null;
  }, [reels]);

  // Initialize or re-sync targetReelIds whenever modal opens
  useEffect(() => {
    if (!bulkScheduleModalOpen) return;

    if (selectedReelIds.length > 0) {
      setScopeMode('selected');
      setTargetReelIds(selectedReelIds);
    } else if (latestBatchName) {
      // Isolate strictly to the latest batch's READY reels (exclude old generations!)
      setScopeMode('latest');
      const latestIds = reels
        .filter((r) => r.batchName === latestBatchName && (r.status === 'READY' || r.status === 'FAILED'))
        .map((r) => r.id);
      setTargetReelIds(latestIds.length > 0 ? latestIds : reels.filter((r) => r.status === 'READY').slice(0, 5).map((r) => r.id));
    } else {
      setScopeMode('all');
      setTargetReelIds(reels.filter((r) => r.status === 'READY').slice(0, 10).map((r) => r.id));
    }
  }, [bulkScheduleModalOpen, selectedReelIds, latestBatchName, reels]);

  // Compute live preview of the first few scheduled moments
  const previewMoments = useMemo(() => {
    if (targetReelIds.length === 0) return [];
    const base = new Date(`${startDate}T${startTime}:00`);
    const validBase = isNaN(base.getTime()) ? new Date() : base;

    if (pacingMode === 'prayer') {
      return generatePrayerSequence(
        Math.min(targetReelIds.length, 5),
        validBase,
        prayerPacingType,
        PRAYER_LOCATIONS[0]
      );
    } else {
      const moments: Date[] = [];
      let cur = new Date(validBase);
      for (let i = 0; i < Math.min(targetReelIds.length, 5); i++) {
        moments.push(new Date(cur));
        cur = new Date(cur.getTime() + intervalMinutes * 60000);
      }
      return moments;
    }
  }, [targetReelIds.length, startDate, startTime, pacingMode, prayerPacingType, intervalMinutes]);

  if (!bulkScheduleModalOpen) return null;

  const togglePlatform = (plat: 'facebook' | 'instagram' | 'tiktok') => {
    setSelectedPlatforms((prev) => {
      let next: ('facebook' | 'instagram' | 'tiktok')[];
      if (prev.includes(plat)) {
        if (prev.length === 1) return prev;
        next = prev.filter((p) => p !== plat);
      } else {
        next = [...prev, plat];
      }
      // If switching to Instagram only, auto-select a page with linked Instagram
      if (next.includes('instagram') && !next.includes('facebook')) {
        const currentPage = pages.find((p) => p.id === targetPageId);
        if (!currentPage?.instagramBusinessAccount) {
          const pageWithIg = pages.find((p) => !!p.instagramBusinessAccount);
          if (pageWithIg) setTargetPageId(pageWithIg.id);
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetReelIds.length === 0) {
      showToast('Please select at least 1 reel to schedule', 'warning');
      return;
    }

    const chosen = pages.find((p) => p.id === targetPageId) || pages[0];
    if (selectedPlatforms.includes('instagram') && !chosen?.instagramBusinessAccount) {
      if (selectedPlatforms.length === 1) {
        showToast(
          `Cannot schedule for Instagram: "${chosen?.name}" has no linked Instagram account. Please select "أَجْر - Ajr" (@ajr4_all) or "Boumardessna" (@boumardessna).`,
          'error'
        );
        return;
      }
    }
    scheduleReelsBulk(
      targetReelIds, 
      startDate, 
      startTime, 
      intervalMinutes, 
      selectedPlatforms, 
      preUploadToCloud, 
      targetPageId,
      pacingMode === 'prayer' ? prayerPacingType : undefined
    );
  };

  const handleClose = () => {
    setBulkScheduleModalOpen(false);
    setTargetScheduleDate(null);
  };

  const latestBatchCount = latestBatchName 
    ? reels.filter((r) => r.batchName === latestBatchName && (r.status === 'READY' || r.status === 'FAILED')).length
    : 0;

  const readyTotalCount = reels.filter((r) => r.status === 'READY' || r.status === 'FAILED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 font-bold flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                Upload in Schedules Wizard
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Auto-distribute {targetReelIds.length} Reels across calendar & social channels
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 font-mono text-xs">
          
          {/* Target Reels & Batch Isolation Selector */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-black/40 border border-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <label className="text-on-surface-variant uppercase font-bold text-[10px] tracking-wider">
                  Target Reels for this Schedule
                </label>
              </div>
              <span className="text-[11px] font-mono font-bold text-primary">
                {targetReelIds.length} Selected
              </span>
            </div>

            {/* Scope Filter Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
              {latestBatchName && (
                <button
                  type="button"
                  onClick={() => {
                    setScopeMode('latest');
                    const latestIds = reels
                      .filter((r) => r.batchName === latestBatchName && (r.status === 'READY' || r.status === 'FAILED'))
                      .map((r) => r.id);
                    setTargetReelIds(latestIds);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all text-center truncate ${
                    scopeMode === 'latest'
                      ? 'bg-primary text-black shadow-gold-glow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                  title={`Select only newest generation: ${latestBatchName}`}
                >
                  🎯 Latest Batch ({latestBatchCount})
                </button>
              )}

              {selectedReelIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setScopeMode('selected');
                    setTargetReelIds(selectedReelIds);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all text-center truncate ${
                    scopeMode === 'selected'
                      ? 'bg-primary text-black shadow-gold-glow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  ✨ Queue ({selectedReelIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setScopeMode('all');
                  const allReady = reels
                    .filter((r) => r.status === 'READY' || r.status === 'FAILED')
                    .map((r) => r.id);
                  setTargetReelIds(allReady);
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all text-center truncate ${
                  scopeMode === 'all'
                    ? 'bg-primary text-black shadow-gold-glow'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                📋 All Ready ({readyTotalCount})
              </button>
            </div>

            {/* Scope explanation & Checklist Toggle */}
            <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant pt-1">
              <span className="truncate max-w-[280px]">
                {scopeMode === 'latest'
                  ? `✨ Old generations excluded. Only latest batch (${targetReelIds.length}) targeted.`
                  : scopeMode === 'selected'
                  ? `✨ Only the ${targetReelIds.length} reels selected in queue targeted.`
                  : `⚠️ All ready reels across history (${targetReelIds.length}) targeted.`}
              </span>
              <button
                type="button"
                onClick={() => setShowReelList(!showReelList)}
                className="text-primary hover:underline flex items-center gap-1 font-semibold shrink-0"
              >
                {showReelList ? 'Hide List' : 'Inspect Reels'}
                {showReelList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Checklist */}
            {showReelList && (
              <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-48 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between pb-1 text-[10px] font-mono">
                  <span className="text-on-surface-variant">Toggle reel inclusion:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const selectable = reels.filter((r) => r.status === 'READY' || r.status === 'FAILED').map((r) => r.id);
                        setTargetReelIds(selectable);
                      }}
                      className="text-primary hover:underline"
                    >
                      Check All
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => setTargetReelIds([])}
                      className="text-red-400 hover:underline"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                {reels
                  .filter((r) => r.status === 'READY' || r.status === 'FAILED' || targetReelIds.includes(r.id))
                  .map((reel) => {
                    const isChecked = targetReelIds.includes(reel.id);
                    const isLatest = latestBatchName && reel.batchName === latestBatchName;
                    return (
                      <div
                        key={reel.id}
                        onClick={() => {
                          setTargetReelIds((prev) =>
                            prev.includes(reel.id)
                              ? prev.filter((id) => id !== reel.id)
                              : [...prev, reel.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border text-[11px] cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-primary/10 border-primary/40 text-white'
                            : 'bg-black/30 border-white/5 text-on-surface-variant opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-on-surface-variant shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-semibold text-white truncate block">{reel.title}</span>
                            <div className="text-[9px] font-mono text-on-surface-variant flex items-center gap-1.5">
                              <span>Surah {reel.surahName}</span>
                              {reel.batchName && (
                                <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                                  isLatest ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-on-surface-variant'
                                }`}>
                                  {isLatest ? 'LATEST BATCH' : 'OLD BATCH'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-on-surface-variant shrink-0 pl-2">
                          {reel.durationSeconds}s
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Multi-Platform Target Pickers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Publishing Networks (Click to enable/disable)
              </label>
              <span className="text-[10px] font-bold text-primary">
                {selectedPlatforms.length === 1 && selectedPlatforms.includes('instagram') 
                  ? '📸 Instagram Only' 
                  : selectedPlatforms.length === 1 && selectedPlatforms.includes('facebook')
                  ? 'f Facebook Page Only'
                  : 'Multi-Network'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Facebook */}
              <button
                type="button"
                onClick={() => togglePlatform('facebook')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('facebook')
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span className="text-blue-400 font-serif">f</span>
                  <span>Facebook</span>
                </div>
                <span className="text-[10px] text-blue-300/80">Page Reels</span>
              </button>

              {/* Instagram */}
              <button
                type="button"
                onClick={() => togglePlatform('instagram')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('instagram')
                    ? 'bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-orange-600/20 border-pink-500 text-white shadow-lg shadow-pink-500/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span className="text-pink-400">📸</span>
                  <span>Instagram</span>
                </div>
                <span className="text-[10px] text-pink-300/80">Reels</span>
              </button>

              {/* TikTok */}
              <button
                type="button"
                onClick={() => togglePlatform('tiktok')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('tiktok')
                    ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg shadow-cyan-400/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span className="text-cyan-400">🎵</span>
                  <span>TikTok</span>
                </div>
                <span className="text-[10px] text-cyan-300/80">Creator Hub</span>
              </button>
            </div>

            {selectedPlatforms.includes('instagram') && !selectedPlatforms.includes('facebook') && (
              <p className="text-[11px] text-pink-300 font-mono flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 p-2 rounded-xl">
                <span>✨ Instagram-Only Scheduling:</span>
                <span>Will auto-dispatch drops exclusively to Instagram Reels via the active background scheduler.</span>
              </p>
            )}
          </div>

          {/* Destination Facebook Page & Connected Instagram */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Destination Page & Accounts ({pages.length} Connected)
              </label>
              <span className="text-[10px] text-primary/80">
                Auto-dispatches to this Page
              </span>
            </div>
            <select
              value={targetPageId}
              onChange={(e) => setTargetPageId(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-3.5 py-2.5 outline-none font-sans text-xs transition-colors"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#051424] text-white">
                  {p.name} ({p.category || 'Facebook Page'}) {p.instagramBusinessAccount ? `• IG: @${p.instagramBusinessAccount.username}` : ''}
                </option>
              ))}
            </select>

            {/* Account Insights Badge */}
            {(() => {
              const activePage = pages.find((p) => p.id === targetPageId) || pages[0];
              if (!activePage) return null;
              const hasIg = !!activePage.instagramBusinessAccount;
              return (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    ID: {activePage.pageNumericId || activePage.id}
                  </span>
                  {hasIg ? (
                    <span className="text-pink-300 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>📸 IG:</span>
                      <strong>@{activePage.instagramBusinessAccount?.username}</strong>
                    </span>
                  ) : selectedPlatforms.includes('instagram') ? (
                    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      ⚠️ No linked Instagram account on this page. Choose Page 1 (أَجْر) or Page 2 (Boumardessna).
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
              />
            </div>
          </div>

          {/* Pacing Strategy Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Pacing Engine
              </label>
              <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setPacingMode('prayer')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    pacingMode === 'prayer'
                      ? 'bg-primary text-black shadow-gold-glow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  🕌 Prayer Times
                </button>
                <button
                  type="button"
                  onClick={() => setPacingMode('interval')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    pacingMode === 'interval'
                      ? 'bg-primary text-black shadow-gold-glow'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  ⏱️ Fixed Interval
                </button>
              </div>
            </div>

            {pacingMode === 'prayer' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrayerPacingType('all_prayers')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    prayerPacingType === 'all_prayers'
                      ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block text-primary">🕌 All 5 Prayers</span>
                  <span className="text-[10px] opacity-70">Fajr, Dhuhr, Asr, Maghrib, Isha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrayerPacingType('peak_three')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    prayerPacingType === 'peak_three'
                      ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block text-primary">🔥 Peak Engagement</span>
                  <span className="text-[10px] opacity-70">Fajr, Maghrib & Isha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrayerPacingType('daily_maghrib')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    prayerPacingType === 'daily_maghrib'
                      ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block text-primary">🌇 1 Drop / Day (Sunset)</span>
                  <span className="text-[10px] opacity-70">Daily at Maghrib prayer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrayerPacingType('fajr_isha')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    prayerPacingType === 'fajr_isha'
                      ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block text-primary">✨ Dawn & Night</span>
                  <span className="text-[10px] opacity-70">Fajr (Dawn) & Isha (Night)</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIntervalMinutes(30)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    intervalMinutes === 30
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">⚡ Every 30 Mins</span>
                  <span className="text-[10px] opacity-70">High-frequency burst</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntervalMinutes(60)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    intervalMinutes === 60
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">⏱️ Every 1 Hour</span>
                  <span className="text-[10px] opacity-70">Hourly publishing</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntervalMinutes(180)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    intervalMinutes === 180
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">⏳ Every 3 Hours</span>
                  <span className="text-[10px] opacity-70">Evenly spaced pacing</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntervalMinutes(1440)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    intervalMinutes === 1440
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">📅 1 Reel / 24 Hours</span>
                  <span className="text-[10px] opacity-70">Daily publishing</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Timeline Drop Preview */}
          {previewMoments.length > 0 && (
            <div className="p-3 rounded-2xl bg-black/60 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Upcoming Drop Sequence ({targetReelIds.length} Reels Total):
                </span>
                <span className="text-on-surface-variant text-[10px]">
                  {pacingMode === 'prayer' ? '🕌 Solar Aligned' : '⏱️ Fixed Intervals'}
                </span>
              </div>
              <div className="space-y-1">
                {previewMoments.map((m, idx) => {
                  const time = formatLocalTime(m);
                  const date = formatDisplayDate(formatLocalDate(m));
                  const prayer = getPrayerSlot(time);
                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between text-[10px] py-0.5 px-2 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-on-surface-variant font-mono">
                        Reel #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {date} at {time}
                        </span>
                        {prayer && prayer.name !== 'Custom' && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${prayer.color}`}>
                            {prayer.icon} {prayer.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cloud Pre-Scheduling Feature Card (Zero-Laptop Dependency) */}
          <div 
            onClick={() => {
              if (selectedPlatforms.includes('facebook')) {
                setPreUploadToCloud(!preUploadToCloud);
              }
            }}
            className={`p-3.5 rounded-2xl border transition-all ${
              !selectedPlatforms.includes('facebook')
                ? 'bg-black/25 border-pink-500/20 shadow-md cursor-default'
                : preUploadToCloud
                ? 'bg-gradient-to-r from-sky-500/15 via-primary/10 to-emerald-500/10 border-sky-400/50 shadow-lg shadow-sky-500/10 cursor-pointer'
                : 'bg-black/40 border-white/10 opacity-70 hover:opacity-90 cursor-pointer'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CloudUpload className={`w-4 h-4 shrink-0 ${selectedPlatforms.includes('facebook') ? 'text-sky-400' : 'text-pink-400'}`} />
                  <span className="font-bold text-white text-xs">
                    {selectedPlatforms.includes('facebook')
                      ? 'Meta Cloud Pre-Scheduling (Laptop Can Be Off)'
                      : 'In-App Active Scheduler (Instagram Reels)'}
                  </span>
                  {selectedPlatforms.includes('facebook') ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      RECOMMENDED FOR FB
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                      ACTIVE WORKER
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  {selectedPlatforms.includes('facebook') ? (
                    <>Streams video files directly to Meta data centers now with their future publish timestamps. Once upload finishes, <strong className="text-white">you can close or turn off your laptop completely</strong>—Meta will auto-publish at the exact prayer/schedule time.</>
                  ) : (
                    <>Meta Graph API does not support server-side scheduling for Instagram accounts. The studio's <strong className="text-white">active in-app scheduler worker</strong> will automatically dispatch each video directly to Instagram Reels when the designated drop time arrives.</>
                  )}
                </p>
              </div>

              {selectedPlatforms.includes('facebook') && (
                <input
                  type="checkbox"
                  checked={preUploadToCloud}
                  onChange={(e) => setPreUploadToCloud(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                />
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={preUploadToCloud && selectedPlatforms.includes('facebook') ? <CloudUpload className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              className="shadow-gold-glow font-bold"
            >
              {preUploadToCloud && selectedPlatforms.includes('facebook')
                ? `☁️ Pre-Upload to Meta Cloud (${targetReelIds.length} Reels)`
                : `Schedule ${selectedPlatforms.length === 1 && selectedPlatforms.includes('instagram') ? 'Instagram Drops' : 'Locally'} (${targetReelIds.length} Reels)`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
