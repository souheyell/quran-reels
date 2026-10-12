import React from 'react';
import { StatsGrid } from './StatsGrid';
import { ActiveBatchCard } from './ActiveBatchCard';
import { ActivityStream } from './ActivityStream';
import { BulkDropzone } from '../upload/BulkDropzone';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { Layers, Film } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveTab } = useStudio();

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Publishing Studio Dashboard
          </h1>
          <p className="text-sm text-on-surface-variant font-mono mt-1">
            Monitor queued reels, active batches, and real-time Meta Graph API publishing events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<Film className="w-4 h-4" />}
            onClick={() => setActiveTab('queue')}
          >
            Manage Queue
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Layers className="w-4 h-4" />}
            onClick={() => setActiveTab('batches')}
          >
            Batch Monitor
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <StatsGrid />

      {/* Primary Upload Dropzone */}
      <BulkDropzone />

      {/* Active Batch & Live Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ActiveBatchCard />
        </div>
        <div className="lg:col-span-5">
          <ActivityStream />
        </div>
      </div>
    </div>
  );
};
