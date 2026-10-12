import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Film
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const PublishReelModal: React.FC = () => {
  const { 
    publishModalReel, 
    setPublishModalReel, 
    updateReel, 
    publishReelsNow, 
    pages,
    showToast 
  } = useStudio();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetPageId, setTargetPageId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<('facebook' | 'instagram' | 'tiktok')[]>([
    'facebook',
    'instagram',
    'tiktok',
  ]);

  useEffect(() => {
    if (publishModalReel) {
      setTitle(publishModalReel.title || publishModalReel.filename.replace(/\.[^/.]+$/, ''));
      setDescription(
        publishModalReel.description || 
        publishModalReel.captionEnglish || 
        publishModalReel.captionArabic || 
        ''
      );
      setTargetPageId(
        publishModalReel.targetPageIds?.[0] || pages[0]?.id || ''
      );
      setSelectedPlatforms(
        publishModalReel.targetPlatforms && publishModalReel.targetPlatforms.length > 0
          ? publishModalReel.targetPlatforms
          : ['facebook', 'instagram', 'tiktok']
      );
    }
  }, [publishModalReel, pages]);

  if (!publishModalReel) return null;

  const togglePlatform = (plat: 'facebook' | 'instagram' | 'tiktok') => {
    setSelectedPlatforms((prev) => {
      let next: ('facebook' | 'instagram' | 'tiktok')[];
      if (prev.includes(plat)) {
        if (prev.length === 1) return prev; // Keep at least one platform selected
        next = prev.filter((p) => p !== plat);
      } else {
        next = [...prev, plat];
      }
      // If switching to Instagram only, auto-select a page with linked Instagram if current has none
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

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    const targetPage = pages.find((p) => p.id === targetPageId) || pages[0];

    // Validate Instagram capability if Instagram is selected
    if (selectedPlatforms.includes('instagram') && !targetPage?.instagramBusinessAccount) {
      if (selectedPlatforms.length === 1) {
        showToast(
          `Cannot publish to Instagram: "${targetPage?.name}" has no linked Instagram account. Please select "أَجْر - Ajr" (@ajr4_all) or "Boumardessna" (@boumardessna).`,
          'error'
        );
        return;
      }
    }

    const trimmedTitle = title.trim() || publishModalReel.filename.replace(/\.[^/.]+$/, '');
    const trimmedDesc = description.trim();

    // Persist manual title, description, and selected platforms into the reel
    updateReel(publishModalReel.id, {
      title: trimmedTitle,
      description: trimmedDesc,
      captionEnglish: trimmedDesc,
      targetPageIds: targetPageId ? [targetPageId] : publishModalReel.targetPageIds,
      targetPlatforms: selectedPlatforms,
    });

    const platLabels = selectedPlatforms.map((p) => p === 'facebook' ? 'Facebook' : p === 'instagram' ? 'Instagram' : 'TikTok').join(', ');
    showToast(`Dispatching "${trimmedTitle}" to ${platLabels} (${targetPage?.name || 'Social'})...`, 'info');

    // Trigger publish with explicit overrides to eliminate any React state race condition
    publishReelsNow([publishModalReel.id], {
      title: trimmedTitle,
      description: trimmedDesc,
      captionEnglish: trimmedDesc,
      targetPageIds: targetPageId ? [targetPageId] : publishModalReel.targetPageIds,
      targetPlatforms: selectedPlatforms,
    });

    // Close modal
    setPublishModalReel(null);
  };

  const displayThumb = publishModalReel.thumbnailUrl || publishModalReel.bgImageUrl;
  const activePage = pages.find((p) => p.id === targetPageId) || pages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-obsidian-modal border ring-1 ring-primary/20 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-black font-bold flex items-center justify-center shadow-gold-glow">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                Publish Reel across Social Platforms
              </h3>
              <p className="text-xs font-mono text-on-surface-variant">
                Select target networks, review title and set manual description
              </p>
            </div>
          </div>

          <button
            onClick={() => setPublishModalReel(null)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Card Snippet */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3.5">
          <div className="w-14 h-20 rounded-xl bg-black overflow-hidden relative shrink-0 border border-white/10 flex items-center justify-center">
            {displayThumb ? (
              <img
                src={displayThumb}
                alt={publishModalReel.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="w-6 h-6 text-primary/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-primary truncate font-bold">
              {publishModalReel.filename}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-on-surface-variant">
              <span>{publishModalReel.durationSeconds}s</span>
              <span>•</span>
              <span>{publishModalReel.resolution}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{publishModalReel.audioLufs} LUFS</span>
            </div>
          </div>
        </div>

        <form onSubmit={handlePublish} className="space-y-5 font-mono text-xs">
          
          {/* Target Platforms Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Target Networks (Click to enable/disable)
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
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('facebook')
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-blue-400 font-serif">f</span>
                  <span>Facebook</span>
                </div>
                <span className="text-[10px] text-blue-300/80">Page Reels</span>
              </button>

              {/* Instagram */}
              <button
                type="button"
                onClick={() => togglePlatform('instagram')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('instagram')
                    ? 'bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-orange-600/20 border-pink-500 text-white shadow-lg shadow-pink-500/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-pink-400">📸</span>
                  <span>Instagram</span>
                </div>
                <span className="text-[10px] text-pink-300/80">Reels</span>
              </button>

              {/* TikTok */}
              <button
                type="button"
                onClick={() => togglePlatform('tiktok')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedPlatforms.includes('tiktok')
                    ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg shadow-cyan-400/10'
                    : 'bg-black/40 border-white/10 text-on-surface-variant opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-cyan-400">🎵</span>
                  <span>TikTok</span>
                </div>
                <span className="text-[10px] text-cyan-300/80">Creator Hub</span>
              </button>
            </div>

            {selectedPlatforms.includes('instagram') && !selectedPlatforms.includes('facebook') && (
              <p className="text-[11px] text-pink-300 font-mono flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 p-2 rounded-xl">
                <span>✨ Instagram-Only Mode active:</span>
                <span>Will publish exclusively to <strong>@{activePage?.instagramBusinessAccount?.username || 'Instagram'}</strong> without posting to Facebook Page feed.</span>
              </p>
            )}
          </div>

          {/* Reel Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Reel Title (from video filename) <span className="text-primary">*</span>
              </label>
              <span className="text-[10px] text-on-surface-variant/60">
                Official Video Title
              </span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 01_Al-Baqarah_Ayah_255"
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-sans text-sm transition-colors"
            />
          </div>

          {/* Manual Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-on-surface-variant uppercase font-bold text-[10px]">
                Manual Description (No Boilerplate)
              </label>
              <span className="text-[10px] text-primary/80">
                Custom per video
              </span>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Type your manual caption or description for this Reel (leave empty to publish with title only)..."
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-sans text-sm transition-colors custom-scrollbar resize-none"
            />
          </div>

          {/* Target Meta / Facebook Page */}
          <div>
            <label className="block text-on-surface-variant mb-1.5 uppercase font-bold text-[10px]">
              Publishing Page & Connected Accounts
            </label>
            <select
              value={targetPageId}
              onChange={(e) => setTargetPageId(e.target.value)}
              className="w-full bg-black/40 border border-white/15 focus:border-primary text-white rounded-xl px-4 py-2.5 outline-none font-sans text-sm transition-colors"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#051424] text-white">
                  {p.name} ({p.category || 'Facebook Page'}) {p.instagramBusinessAccount ? `• IG: @${p.instagramBusinessAccount.username}` : ''}
                </option>
              ))}
            </select>

            {activePage?.instagramBusinessAccount && selectedPlatforms.includes('instagram') ? (
              <p className="text-[11px] text-pink-300 font-mono mt-1.5 flex items-center gap-1.5">
                <span>📸 Linked Instagram:</span>
                <strong>@{activePage.instagramBusinessAccount.username}</strong>
              </p>
            ) : selectedPlatforms.includes('instagram') ? (
              <p className="text-[11px] text-amber-400 font-mono mt-1.5 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                <span>⚠️ Selected Page has no linked Instagram account. Select <strong>أَجْر - Ajr</strong> (@ajr4_all) or <strong>Boumardessna</strong> (@boumardessna) from the dropdown to publish to Instagram.</span>
              </p>
            ) : null}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setPublishModalReel(null)}
              className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors"
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Send className="w-4 h-4" />}
              className="shadow-gold-glow font-bold"
            >
              Publish ({selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'Platform' : 'Platforms'})
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};
