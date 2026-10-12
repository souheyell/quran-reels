import React, { useState } from 'react';
import { X, FileEdit, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const BulkCaptionModal: React.FC = () => {
  const { 
    bulkCaptionModalOpen, 
    setBulkCaptionModalOpen, 
    applyBulkCaptions, 
    selectedReelIds 
  } = useStudio();

  const [template, setTemplate] = useState(
    'Heartfelt Quran recitation from Surah {surah} (Ayat {ayah}) by {reciter}. May it bring peace and blessings to your day. #Quran #Tilawah #Peace'
  );
  const [hashtagsStr, setHashtagsStr] = useState('#Quran, #Tilawah, #IslamicReels, #DailyAyah, #Peace');

  if (!bulkCaptionModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = hashtagsStr
      .split(/[, ]+/)
      .map((t) => t.trim())
      .filter((t) => t.startsWith('#') || t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    applyBulkCaptions(template, tags);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-black font-bold flex items-center justify-center shadow-gold-glow">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-base">
                Bulk Caption & Hashtag Editor
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Applying to {selectedReelIds.length} selected Reels
              </p>
            </div>
          </div>

          <button
            onClick={() => setBulkCaptionModalOpen(false)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dynamic variables helper */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
            <div className="text-on-surface-variant text-[11px] mb-1 font-bold">
              Available Dynamic Variables:
            </div>
            <div className="flex flex-wrap gap-2 text-primary">
              <code className="bg-white/10 px-2 py-0.5 rounded cursor-pointer" onClick={() => setTemplate((t) => t + ' {surah}')}>
                {'{surah}'}
              </code>
              <code className="bg-white/10 px-2 py-0.5 rounded cursor-pointer" onClick={() => setTemplate((t) => t + ' {ayah}')}>
                {'{ayah}'}
              </code>
              <code className="bg-white/10 px-2 py-0.5 rounded cursor-pointer" onClick={() => setTemplate((t) => t + ' {reciter}')}>
                {'{reciter}'}
              </code>
            </div>
          </div>

          {/* Template Input */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 font-mono uppercase">
              Caption Template
            </label>
            <textarea
              rows={4}
              required
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl p-3.5 text-sm outline-none transition-colors"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 font-mono uppercase">
              Common Hashtags (comma separated)
            </label>
            <input
              type="text"
              value={hashtagsStr}
              onChange={(e) => setHashtagsStr(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setBulkCaptionModalOpen(false)}
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
              Apply to {selectedReelIds.length} Reels
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
