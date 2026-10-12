import React from 'react';
import { LayoutDashboard, Layers, UploadCloud, History, Settings } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { DashboardView } from './DashboardView';
import { BatchProgressScreen } from '../batches/BatchProgressScreen';
import { HistoryView } from '../history/HistoryView';
import { SettingsView } from '../settings/SettingsView';
import { BulkDropzone } from '../upload/BulkDropzone';
import type { ActiveNavTab } from '../../types';

interface OverviewStudioProps {
  activeSubTab?: ActiveNavTab;
  onSelectSubTab?: (tab: ActiveNavTab) => void;
}

export const OverviewStudio: React.FC<OverviewStudioProps> = ({
  activeSubTab,
  onSelectSubTab,
}) => {
  const { activeTab, setActiveTab, batches } = useStudio();
  const currentTab = activeSubTab || activeTab;

  const setTab = (tab: ActiveNavTab) => {
    if (onSelectSubTab) onSelectSubTab(tab);
    else setActiveTab(tab);
  };

  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE').length;

  const subNavItems = [
    {
      id: 'dashboard' as ActiveNavTab,
      label: 'Metrics & Stream',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'batches' as ActiveNavTab,
      label: 'Batch Studio',
      icon: <Layers className="w-4 h-4" />,
      badge: activeBatchesCount > 0 ? `${activeBatchesCount} live` : undefined,
    },
    {
      id: 'upload' as ActiveNavTab,
      label: 'Bulk Ingestion',
      icon: <UploadCloud className="w-4 h-4" />,
    },
    {
      id: 'history' as ActiveNavTab,
      label: 'Publishing History',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'settings' as ActiveNavTab,
      label: 'Studio Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Overview Sub-Navigation Pills ────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#051424]/90 border border-white/10 rounded-xl backdrop-blur-xl w-fit max-w-full overflow-x-auto scrollbar-none shadow-lg">
        {subNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-semibold'
                  : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-on-surface-variant/80'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sub-view Container ───────────────────────────────────── */}
      <div className="overview-subview-content">
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'batches' && <BatchProgressScreen />}
        {currentTab === 'upload' && (
          <div className="space-y-6 pb-16">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  INGESTION PIPELINE
                </span>
                <span className="text-xs font-mono text-on-surface-variant">
                  Bulk Quran Reel Ingestion
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
                Import Quran Reels for Bulk Publishing
              </h1>
              <p className="text-sm text-on-surface-variant font-mono mt-1">
                Drop finished vertical MP4 videos, select local export folders, or import metadata packs.
              </p>
            </div>
            <BulkDropzone />
          </div>
        )}
        {currentTab === 'history' && <HistoryView />}
        {currentTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};
