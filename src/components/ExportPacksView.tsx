import React, { useState, useEffect } from 'react'
import { 
  Package, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Search, 
  RefreshCw, 
  FolderOpen, 
  Film, 
  CheckCircle2, 
  ArrowUpDown,
  HardDrive,
  Sparkles
} from 'lucide-react'
import { useStudio } from '../publisher/context/StudioContext'
import { openExportFolder } from '../lib/exportDestination'

interface ExportPackItem {
  name: string
  folderPath: string
  absolutePath: string
  isZip: boolean
  videoCount: number
  hasManifest: boolean
  videos?: string[]
  updatedAt?: string | null
  updatedFormatted?: string | null
  updatedFullDate?: string | null
  timeAgo?: string | null
  mtimeMs?: number
  batchDate?: string | null
  batchFullDate?: string | null
}

interface ExportPacksViewProps {
  onSwitchToQueue: () => void
  onSwitchToBulkGenerator: () => void
}

export const ExportPacksView: React.FC<ExportPacksViewProps> = ({
  onSwitchToQueue,
  onSwitchToBulkGenerator,
}) => {
  const { 
    addReels, 
    showToast, 
    setLocalExplorerModalOpen 
  } = useStudio()

  const [packs, setPacks] = useState<ExportPackItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'count'>('updated')
  const [ingestingFolder, setIngestingFolder] = useState<string | null>(null)
  const [revealingFolder, setRevealingFolder] = useState<string | null>(null)

  const fetchPacks = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/export-packs')
      if (res.ok) {
        const data = await res.json()
        if (data?.packs) {
          setPacks(data.packs)
        }
      }
    } catch {
      showToast('Failed to scan export packs from disk', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPacks()
  }, [])

  // Ingest selected pack directly into publisher queue
  const handleIngestPack = async (pack: ExportPackItem) => {
    setIngestingFolder(pack.folderPath)
    try {
      const ingestRes = await fetch('/api/fs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: pack.folderPath }),
      })

      if (!ingestRes.ok) {
        throw new Error('Failed to ingest pack from disk')
      }

      const ingestData = await ingestRes.json()
      const rawItems: Array<{ 
        name: string
        streamUrl: string
        isVideo: boolean
        isZip: boolean 
        sizeMb: number
      }> = ingestData.items || []
      const manifestData = ingestData.manifestData || null

      const videoItems = rawItems.filter((i) => i.isVideo)
      if (videoItems.length === 0) {
        showToast('No video files found in this pack folder', 'warning')
        return
      }

      const newReels = videoItems.map((item, index) => {
        const cleanName = item.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')

        // 1. Match item in manifestData (Array or Dictionary)
        let entry: any = null
        if (manifestData) {
          if (Array.isArray(manifestData)) {
            entry = manifestData.find((m) => 
              m.filename === item.name ||
              (m.filename && m.filename.replace(/\.[^/.]+$/, '') === item.name.replace(/\.[^/.]+$/, '')) ||
              m.id === index ||
              m.index === index + 1
            )
          } else if (typeof manifestData === 'object') {
            entry = manifestData[item.name] || manifestData[item.name.replace(/\.[^/.]+$/, '')]
          }
        }

        const rawTitle = entry?.title || entry?.name || entry?.surah_title || ''
        const rawDesc = entry?.description || entry?.caption || entry?.text || entry?.captionEnglish || entry?.captionArabic || entry?.desc || ''

        // Read manifest for title and description or vice-versa
        const reelTitle = rawTitle || (rawDesc ? rawDesc.split('\n')[0].trim().slice(0, 60) : cleanName)
        const reelDesc = rawDesc || (rawTitle ? rawTitle : `📖 Quran Reel Recitation · ${cleanName}\n\n#Quran #IslamicReels #Tilawah`)
        const surahNum = entry?.surah || entry?.surahNumber ? Number(entry.surah || entry.surahNumber) : 1
        const surahName = entry?.surahName || pack.name.replace(/^quran_pack_/, '').split('_')[0] || 'Quran Reel'
        const ayahRange = entry?.ayah || entry?.ayahRange ? String(entry.ayah || entry.ayahRange) : `Part ${index + 1}`
        const reciterName = entry?.reciter || entry?.reciterName || 'Mishary Rashid Alafasy'
        const hashtags = Array.isArray(entry?.hashtags) ? entry.hashtags : ['#Quran', '#IslamicReels', '#Tilawah', '#Sunnah']

        return {
          id: `pack-${pack.name}-${index}-${Date.now()}`,
          filename: item.name,
          title: reelTitle,
          surahNumber: surahNum,
          surahName,
          ayahRange,
          reciterName,
          durationSeconds: 30,
          resolution: '1080x1920',
          fps: 60,
          codec: 'H.264 (MP4)',
          fileSizeMb: item.sizeMb || 15,
          status: 'READY' as const,
          uploadProgress: 0,
          captionArabic: entry?.captionArabic || '',
          captionEnglish: reelDesc,
          description: reelDesc,
          hashtags,
          targetPageIds: [],
          targetPlatforms: ['facebook' as const, 'instagram' as const],
          videoUrl: item.streamUrl,
          createdAt: new Date().toISOString(),
          audioLufs: -14,
          audioNormalized: true,
          videoValid: true,
          resolutionValid: true,
          durationValid: true,
        }
      })

      addReels(newReels)
      showToast(
        manifestData 
          ? `🎉 Ingested ${newReels.length} reels with manifest titles & descriptions from ${pack.name}!`
          : `🎉 Ingested ${newReels.length} reels from ${pack.name}! Ready in queue.`,
        'success'
      )
      onSwitchToQueue()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ingestion failed'
      showToast(`Error: ${msg}`, 'error')
    } finally {
      setIngestingFolder(null)
    }
  }

  // Reveal folder in OS file manager (macOS Finder / Windows Explorer)
  const handleRevealInFinder = async (folderPath: string) => {
    setRevealingFolder(folderPath)
    try {
      await openExportFolder(folderPath)
      showToast('🖥️ Opened folder in file manager', 'info')
    } catch {
      showToast('Could not open folder in file manager', 'error')
    } finally {
      setRevealingFolder(null)
    }
  }

  // Filter & sort
  const filteredPacks = packs
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') {
        return (b.mtimeMs || 0) - (a.mtimeMs || 0)
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'count') {
        return b.videoCount - a.videoCount
      }
      return 0
    })

  const totalVideosAcrossPacks = packs.reduce((acc, p) => acc + (p.videoCount || 0), 0)

  return (
    <div className="export-packs-view-container h-full max-h-full overflow-y-auto p-5 md:p-8 space-y-6 font-sans">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-emerald-compact font-mono text-[10px] uppercase font-bold tracking-wider">
              DISK EXPORT LIBRARY
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              ./exports/ Directory Storage
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-primary" />
            <span>Export Packs &amp; Batches</span>
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant font-mono mt-1">
            All generated Quran reels packs saved on local disk, showing exact update dates, reel counts, and 1-click ingestion into the publisher queue.
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => handleRevealInFinder('exports')}
            disabled={revealingFolder === 'exports'}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            title="Open exports directory in macOS Finder"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Open in Finder</span>
          </button>

          <button
            type="button"
            onClick={() => setLocalExplorerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-gold-glow"
            title="Open Deep File Explorer Modal"
          >
            <HardDrive className="w-4 h-4" />
            <span>Deep Explorer</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToBulkGenerator}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            title="Create a new Bulk Quran Reels batch"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Generate New Batch</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Total Packs</span>
            <span className="text-xl font-bold text-white">{packs.length}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Total MP4 Reels</span>
            <span className="text-xl font-bold text-white">{totalVideosAcrossPacks}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Latest Update</span>
            <span className="text-xs font-bold text-white truncate block">
              {packs[0]?.updatedFormatted?.split('·')[0] || 'Today'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">With Manifest</span>
            <span className="text-xl font-bold text-white">
              {packs.filter((p) => p.hasManifest).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Sorting Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packs by Surah name, date, or folder..."
            className="w-full bg-black/50 border border-white/15 focus:border-primary text-white rounded-xl pl-9 pr-4 py-2 text-xs font-mono outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'count')}
            className="bg-black/60 border border-white/15 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="updated">🕒 Last Updated (Newest First)</option>
            <option value="name">🔤 Alphabetical (A-Z)</option>
            <option value="count">🎬 Reel Count (Highest First)</option>
          </select>

          <button
            type="button"
            onClick={fetchPacks}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all cursor-pointer"
            title="Refresh list from disk"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Packs Grid */}
      {filteredPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPacks.map((pack) => {
            const isIngesting = ingestingFolder === pack.folderPath
            const isRevealing = revealingFolder === pack.folderPath

            return (
              <div
                key={pack.folderPath}
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#051424] to-emerald-950/20 border border-amber-500/30 hover:border-amber-400 hover:shadow-xl transition-all flex flex-col justify-between gap-4 group"
              >
                {/* Card Top: Icon, Folder Name, Badges */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-sm block truncate group-hover:text-amber-300 transition-colors" title={pack.name}>
                          {pack.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span>🎬</span> {pack.videoCount} Reels
                          </span>
                          {pack.hasManifest && (
                            <span className="text-slate-400 text-[10px]">
                              • Manifest.json
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date & Timestamp Information Shelf */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px]">
                    {/* Last Modified */}
                    <div className="flex items-center justify-between gap-2" title={pack.updatedFullDate || pack.updatedAt || ''}>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">Updated:</span>
                        <span className="text-white font-medium">{pack.updatedFormatted || 'Recently'}</span>
                      </div>
                      {pack.timeAgo && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {pack.timeAgo}
                        </span>
                      )}
                    </div>

                    {/* Batch Date from folder name */}
                    {pack.batchDate && (
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-amber-400/80">Batch:</span>
                        <span className="text-amber-200">{pack.batchDate}</span>
                        {pack.batchFullDate && (
                          <span className="text-[10px] text-amber-400/60 font-sans">({pack.batchFullDate})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sample Video Preview List */}
                  {pack.videos && pack.videos.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                        Files in Pack ({pack.videos.length})
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 font-mono text-[10px]">
                        {pack.videos.slice(0, 3).map((v, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-300 truncate py-0.5 px-2 rounded bg-white/5">
                            <Film className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate">{v}</span>
                          </div>
                        ))}
                        {pack.videos.length > 3 && (
                          <span className="text-[9px] text-on-surface-variant pl-2 block">
                            +{pack.videos.length - 3} more MP4 video files
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRevealInFinder(pack.folderPath)}
                    disabled={isRevealing}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                    title="Reveal folder in Finder"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Finder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleIngestPack(pack)}
                    disabled={isIngesting}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-gold-glow transition-all cursor-pointer"
                    title="Ingest all reels from this pack into Publisher Queue"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Ingesting...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀 Ingest into Queue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-black/30 border border-white/10">
          <Package className="w-12 h-12 text-white/20 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Export Packs Found</h3>
            <p className="text-xs text-on-surface-variant font-mono max-w-md mx-auto">
              No exported packs matching your search were found in <code>./exports</code>. Generate a new batch using the Bulk Generator!
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToBulkGenerator}
            className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs inline-flex items-center gap-2 shadow-gold-glow cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Bulk Generator</span>
          </button>
        </div>
      )}
    </div>
  )
}
export default ExportPacksView
