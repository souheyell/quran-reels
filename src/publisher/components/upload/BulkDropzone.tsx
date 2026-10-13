import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileVideo, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  FolderDown,
  FileText,
  Calendar,
  Send,
  Check,
  Cloud,
  FolderSearch,
  Clock,
  Package
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { extractVideoSpecs, analyzeAudioLoudness } from '../../services/audioLoudnessAnalyzer';
import { linkWipTracksAndCaptions, type WipLinkedItem, type WipLinkingResult } from '../../services/wipLinker';
import { checkCloudBridgeStatus, type CloudBridgeInfo } from '../../services/metaGraphApi';
import JSZip from 'jszip';

/**
 * Traverses dropped files and subdirectories recursively using standard webkit directory reader.
 */
async function getAllFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];
  const items = dataTransfer.items;

  if (items && items.length > 0 && 'webkitGetAsEntry' in items[0]) {
    const traverseEntry = async (entry: any): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        try {
          const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
          files.push(file);
        } catch (_) {}
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readEntries = async (): Promise<any[]> => {
          return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        };
        let batch: any[];
        do {
          batch = await readEntries();
          for (const child of batch) {
            await traverseEntry(child);
          }
        } while (batch.length > 0);
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(traverseEntry(entry));
      }
    }
    await Promise.all(promises);
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    files.push(...Array.from(dataTransfer.files));
  }

  return files;
}

/**
 * Extracts .zip archives into File objects in-memory if present.
 */
async function expandZipFilesIfNeeded(files: File[]): Promise<File[]> {
  const result: File[] = [];
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      try {
        const zip = await JSZip.loadAsync(file);
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) continue;
          const blob = await zipEntry.async('blob');
          const filename = relativePath.split('/').pop() || relativePath;
          let mime = 'text/plain';
          if (filename.match(/\.(mp4|mov|m4v|webm)$/i)) mime = 'video/mp4';
          else if (filename.match(/\.json$/i)) mime = 'application/json';
          const extracted = new File([blob], filename, { type: mime, lastModified: Date.now() });
          result.push(extracted);
        }
      } catch (err) {
        console.error('Failed to unpack zip file:', err);
        result.push(file);
      }
    } else {
      result.push(file);
    }
  }
  return result;
}

export const BulkDropzone: React.FC<{ onUploadComplete?: () => void }> = ({ onUploadComplete }) => {
  const { 
    addReels, 
    generateSampleBatch, 
    setActiveTab, 
    pages, 
    showToast,
    setBulkScheduleModalOpen,
    setSelectedReelIds,
    setLocalExplorerModalOpen
  } = useStudio();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [cloudBridge, setCloudBridge] = useState<CloudBridgeInfo | null>(null);
  const [exportPacks, setExportPacks] = useState<Array<{
    name: string;
    folderPath: string;
    videoCount: number;
    hasManifest: boolean;
    updatedAt?: string | null;
    updatedFormatted?: string | null;
    updatedFullDate?: string | null;
    timeAgo?: string | null;
    batchDate?: string | null;
  }>>([]);

  useEffect(() => {
    checkCloudBridgeStatus().then((info) => {
      if (info.isCloudBridge) setCloudBridge(info);
    });

    fetch('/api/export-packs')
      .then((r) => r.json())
      .then((d) => {
        if (d?.packs) setExportPacks(d.packs);
      })
      .catch(() => {});
  }, []);

  const loadFromCloudBridge = async () => {
    setIsProcessing(true);
    setProcessingStatus('Connecting to Cloud Bridge shared_wip/ directory...');
    try {
      const res = await fetch('http://localhost:3001/api/wip-files');
      if (!res.ok) throw new Error('Cloud Bridge unavailable');
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        showToast('No reels found in cloud shared_wip/ directory. Generate or drop reels there first!', 'warning');
        setIsProcessing(false);
        setProcessingStatus('');
        return;
      }

      setProcessingStatus(`Streaming ${data.items.length} files from cloud disk over 1 Gbps link...`);
      const cloudFiles: File[] = [];
      for (const item of data.items) {
        try {
          const fileRes = await fetch(item.streamUrl);
          const blob = await fileRes.blob();
          let mime = 'text/plain';
          if (item.isVideo) mime = 'video/mp4';
          else if (item.name.endsWith('.json')) mime = 'application/json';
          cloudFiles.push(new File([blob], item.name, { type: mime }));
        } catch (_) {}
      }

      await processFiles(cloudFiles);
    } catch (err: any) {
      showToast(err?.message || 'Failed to read from Cloud Bridge', 'error');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Ingestion summary state
  const [lastWipResult, setLastWipResult] = useState<{
    summary: WipLinkingResult;
    createdReelIds: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer) {
      setIsProcessing(true);
      setProcessingStatus('Scanning dropped directory tree & files...');
      const files = await getAllFilesFromDataTransfer(e.dataTransfer);
      await processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) {
      showToast('No files found in selection', 'warning');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Unpacking archives & inspecting tracks...');
    const unpackedFiles = await expandZipFilesIfNeeded(files);

    setProcessingStatus('Linking video tracks to captions and metadata...');

    // 1. Run Automated WIP Track-Caption Linker
    const wipResult = await linkWipTracksAndCaptions(unpackedFiles);
    const { linkedItems, totalVideos, matchedCaptionsCount } = wipResult;

    if (totalVideos === 0) {
      showToast('No video files (MP4, MOV, etc.) detected in the selected files or WIP folder', 'warning');
      setIsProcessing(false);
      setProcessingStatus('');
      return;
    }

    setProcessingStatus(`Analyzing video specs & audio LUFS (0 / ${totalVideos})...`);
    let analyzedCount = 0;

    const defaultPageIds = pages.map((p) => p.id);
    const createdIds: string[] = [];

    // 2. Process each linked track
    const parsedReels = await Promise.all(
      linkedItems.map(async (item: WipLinkedItem, index: number) => {
        const file = item.videoFile;
        const sizeMb = Number((file.size / (1024 * 1024)).toFixed(1)) || 45.0;

        // Extract real video specs & LUFS
        const [videoSpecs, audioSpecs] = await Promise.all([
          extractVideoSpecs(file),
          analyzeAudioLoudness(file),
        ]);

        const reelId = `reel-wip-${Date.now()}-${index}`;
        createdIds.push(reelId);

        analyzedCount++;
        setProcessingStatus(`Analyzing video specs & audio LUFS (${analyzedCount} / ${totalVideos})...`);

        return {
          id: reelId,
          filename: file.name,
          title: item.title,
          description: item.description, // Manual description from caption file!
          surahNumber: item.surahNumber,
          surahName: item.surahName,
          ayahRange: item.ayahRange,
          reciterName: item.reciterName,
          durationSeconds: Math.round(videoSpecs.durationSeconds) || 45,
          resolution: videoSpecs.aspectRatio || '1080x1920',
          fps: 60,
          codec: 'H.264 (MP4)',
          fileSizeMb: sizeMb,
          status: 'READY' as const,
          uploadProgress: 0,
          captionArabic: '',
          captionEnglish: item.description,
          hashtags: item.hashtags || ['#Quran', '#IslamicReels'],
          targetPageIds: defaultPageIds.length > 0 ? defaultPageIds : ['fb-page-ajr'],
          targetPlatforms: ['facebook', 'instagram', 'tiktok'] as ('facebook' | 'instagram' | 'tiktok')[],
          audioLufs: audioSpecs.lufs,
          audioNormalized: audioSpecs.isCompliant,
          videoValid: videoSpecs.isVertical916,
          resolutionValid: videoSpecs.isVertical916,
          durationValid: videoSpecs.isDurationValid,
          thumbnailUrl: videoSpecs.thumbnailUrl,
          bgImageUrl: videoSpecs.thumbnailUrl || '',
          videoUrl: videoSpecs.videoUrl,
          videoFile: file,
        };
      })
    );

    // Add to studio library
    addReels(parsedReels);
    setIsProcessing(false);
    setProcessingStatus('');

    // Save summary for UI display
    setLastWipResult({
      summary: wipResult,
      createdReelIds: createdIds,
    });

    showToast(
      `✅ Ingested ${totalVideos} tracks! (${matchedCaptionsCount} captions linked automatically)`,
      'success'
    );

    if (onUploadComplete) onUploadComplete();
  };

  const handleOpenScheduleWizard = () => {
    if (lastWipResult?.createdReelIds && lastWipResult.createdReelIds.length > 0) {
      setSelectedReelIds(lastWipResult.createdReelIds);
    }
    setBulkScheduleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* WIP Ingestion Result Banner (if just ingested) */}
      {lastWipResult && (
        <div className="glass-panel p-6 rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/10 via-[#051424] to-primary/5 space-y-4 animate-in fade-in duration-300 shadow-gold-glow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-container text-black font-bold flex items-center justify-center shadow-gold-glow">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-white text-lg">
                    WIP Folder Ingestion & Linking Complete!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    {lastWipResult.summary.totalVideos} Tracks Ready
                  </span>
                </div>
                <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                  Successfully linked {lastWipResult.summary.matchedCaptionsCount} of {lastWipResult.summary.totalVideos} videos with their respective caption files.
                </p>
              </div>
            </div>

            {/* Next Step Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                icon={<Send className="w-4 h-4" />}
                onClick={() => setActiveTab('queue')}
                className="font-mono text-xs"
              >
                Review in Queue
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<Calendar className="w-4 h-4" />}
                onClick={handleOpenScheduleWizard}
                className="shadow-gold-glow font-mono text-xs font-bold animate-pulse hover:animate-none"
              >
                📅 Upload in Schedules (Auto-Schedule All)
              </Button>
            </div>
          </div>

          {/* Linked Tracks Snippets */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[11px] font-mono text-on-surface-variant font-semibold uppercase block mb-2">
              Sample Linked Pairs:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {lastWipResult.summary.linkedItems.slice(0, 6).map((item, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold truncate max-w-[170px]" title={item.videoFile.name}>
                      📹 {item.videoFile.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                      {item.matchedBy}
                    </span>
                  </div>
                  <p className="text-on-surface-variant truncate" title={item.description || '(No manual caption)'}>
                    📝 {item.description ? item.description : '<Manual description empty>'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-10 md:p-14 text-center transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01] shadow-gold-glow-lg'
            : 'border-primary/40 hover:border-primary/70 bg-surface-container-high/30 hover:bg-surface-container-high/40'
        }`}
      >
        {/* Subtle Arabesque Watermark */}
        <div className="absolute inset-0 bg-arabesque opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Regular Files input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="video/*,.mp4,.mov,.m4v,.webm,.txt,.json,.caption,.srt,.zip"
          className="hidden"
        />

        {/* Folder Picker input (webkitdirectory) */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderSelect}
          multiple
          {...({ webkitdirectory: '', directory: '' } as any)}
          className="hidden"
        />

        <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
          {/* Glowing Upload Orb */}
          <div 
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#B45309]/30 border border-[#F59E0B]/50 flex items-center justify-center mb-6 shadow-gold-glow group cursor-pointer hover:scale-105 transition-transform"
            onClick={() => folderInputRef.current?.click()}
          >
            <UploadCloud className="w-10 h-10 text-primary animate-bounce" />
          </div>

          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide mb-3">
            Drop your ZIP Pack, WIP Folder, or Quran Reels here
          </h2>

          <p className="text-sm md:text-base text-on-surface-variant mb-6 leading-relaxed">
            Drop your <strong className="text-white">generated .ZIP archive or WIP folder</strong> (containing video tracks and captions). The studio will automatically unpack the zip in-memory, link each video to its caption, extract LUFS audio levels, and prepare them for scheduled publishing.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<FolderSearch className="w-5 h-5 text-black" />}
              onClick={() => setLocalExplorerModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-black font-bold shadow-gold-glow border border-amber-300/80 transform hover:scale-105 transition-all"
            >
              📂 Browse Local / Server Files
            </Button>

            {cloudBridge && (
              <Button
                variant="primary"
                size="lg"
                icon={<Cloud className="w-5 h-5 text-sky-300" />}
                onClick={loadFromCloudBridge}
                loading={isProcessing}
                className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/30 font-bold border border-sky-400/50"
              >
                ☁️ Load from Cloud shared_wip/ (1 Gbps)
              </Button>
            )}

            <Button
              variant="primary"
              size="lg"
              icon={<FolderDown className="w-5 h-5" />}
              onClick={() => folderInputRef.current?.click()}
              loading={isProcessing}
              className="shadow-gold-glow font-bold"
            >
              {processingStatus ? `${processingStatus}` : 'Select WIP Folder (Tracks + Captions)'}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              icon={<FileVideo className="w-5 h-5" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Select .ZIP Pack or Video Files
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs font-mono text-on-surface-variant/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-secondary" /> Auto Track-Caption Matching
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" /> Supports .txt, .json, .caption & manifest
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Web Audio LUFS Analysis
            </span>
          </div>
        </div>
      </div>

      {/* Discovered Export Folders on Disk */}
      {exportPacks.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h4 className="font-serif font-bold text-white text-sm">
                Discovered Export Folders &amp; Batches ({exportPacks.length} found in <code>./exports</code>)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setLocalExplorerModalOpen(true)}
              className="text-xs text-primary hover:text-white font-mono flex items-center gap-1 transition-colors"
            >
              <span>Explore All in Modal</span>
              <span>➔</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {exportPacks.slice(0, 6).map((pack) => (
              <div
                key={pack.folderPath}
                onClick={() => setLocalExplorerModalOpen(true)}
                className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/40 hover:bg-black/60 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white text-xs block truncate group-hover:text-amber-300 transition-colors" title={pack.name}>
                      {pack.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      🎬 {pack.videoCount} Reels {pack.hasManifest ? '+ Manifest' : ''}
                    </span>
                  </div>
                  {pack.batchDate && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      📅 {pack.batchDate}
                    </span>
                  )}
                </div>

                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1 text-[10px] text-slate-300 font-mono">
                  <div className="flex items-center gap-1" title={pack.updatedFullDate || pack.updatedAt || ''}>
                    <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-semibold">Updated:</span>
                    <span className="text-white font-medium">{pack.updatedFormatted || 'Recently'}</span>
                  </div>
                  {pack.timeAgo && (
                    <span className="text-emerald-300 font-bold text-[9px]">
                      {pack.timeAgo}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instant Sample Generator for Testing */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary-container" />
            <h4 className="font-serif font-bold text-white text-base">
              Generate Sample Quran Reels Collection
            </h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Want to test bulk operations before dropping your video library? Generate high-resolution Quran Reels with Surahs (Al-Kahf, Maryam, Ar-Rahman) assigned to <strong className="text-white">Noor Al-Quran - نُور القُرآن</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              generateSampleBatch(5);
              setActiveTab('queue');
            }}
          >
            + 5 Reels
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              generateSampleBatch(15);
              setActiveTab('queue');
            }}
          >
            + 15 Reels
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Layers className="w-4 h-4" />}
            onClick={() => {
              generateSampleBatch(30);
              setActiveTab('queue');
            }}
            className="shadow-gold-glow"
          >
            + 30 Bulk Batch
          </Button>
        </div>
      </div>
    </div>
  );
};
