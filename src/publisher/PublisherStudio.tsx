import React from 'react';
import { useStudio } from './context/StudioContext';
import { TopNavBar } from './components/layout/TopNavBar';
import { SideNavBar } from './components/layout/SideNavBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ReelQueueGrid } from './components/queue/ReelQueueGrid';
import { ReelDetailDrawer } from './components/queue/ReelDetailDrawer';
import { BulkDropzone } from './components/upload/BulkDropzone';
import { BatchProgressScreen } from './components/batches/BatchProgressScreen';
import { CreateBatchModal } from './components/batches/CreateBatchModal';
import { FacebookPagesView } from './components/pages/FacebookPagesView';
import { ConnectPageModal } from './components/pages/ConnectPageModal';
import { FetchPagesModal } from './components/pages/FetchPagesModal';
import { SchedulingCalendar } from './components/scheduling/SchedulingCalendar';
import { HistoryView } from './components/history/HistoryView';
import { FailureDiagnosticsModal } from './components/history/FailureDiagnosticsModal';
import { BulkCaptionModal } from './components/modals/BulkCaptionModal';
import { BulkScheduleModal } from './components/modals/BulkScheduleModal';
import { PublishReelModal } from './components/modals/PublishReelModal';
import { LocalFileExplorerModal } from './components/modals/LocalFileExplorerModal';
import { SettingsView } from './components/settings/SettingsView';
import { ExportPacksView } from '../components/ExportPacksView';
import { Toast } from './components/shared/Toast';
import './index.css';

interface PublisherStudioProps {
  onSwitchToCreator?: () => void;
}

const StudioContent: React.FC<PublisherStudioProps> = ({ onSwitchToCreator }) => {
  const { activeTab, setActiveTab } = useStudio();

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#030B0E] text-[#d3e6ed] flex flex-col font-sans selection:bg-[#10B981]/30 selection:text-[#34d399]">
      {/* Top Bar with Creator Studio switcher */}
      <TopNavBar onSwitchToCreator={onSwitchToCreator} />

      <div className="flex flex-1 pt-14 h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden">
        {/* Left Side Navigation */}
        <SideNavBar />

        {/* Main Work Area */}
        <main className="flex-1 ml-[260px] p-6 md:p-8 h-full max-h-full overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'upload' && (
            <div className="space-y-6 pb-16">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    INGESTION STUDIO
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    High-Throughput Video Pipeline
                  </span>
                </div>
                <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
                  Bulk Quran Reel Ingestion
                </h1>
                <p className="text-sm text-on-surface-variant font-mono mt-1">
                  Drag and drop vertical 9:16 Quran videos, select folders, or import exported packs directly.
                </p>
              </div>
              <BulkDropzone />
            </div>
          )}
          {activeTab === 'queue' && <ReelQueueGrid />}
          {activeTab === 'batches' && <BatchProgressScreen />}
          {activeTab === 'schedule' && <SchedulingCalendar />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'pages' && <FacebookPagesView />}
          {activeTab === 'exports' && (
            <ExportPacksView
              onSwitchToQueue={() => setActiveTab('queue')}
              onSwitchToBulkGenerator={() => onSwitchToCreator?.()}
            />
          )}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Drawers & Modals */}
      <ReelDetailDrawer />
      <FailureDiagnosticsModal />
      <CreateBatchModal />
      <ConnectPageModal />
      <FetchPagesModal />
      <PublishReelModal />
      <BulkCaptionModal />
      <BulkScheduleModal />
      <LocalFileExplorerModal />
      <Toast />
    </div>
  );
};

export const PublisherStudio: React.FC<PublisherStudioProps> = (props) => {
  return <StudioContent {...props} />;
};

export default PublisherStudio;
