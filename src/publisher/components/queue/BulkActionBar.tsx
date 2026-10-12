import React, { useState } from 'react';
import { 
  FileEdit, 
  Share2, 
  Calendar, 
  Sparkles, 
  Trash2, 
  X, 
  Send, 
  ChevronUp
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';

export const BulkActionBar: React.FC = () => {
  const { 
    selectedReelIds, 
    clearSelection, 
    deleteReels, 
    autoFixSelected, 
    publishReelsNow, 
    setBulkCaptionModalOpen, 
    setBulkScheduleModalOpen, 
    assignPagesToReels, 
    pages 
  } = useStudio();

  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);

  if (selectedReelIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="glass-panel-elevated bg-[#051424]/95 border-primary/40 rounded-2xl p-3 md:p-4 shadow-obsidian-modal flex flex-wrap items-center justify-between gap-3 max-w-4xl w-full pointer-events-auto border ring-1 ring-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Selection Count Pill */}
        <div className="flex items-center gap-3 pr-3 border-r border-white/10">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-black font-mono font-bold flex items-center justify-center text-sm shadow-gold-glow">
            {selectedReelIds.length}
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-white tracking-wide">
              {selectedReelIds.length} Reels Selected
            </div>
            <button
              onClick={clearSelection}
              className="text-[11px] font-mono text-on-surface-variant hover:text-white underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Deselect All
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Captions */}
          <Button
            variant="secondary"
            size="sm"
            icon={<FileEdit className="w-3.5 h-3.5 text-primary" />}
            onClick={() => setBulkCaptionModalOpen(true)}
          >
            Edit Captions
          </Button>

          {/* Page Assign Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              icon={<Share2 className="w-3.5 h-3.5 text-secondary" />}
              onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
            >
              <span>Assign Pages</span>
              <ChevronUp className={`w-3.5 h-3.5 transition-transform ${pageDropdownOpen ? '' : 'rotate-180'}`} />
            </Button>

            {pageDropdownOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-64 glass-panel-elevated p-3 rounded-xl border border-white/15 shadow-2xl space-y-1.5 z-50">
                <div className="text-[10px] font-mono text-on-surface-variant uppercase px-1 pb-1 border-b border-white/10">
                  Select Facebook Pages
                </div>
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      assignPagesToReels(selectedReelIds, [page.id]);
                      setPageDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-white hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    <img src={page.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    <span className="truncate">{page.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    assignPagesToReels(selectedReelIds, pages.map((p) => p.id));
                    setPageDropdownOpen(false);
                  }}
                  className="w-full p-2 rounded-lg text-center text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/30 mt-1"
                >
                  All Connected Pages
                </button>
              </div>
            )}
          </div>

          {/* Schedule */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-3.5 h-3.5 text-sky-400" />}
            onClick={() => setBulkScheduleModalOpen(true)}
          >
            Schedule
          </Button>

          {/* Auto-Normalize Audio */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-primary-container" />}
            onClick={autoFixSelected}
          >
            Auto-Fix Audio
          </Button>

          {/* Publish Now */}
          <Button
            variant="primary"
            size="sm"
            icon={<Send className="w-3.5 h-3.5" />}
            onClick={() => publishReelsNow(selectedReelIds)}
            className="shadow-gold-glow"
          >
            Publish Now
          </Button>

          {/* Delete */}
          <button
            onClick={() => deleteReels(selectedReelIds)}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
