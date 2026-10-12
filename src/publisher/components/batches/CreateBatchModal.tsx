import React, { useState } from 'react';
import { X, Layers, Sparkles, Calendar, Send } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const CreateBatchModal: React.FC = () => {
  const { 
    createBatchModalOpen, 
    setCreateBatchModalOpen, 
    createNewBatch, 
    selectedReelIds, 
    reels, 
    pages 
  } = useStudio();

  const [batchName, setBatchName] = useState('Surah Al-Kahf & Friday Collections');
  const [selectedPages, setSelectedPages] = useState<string[]>([pages[0]?.id || 'fb-page-1']);
  const [publishMode, setPublishMode] = useState<'immediate' | 'schedule'>('immediate');

  if (!createBatchModalOpen) return null;

  const targetReelIds = selectedReelIds.length > 0 ? selectedReelIds : reels.map((r) => r.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;
    createNewBatch(batchName, selectedPages, targetReelIds);
  };

  const togglePage = (id: string) => {
    setSelectedPages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg tracking-wide">
                Create New Batch
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Grouping {targetReelIds.length} Reels for organized publishing
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreateBatchModalOpen(false)}
            className="p-2 text-on-surface-variant hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Batch Name */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 font-mono uppercase">
              Batch Name
            </label>
            <input
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. August Collection — Surah Al-Baqarah"
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          {/* Facebook Pages Selector */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2 font-mono uppercase">
              Target Facebook Pages
            </label>
            <div className="space-y-2">
              {pages.map((page) => {
                const isSelected = selectedPages.includes(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => togglePage(page.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-gold-glow'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={page.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-white/15"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{page.name}</div>
                        <div className="text-[10px] font-mono text-on-surface-variant">
                          {(page.followersCount / 1000).toFixed(0)}K Followers
                        </div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publishing Mode */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2 font-mono uppercase">
              Publishing Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPublishMode('immediate')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  publishMode === 'immediate'
                    ? 'bg-primary/15 border-primary shadow-gold-glow text-white'
                    : 'bg-black/40 border-white/10 text-on-surface-variant hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Send className="w-3.5 h-3.5 text-primary" />
                  <span>Publish Immediately</span>
                </div>
                <p className="text-[11px] opacity-75">
                  Queue and dispatch continuously with rate pacing.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode('schedule')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  publishMode === 'schedule'
                    ? 'bg-primary/15 border-primary shadow-gold-glow text-white'
                    : 'bg-black/40 border-white/10 text-on-surface-variant hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Schedule for Later</span>
                </div>
                <p className="text-[11px] opacity-75">
                  Spread releases across days & time slots.
                </p>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setCreateBatchModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
              className="shadow-gold-glow"
            >
              Create & Launch Batch ({targetReelIds.length} Reels)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
