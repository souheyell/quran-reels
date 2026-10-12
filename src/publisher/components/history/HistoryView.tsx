import React, { useState } from 'react';
import { 
  Search, 
  AlertTriangle, 
  ExternalLink,
  Film,
  Download
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Badge, Button } from '../shared';

export const HistoryView: React.FC = () => {
  const { reels, setDiagnosticsModalReel, openDrawer, pages } = useStudio();
  const [filter, setFilter] = useState<'ALL' | 'PUBLISHED' | 'FAILED' | 'SCHEDULED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const historyItems = reels.filter((r) => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.surahName.toLowerCase().includes(q) ||
        r.filename.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              AUDIT LOG
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Historical Publishing Activity
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Publishing History
          </h1>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={() => alert('Exporting history log to CSV')}
        >
          Export CSV Log
        </Button>
      </div>

      {/* Filter Bar & Search */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['ALL', 'PUBLISHED', 'FAILED', 'SCHEDULED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                filter === tab
                  ? 'bg-primary-container text-black font-bold shadow-gold-glow'
                  : 'bg-white/5 text-on-surface-variant hover:text-white border border-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search publishing audit log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/40 border border-white/10 focus:border-primary text-white text-xs rounded-lg pl-9 pr-3 py-2 w-64 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40 text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                <th className="py-3.5 px-5">Reel Title & File</th>
                <th className="py-3.5 px-4">Target Page</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-5 text-right">Diagnostics / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {historyItems.map((reel) => {
                const targetPage = pages.find((p) => reel.targetPageIds.includes(p.id)) || pages[0];
                return (
                  <tr key={reel.id} className="hover:bg-white/5 transition-colors">
                    {/* Reel */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => openDrawer(reel)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-black/60 shrink-0 cursor-pointer border border-white/10 hover:border-primary transition-colors"
                        >
                          {reel.bgImageUrl ? (
                            <img src={reel.bgImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-5 h-5 m-2.5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => openDrawer(reel)}
                            className="font-medium text-white hover:text-primary transition-colors text-left block truncate max-w-xs font-sans text-xs"
                          >
                            {reel.title}
                          </button>
                          <span className="text-[10px] text-on-surface-variant/70 block truncate">
                            {reel.filename}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Page */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-white">
                        <img src={targetPage.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        <span className="truncate max-w-[130px]">{targetPage.name}</span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {reel.batchName ? (
                        <span className="truncate max-w-[140px] block">{reel.batchName.split('—')[0]}</span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {reel.status === 'PUBLISHED' ? (
                        <Badge variant="published" dot>PUBLISHED</Badge>
                      ) : reel.status === 'FAILED' ? (
                        <Badge variant="failed" dot>FAILED</Badge>
                      ) : reel.status === 'SCHEDULED' ? (
                        reel.isUploadedToCloud ? (
                          <Badge variant="scheduled" dot className="bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold">
                            ☁️ CLOUD SCHEDULED
                          </Badge>
                        ) : (
                          <Badge variant="scheduled" dot>SCHEDULED</Badge>
                        )
                      ) : (
                        <Badge variant="ready" dot>{reel.status}</Badge>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-on-surface-variant text-[11px]">
                      {reel.publishedAt
                        ? new Date(reel.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : reel.scheduledTime
                        ? new Date(reel.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </td>

                    {/* Action / Diagnostics */}
                    <td className="py-3.5 px-5 text-right">
                      {reel.status === 'FAILED' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDiagnosticsModalReel(reel)}
                          className="text-[11px]"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          View Resolution
                        </Button>
                      ) : reel.status === 'PUBLISHED' ? (
                        <button
                          onClick={() => window.open('https://facebook.com', '_blank')}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline"
                        >
                          <span>View on Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDrawer(reel)}
                          className="text-on-surface-variant"
                        >
                          Inspect
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
