import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Film, 
  Layers, 
  Calendar, 
  History, 
  Share2, 
  Settings, 
  Zap,
  FolderDown
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import type { ActiveNavTab } from '../../types';

export const SideNavBar: React.FC = () => {
  const { activeTab, setActiveTab, reels, batches, pages } = useStudio();

  const queuedCount = reels.filter((r) => r.status === 'READY' || r.status === 'UPLOADING').length;
  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const scheduledCount = reels.filter((r) => r.status === 'SCHEDULED').length;
  const tokenWarning = pages.some((p) => p.status === 'TOKEN_WARNING');

  interface NavItem {
    id: ActiveNavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'REELS & MEDIA',
      items: [
        {
          id: 'upload',
          label: 'Bulk Upload & WIP',
          icon: <UploadCloud className="w-4 h-4" />,
        },
        {
          id: 'queue',
          label: 'Reel Queue',
          icon: <Film className="w-4 h-4" />,
          badge: queuedCount > 0 ? queuedCount : undefined,
          badgeColor: 'bg-primary-container text-black font-bold',
        },
        {
          id: 'batches',
          label: 'Batch Studio',
          icon: <Layers className="w-4 h-4" />,
          badge: activeBatchesCount > 0 ? `${activeBatchesCount} live` : undefined,
          badgeColor: 'bg-secondary/20 text-secondary border border-secondary/30',
        },
        {
          id: 'exports',
          label: 'Export Packs (Disk)',
          icon: <FolderDown className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'PUBLISHING',
      items: [
        {
          id: 'schedule',
          label: 'Schedule & Calendar',
          icon: <Calendar className="w-4 h-4" />,
          badge: scheduledCount > 0 ? scheduledCount : undefined,
          badgeColor: 'bg-sky-500/20 text-sky-400',
        },
        {
          id: 'history',
          label: 'Publishing History',
          icon: <History className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'META PLATFORM',
      items: [
        {
          id: 'pages',
          label: 'Facebook Pages',
          icon: <Share2 className="w-4 h-4" />,
          badge: tokenWarning ? '⚠ Alert' : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        },
        {
          id: 'settings',
          label: 'Studio Settings',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <aside className="w-[260px] h-[calc(100vh-52px)] fixed top-[52px] left-0 bg-[#051424]/90 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between p-4 z-30 overflow-y-auto">
      <div className="space-y-6">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1.5">
            <h3 className="text-[10px] font-mono font-semibold tracking-wider text-on-surface-variant/60 px-3 uppercase">
              {sec.title}
            </h3>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group select-none ${
                      isActive
                        ? 'bg-primary-container/15 text-primary border border-primary-container/40 shadow-gold-glow font-semibold'
                        : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`transition-colors ${
                          isActive ? 'text-primary' : 'text-on-surface-variant/80 group-hover:text-white'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${item.badgeColor || 'bg-white/10 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Studio Diagnostics Footer */}
      <div className="mt-6 p-3 rounded-xl glass-panel border border-white/10 bg-surface-container-high/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-primary">
            <Zap className="w-3.5 h-3.5 text-primary-container" />
            <span>STUDIO DISPATCH</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-secondary emerald-glow animate-pulse" />
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed mb-2">
          Pacing: <strong className="text-white">1 Reel / 3 mins</strong> to comply with Meta Graph rate limits.
        </p>
        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70 border-t border-white/10 pt-2">
          <span>Target Resolution</span>
          <span className="text-emerald-400 font-semibold">1080x1920 60fps</span>
        </div>
      </div>
    </aside>
  );
};
