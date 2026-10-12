import React, { useState, useMemo } from 'react';
import { 
  Film, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Plus, 
  CheckSquare, 
  Square, 
  UploadCloud,
  Calendar,
  Trash2
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ReelCard } from './ReelCard';
import { BulkActionBar } from './BulkActionBar';
import { Button } from '../shared';

export const ReelQueueGrid: React.FC = () => {
  const { 
    reels, 
    selectedReelIds, 
    selectAllReels, 
    setActiveTab, 
    setCreateBatchModalOpen,
    setBulkScheduleModalOpen,
    clearQueue
  } = useStudio();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'status' | 'surah'>('date');
  const [showClearMenu, setShowClearMenu] = useState(false);

  // Filter calculations
  const counts = useMemo(() => {
    return {
      ALL: reels.length,
      READY: reels.filter((r) => r.status === 'READY').length,
      VALIDATING: reels.filter((r) => r.status === 'VALIDATING').length,
      UPLOADING: reels.filter((r) => r.status === 'UPLOADING').length,
      SCHEDULED: reels.filter((r) => r.status === 'SCHEDULED').length,
      PUBLISHED: reels.filter((r) => r.status === 'PUBLISHED').length,
      FAILED: reels.filter((r) => r.status === 'FAILED').length,
    };
  }, [reels]);

  const filteredReels = useMemo(() => {
    return reels
      .filter((r) => {
        if (activeFilter !== 'ALL' && r.status !== activeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.surahName.toLowerCase().includes(q) ||
            r.reciterName.toLowerCase().includes(q) ||
            r.filename.toLowerCase().includes(q) ||
            r.captionArabic.includes(q) ||
            r.captionEnglish.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'duration') return b.durationSeconds - a.durationSeconds;
        if (sortBy === 'surah') return a.surahNumber - b.surahNumber;
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reels, activeFilter, searchQuery, sortBy]);

  const allSelected = reels.length > 0 && selectedReelIds.length === reels.length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
              Reel Queue & Library
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-primary font-mono text-xs font-semibold">
              {reels.length} Reels Total
            </span>
          </div>
          <p className="text-sm text-on-surface-variant font-mono mt-1">
            Manage, bulk-edit captions, assign Facebook Pages, and monitor individual reel readiness.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setCreateBatchModalOpen(true)}
            disabled={reels.length === 0}
          >
            Create New Batch
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-4 h-4 text-sky-400" />}
            onClick={() => setBulkScheduleModalOpen(true)}
            disabled={reels.length === 0}
          >
            Upload in Schedules
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab('upload')}
            className="shadow-gold-glow"
          >
            Add More Reels
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Shelf */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Reels', count: counts.ALL },
            { id: 'READY', label: 'Ready', count: counts.READY, color: 'text-secondary' },
            { id: 'UPLOADING', label: 'Uploading', count: counts.UPLOADING, color: 'text-primary' },
            { id: 'SCHEDULED', label: 'Scheduled', count: counts.SCHEDULED, color: 'text-sky-400' },
            { id: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED, color: 'text-emerald-400' },
            { id: 'FAILED', label: 'Failed', count: counts.FAILED, color: 'text-red-400' },
            { id: 'VALIDATING', label: 'Validating', count: counts.VALIDATING, color: 'text-purple-300' },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary-container text-black font-bold shadow-gold-glow'
                    : 'bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-on-surface'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort & Select All Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
          {/* Select All Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllReels}
              className="flex items-center gap-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary-container" />
              ) : (
                <Square className="w-4 h-4 text-on-surface-variant" />
              )}
              <span>{allSelected ? 'Deselect All' : 'Select All Reels'}</span>
            </button>

            {selectedReelIds.length > 0 && (
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {selectedReelIds.length} selected
              </span>
            )}
          </div>

          {/* Search & Sort Dropdowns */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search Surah, Reciter, or Filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/40 border border-white/10 focus:border-primary text-white text-xs rounded-lg pl-9 pr-3 py-2 w-64 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/40 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="date">Sort by: Date Added</option>
                <option value="surah">Sort by: Surah Order</option>
                <option value="duration">Sort by: Duration</option>
                <option value="status">Sort by: Status</option>
              </select>
            </div>

            {/* Clear / Purge Queue Menu */}
            {reels.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClearMenu(!showClearMenu)}
                  className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                  title="Purge old generations or clear queue"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
                {showClearMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#051424] border border-white/15 rounded-xl shadow-obsidian-modal p-2 z-50 space-y-1 text-xs font-mono animate-in fade-in duration-150">
                    <div className="text-[10px] text-on-surface-variant px-2 py-1 uppercase tracking-wider font-bold">
                      Queue Clean-Up
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearQueue('ready');
                        setShowClearMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>🧹 Clear Unscheduled</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">{counts.READY + counts.FAILED}</span>
                    </button>
                    {counts.PUBLISHED > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearQueue('published');
                          setShowClearMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-emerald-400 transition-colors flex items-center justify-between"
                      >
                        <span>✅ Clear Published</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">{counts.PUBLISHED}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Clear all reels from queue, including scheduled ones?')) {
                          clearQueue('all');
                          setShowClearMenu(false);
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors border-t border-white/10 flex items-center justify-between pt-2"
                    >
                      <span>⚠️ Clear All</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20">{reels.length}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Reels */}
      {filteredReels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 max-w-lg mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-primary">
            <Film className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="font-serif font-bold text-xl text-white">
            {searchQuery || activeFilter !== 'ALL'
              ? 'No matching Reels found'
              : 'Your Reel library is empty'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            {searchQuery || activeFilter !== 'ALL'
              ? 'Try clearing your search query or selecting a different status filter above.'
              : 'Upload your first batch of Quranic 9:16 vertical videos to get started with bulk publishing.'}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              icon={<UploadCloud className="w-4 h-4" />}
              onClick={() => setActiveTab('upload')}
            >
              Upload Reels
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />
    </div>
  );
};
