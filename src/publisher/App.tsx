import React from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
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
import { Toast } from './components/shared/Toast';

const StudioContent: React.FC = () => {
  const { activeTab } = useStudio();

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#d4e4fa] flex flex-col font-sans selection:bg-[#F59E0B]/30 selection:text-[#ffc174]">
      {/* Top Bar */}
      <TopNavBar />

      <div className="flex flex-1 pt-16">
        {/* Left Side Navigation */}
        <SideNavBar />

        {/* Main Work Area */}
        <main className="flex-1 ml-[260px] p-6 md:p-8 min-h-[calc(100vh-64px)] max-w-7xl overflow-y-auto">
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
                  Drag and drop hundreds of vertical 9:16 Quran videos. Fast metadata extraction and audio normalization.
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

export function App() {
  return (
    <StudioProvider>
      <StudioContent />
    </StudioProvider>
  );
}

export default App;
