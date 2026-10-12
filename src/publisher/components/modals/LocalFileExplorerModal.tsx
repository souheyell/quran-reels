import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderUp, 
  Film, 
  FileText, 
  FileArchive, 
  Search, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  HardDrive, 
  Compass,
  Package,
  Clock,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { extractVideoSpecs, analyzeAudioLoudness } from '../../services/audioLoudnessAnalyzer';
import { linkWipTracksAndCaptions, type WipLinkedItem } from '../../services/wipLinker';
import JSZip from 'jszip';

interface FsDirectory {
  name: string;
  path: string;
  absolutePath: string;
  itemCount: number;
  videoCount: number;
  hasManifest: boolean;
  isPackFolder: boolean;
  updatedAt?: string | null;
  updatedFormatted?: string | null;
  updatedFullDate?: string | null;
  timeAgo?: string | null;
  mtimeMs?: number;
  batchDate?: string | null;
  batchFullDate?: string | null;
}

interface FsFile {
  name: string;
  path: string;
  absolutePath: string;
  sizeBytes: number;
  sizeMb: number;
  ext: string;
  isVideo: boolean;
  isCaption: boolean;
  isZip: boolean;
  isManifest: boolean;
  streamUrl: string;
  updatedAt?: string | null;
  updatedFormatted?: string | null;
  updatedFullDate?: string | null;
  timeAgo?: string | null;
  mtimeMs?: number;
}

interface FsBookmark {
  label: string;
  path: string;
  icon: string;
}

interface FsListResponse {
  currentPath: string;
  absolutePath: string;
  parentPath: string;
  canGoUp: boolean;
  directories: FsDirectory[];
  files: FsFile[];
  bookmarks: FsBookmark[];
}

export const LocalFileExplorerModal: React.FC = () => {
  const { 
    localExplorerModalOpen, 
    setLocalExplorerModalOpen, 
    addReels, 
    pages, 
    showToast,
    setSelectedReelIds
  } = useStudio();

  const [currentPath, setCurrentPath] = useState('exports');
  const [pathInput, setPathInput] = useState('exports');
  const [data, setData] = useState<FsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'count'>('updated');

  // Selection
  const [selectedFolder, setSelectedFolder] = useState<FsDirectory | null>(null);
  const [selectedZip, setSelectedZip] = useState<FsFile | null>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState('');

  const fetchDirectory = async (targetPath: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedFolder(null);
    setSelectedZip(null);
    setSelectedFilePaths([]);

    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(targetPath)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to read path`);
      }
      const json: FsListResponse = await res.json();
      setData(json);
      setCurrentPath(json.currentPath);
      setPathInput(json.currentPath);
    } catch (err: any) {
      setError(err?.message || 'Error loading directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (localExplorerModalOpen) {
      fetchDirectory(currentPath);
    }
  }, [localExplorerModalOpen]);

  if (!localExplorerModalOpen) return null;

  const handleNavigate = (pathStr: string) => {
    fetchDirectory(pathStr);
  };

  const handleToggleFile = (file: FsFile) => {
    setSelectedFolder(null);
    setSelectedZip(null);
    setSelectedFilePaths((prev) =>
      prev.includes(file.path) ? prev.filter((p) => p !== file.path) : [...prev, file.path]
    );
  };

  const handleSelectZip = (zipFile: FsFile) => {
    setSelectedFolder(null);
    setSelectedFilePaths([]);
    setSelectedZip((prev) => (prev?.path === zipFile.path ? null : zipFile));
  };

  const handleSelectFolder = (dir: FsDirectory) => {
    setSelectedZip(null);
    setSelectedFilePaths([]);
    setSelectedFolder((prev) => (prev?.path === dir.path ? null : dir));
  };

  const handleIngest = async () => {
    setIsIngesting(true);
    setIngestStatus('Reading selected files from local filesystem...');

    try {
      let targetPath = currentPath;
      let filesToLoad: string[] = [];

      if (selectedZip) {
        targetPath = selectedZip.path;
      } else if (selectedFolder) {
        targetPath = selectedFolder.path;
      } else if (selectedFilePaths.length > 0) {
        filesToLoad = selectedFilePaths;
      }

      // 1. Ask backend to inspect/ingest selection
      const ingestRes = await fetch('/api/fs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath, selectedFiles: filesToLoad }),
      });

      if (!ingestRes.ok) {
        const errJson = await ingestRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server failed to collect selected files');
      }

      const ingestData = await ingestRes.json();
      const rawItems: Array<{ name: string; streamUrl: string; isVideo: boolean; isZip: boolean }> = ingestData.items || [];

      if (rawItems.length === 0) {
        showToast('No media or caption files found in selection', 'warning');
        setIsIngesting(false);
        return;
      }

      setIngestStatus(`Streaming ${rawItems.length} file(s) into memory...`);

      // 2. Stream files into File objects
      let downloadedFiles: File[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        setIngestStatus(`Streaming ${item.name} (${i + 1}/${rawItems.length})...`);
        const fileRes = await fetch(item.streamUrl);
        const blob = await fileRes.blob();

        let mime = 'text/plain';
        if (item.isVideo) mime = 'video/mp4';
        else if (item.name.endsWith('.json')) mime = 'application/json';
        else if (item.isZip) mime = 'application/zip';

        const fileObj = new File([blob], item.name, { type: mime, lastModified: Date.now() });

        // Unpack zip if file is an archive
        if (item.isZip || item.name.endsWith('.zip')) {
          try {
            const zip = await JSZip.loadAsync(fileObj);
            for (const [relPath, zipEntry] of Object.entries(zip.files)) {
              if (zipEntry.dir || relPath.startsWith('__MACOSX') || relPath.includes('/.')) continue;
              const zblob = await zipEntry.async('blob');
              const fname = relPath.split('/').pop() || relPath;
              let zmime = 'text/plain';
              if (fname.match(/\.(mp4|mov|m4v|webm)$/i)) zmime = 'video/mp4';
              else if (fname.endsWith('.json')) zmime = 'application/json';
              downloadedFiles.push(new File([zblob], fname, { type: zmime }));
            }
          } catch (_) {
            downloadedFiles.push(fileObj);
          }
        } else {
          downloadedFiles.push(fileObj);
        }
      }

      setIngestStatus('Auto-matching video tracks with captions & metadata...');

      // 3. Link tracks & captions
      const wipResult = await linkWipTracksAndCaptions(downloadedFiles);
      const { linkedItems, totalVideos, matchedCaptionsCount } = wipResult;

      if (totalVideos === 0) {
        showToast('No video files detected in selection', 'warning');
        setIsIngesting(false);
        return;
      }

      setIngestStatus(`Analyzing audio LUFS (0 / ${totalVideos})...`);
      let analyzedCount = 0;
      const defaultPageIds = pages.map((p) => p.id);
      const createdIds: string[] = [];

      // 4. Parse reels and extract LUFS
      const parsedReels = await Promise.all(
        linkedItems.map(async (item: WipLinkedItem, index: number) => {
          const file = item.videoFile;
          const sizeMb = Number((file.size / (1024 * 1024)).toFixed(1)) || 45.0;

          const [videoSpecs, audioSpecs] = await Promise.all([
            extractVideoSpecs(file),
            analyzeAudioLoudness(file),
          ]);

          const reelId = `reel-fs-${Date.now()}-${index}`;
          createdIds.push(reelId);

          analyzedCount++;
          setIngestStatus(`Analyzing audio LUFS (${analyzedCount} / ${totalVideos})...`);

          return {
            id: reelId,
            filename: file.name,
            title: item.title,
            description: item.description,
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

      addReels(parsedReels);
      setSelectedReelIds(createdIds);
      setLocalExplorerModalOpen(false);

      showToast(
        `✅ Successfully ingested ${totalVideos} tracks from disk! (${matchedCaptionsCount} captions linked)`,
        'success'
      );
    } catch (err: any) {
      showToast(`Ingestion error: ${err?.message || err}`, 'error');
    } finally {
      setIsIngesting(false);
      setIngestStatus('');
    }
  };

  const filteredDirectories = (data?.directories || [])
    .filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') {
        return (b.mtimeMs || 0) - (a.mtimeMs || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'count') {
        return (b.videoCount || b.itemCount) - (a.videoCount || a.itemCount);
      }
      return 0;
    });

  const filteredFiles = (data?.files || [])
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') {
        return (b.mtimeMs || 0) - (a.mtimeMs || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return (b.sizeBytes || 0) - (a.sizeBytes || 0);
    });

  const totalSelectedCount =
    (selectedFolder ? 1 : 0) + (selectedZip ? 1 : 0) + selectedFilePaths.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated bg-[#051424]/95 border-white/15 rounded-3xl p-5 md:p-7 max-w-4xl w-full shadow-obsidian-modal border ring-1 ring-primary/20 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/30 border border-primary/40 flex items-center justify-center text-primary shadow-gold-glow">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-white text-lg">
                  Local & Server File Explorer
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                  DIRECT DISK INGEST
                </span>
              </div>
              <p className="text-xs font-mono text-on-surface-variant">
                Select export pack directories, zip archives, or individual reels from disk
              </p>
            </div>
          </div>

          <button
            onClick={() => setLocalExplorerModalOpen(false)}
            className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks Chips */}
        {data?.bookmarks && data.bookmarks.length > 0 && (
          <div className="flex items-center gap-2 pt-3 pb-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-mono">
            <span className="text-[11px] text-on-surface-variant/70 shrink-0">Bookmarks:</span>
            {data.bookmarks.map((bm, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleNavigate(bm.path)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all ${
                  currentPath === bm.path
                    ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                    : 'bg-black/40 border-white/10 text-on-surface-variant hover:text-white hover:border-white/20'
                }`}
              >
                <span>{bm.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Path Navigation Bar */}
        <div className="pt-2 pb-3 shrink-0 flex items-center gap-2 font-mono text-xs">
          <Button
            variant="secondary"
            size="sm"
            disabled={!data?.canGoUp || isLoading}
            icon={<FolderUp className="w-4 h-4" />}
            onClick={() => data?.parentPath && handleNavigate(data.parentPath)}
            title="Go to parent directory"
          >
            Up
          </Button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNavigate(pathInput);
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="e.g. exports or ../quran-reels/exports"
              className="flex-1 bg-black/50 border border-white/15 focus:border-primary text-white rounded-xl px-3.5 py-2 text-xs outline-none font-mono transition-colors"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={isLoading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Go
            </Button>
          </form>

          {/* Search filter in current dir */}
          <div className="relative w-48 shrink-0 hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter current view..."
              className="w-full bg-black/50 border border-white/10 text-white rounded-xl pl-8 pr-3 py-2 text-xs outline-none font-mono"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono shrink-0 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => handleNavigate('exports')}
              className="underline text-white font-bold ml-2"
            >
              Reset to ./exports
            </button>
          </div>
        )}

        {/* Main Content Area (Scrollable Filesystem View) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-mono text-xs">
          
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-on-surface-variant text-sm">Reading directory from disk...</p>
            </div>
          ) : (
            <>
              {/* Directories & Packs Section */}
              {filteredDirectories.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-[11px] uppercase font-bold text-on-surface-variant flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Subdirectories &amp; Export Packs ({filteredDirectories.length})</span>
                      <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                        • {sortBy === 'updated' ? '🕒 Newest Updated' : sortBy === 'name' ? '🔤 Name A-Z' : '🎬 Reel Count'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 normal-case font-mono text-[10px]">
                      <span className="text-on-surface-variant/70 flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-primary" /> Sort:
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'count')}
                        className="bg-black/60 border border-white/20 text-white rounded-lg px-2 py-0.5 text-[10px] outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="updated">🕒 Last Updated (Newest)</option>
                        <option value="name">🔤 Alphabetical (A-Z)</option>
                        <option value="count">🎬 Reel Count (Highest)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredDirectories.map((dir) => {
                      const isSelected = selectedFolder?.path === dir.path;
                      return (
                        <div
                          key={dir.path}
                          onClick={() => handleSelectFolder(dir)}
                          onDoubleClick={() => handleNavigate(dir.path)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group ${
                            isSelected
                              ? 'bg-primary/20 border-primary shadow-gold-glow text-white ring-1 ring-primary/40'
                              : dir.isPackFolder
                              ? 'bg-gradient-to-br from-amber-500/10 via-[#051424] to-emerald-950/20 border-amber-500/30 hover:border-amber-400 text-on-surface-variant hover:text-white hover:shadow-lg'
                              : 'bg-black/40 border-white/10 hover:border-white/20 text-on-surface-variant hover:text-white'
                          }`}
                        >
                          {/* Top Row: Icon, Title, Counts & Open Button */}
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                dir.isPackFolder 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                  : 'bg-white/10 text-white border border-white/10'
                              }`}>
                                {dir.isPackFolder ? <Package className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs block truncate" title={dir.name}>
                                    {dir.name}
                                  </span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary text-black font-extrabold tracking-wide uppercase shrink-0">
                                      SELECTED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                                  {dir.isPackFolder ? (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                      <span>🎬</span> {dir.videoCount} Reels {dir.hasManifest ? '+ Manifest' : ''}
                                    </span>
                                  ) : (
                                    <span>{dir.itemCount} item(s)</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(dir.path);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 border border-white/15 transition-all shadow-sm"
                                title="Enter Directory"
                              >
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3 text-primary" />
                              </button>
                            </div>
                          </div>

                          {/* Blended Date & Timestamp Bar: Fully Shows Dates & Relative Time */}
                          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium" title={dir.updatedFullDate || dir.updatedAt || ''}>
                              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400/90 font-semibold">Updated:</span>
                              <span className="text-white font-mono font-medium">{dir.updatedFormatted || dir.updatedFullDate || 'Recently'}</span>
                              {dir.timeAgo && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold tracking-tight bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {dir.timeAgo}
                                </span>
                              )}
                            </div>

                            {dir.batchDate && (
                              <div 
                                className="flex items-center gap-1 text-amber-300 font-mono text-[9px] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 font-medium" 
                                title={`Batch Date Embedded in Pack Name: ${dir.batchFullDate || dir.batchDate}`}
                              >
                                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Batch: {dir.batchDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Section (ZIPs, Videos, Captions) */}
              {filteredFiles.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] uppercase font-bold text-on-surface-variant flex items-center justify-between">
                    <span>Files in Current Folder ({filteredFiles.length})</span>
                    <span className="text-[10px]">Select files or .ZIP archive below</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {filteredFiles.map((file) => {
                      const isZipSelected = selectedZip?.path === file.path;
                      const isFileChecked = selectedFilePaths.includes(file.path);
                      const isSelected = isZipSelected || isFileChecked;

                      return (
                        <div
                          key={file.path}
                          onClick={() => {
                            if (file.isZip) handleSelectZip(file);
                            else handleToggleFile(file);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-primary/20 border-primary shadow-gold-glow text-white'
                              : 'bg-black/40 border-white/10 hover:border-white/20 text-on-surface-variant hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                file.isVideo 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : file.isZip 
                                  ? 'bg-amber-500/20 text-amber-300' 
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {file.isVideo ? (
                                  <Film className="w-4 h-4" />
                                ) : file.isZip ? (
                                  <FileArchive className="w-4 h-4" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="font-bold text-white text-xs block truncate" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {file.sizeMb} MB
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                file.isVideo
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : file.isZip
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {file.ext.replace('.', '')}
                              </span>

                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-primary rounded cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* File Update Date Bar */}
                          {file.updatedFormatted && (
                            <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono" title={file.updatedFullDate || file.updatedAt || ''}>
                              <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400/80">Updated:</span>
                              <span className="text-white">{file.updatedFormatted}</span>
                              {file.timeAgo && (
                                <span className="text-emerald-300 font-semibold">({file.timeAgo})</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : filteredDirectories.length === 0 && !isLoading ? (
                <div className="py-16 text-center text-on-surface-variant space-y-2">
                  <Compass className="w-10 h-10 text-white/20 mx-auto" />
                  <p className="text-sm text-white">This folder is empty or has no supported media</p>
                  <p className="text-xs">Use the bookmarks above or navigate to <code>exports</code> or <code>../quran-reels/exports</code></p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer & Ingestion Action Bar */}
        <div className="pt-4 border-t border-white/10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
          <div className="text-on-surface-variant truncate">
            {selectedFolder ? (
              <span className="text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Selected Pack: <strong className="text-primary">{selectedFolder.name}</strong> ({selectedFolder.videoCount} reels{selectedFolder.updatedFormatted ? ` · Updated ${selectedFolder.updatedFormatted}` : ''})
              </span>
            ) : selectedZip ? (
              <span className="text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Selected Archive: <strong className="text-amber-300">{selectedZip.name}</strong> ({selectedZip.sizeMb} MB)
              </span>
            ) : selectedFilePaths.length > 0 ? (
              <span className="text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Selected Files: <strong className="text-primary">{selectedFilePaths.length}</strong> item(s)
              </span>
            ) : (
              <span>Select a pack folder, .ZIP file, or multiple videos above</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {totalSelectedCount > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedZip(null);
                  setSelectedFilePaths([]);
                }}
                disabled={isIngesting}
              >
                Clear
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={() => setLocalExplorerModalOpen(false)}
              disabled={isIngesting}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={handleIngest}
              disabled={totalSelectedCount === 0 || isIngesting}
              loading={isIngesting}
              className="shadow-gold-glow font-bold"
            >
              {isIngesting ? (ingestStatus || 'Ingesting...') : '🚀 Ingest Selected into Studio'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
