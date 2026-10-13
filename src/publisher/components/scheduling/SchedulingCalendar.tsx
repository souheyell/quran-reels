import React, { useState, useMemo, useRef } from 'react';
import { 
  Clock, 
  Plus, 
  Filter, 
  Globe, 
  ChevronLeft, 
  ChevronRight,
  FolderDown,
  FolderOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Button } from '../shared';
import { linkWipTracksAndCaptions } from '../../services/wipLinker';
import { formatLocalDate, formatLocalTime, formatRelativePublishTime } from '../../utils/dateUtils';
import { 
  PRAYER_LOCATIONS, 
  calculatePrayerTimes, 
  getPrayerSlot, 
  type PrayerLocationPreset,
  type PrayerSlotInfo
} from '../../services/prayerTimes';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface UnifiedCalendarEvent {
  id: string;
  dateStr: string;   // YYYY-MM-DD
  timeStr: string;   // HH:mm
  reelId: string;
  reelTitle: string;
  surahName: string;
  pageId: string;
  pageName: string;
  platforms: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[];
  status: string;
  scheduledTimeIso?: string;
  prayerSlot?: PrayerSlotInfo;
}

export const SchedulingCalendar: React.FC = () => {
  const { 
    scheduleEvents, 
    pages, 
    reels, 
    setBulkScheduleModalOpen, 
    setLocalExplorerModalOpen,
    addReels,
    setSelectedReelIds,
    showToast,
    openDrawer,
    setTargetScheduleDate
  } = useStudio();

  // Current view date
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedPageFilter, setSelectedPageFilter] = useState('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState('mecca');

  const selectedLocation = useMemo<PrayerLocationPreset>(() => {
    return PRAYER_LOCATIONS.find((loc) => loc.id === selectedLocationId) || PRAYER_LOCATIONS[0];
  }, [selectedLocationId]);

  // Compute live prayer times for the viewed month reference day
  const prayerTimesToday = useMemo(() => {
    const refDate = new Date(viewYear, viewMonth, today.getDate());
    return calculatePrayerTimes(refDate, selectedLocation);
  }, [viewYear, viewMonth, selectedLocation]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isIngestingFolder, setIsIngestingFolder] = useState(false);

  const handleFolderIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsIngestingFolder(true);
    showToast('Scanning folder & parsing manifest titles/descriptions...', 'info');

    try {
      const wipResult = await linkWipTracksAndCaptions(files);
      const { linkedItems, totalVideos, matchedCaptionsCount } = wipResult;

      if (totalVideos === 0) {
        showToast('No video files found in selected folder', 'warning');
        return;
      }

      const defaultPageIds = pages.map((p) => p.id);
      const createdIds: string[] = [];

      const parsedReels = linkedItems.map((item, index) => {
        const file = item.videoFile;
        const sizeMb = Number((file.size / (1024 * 1024)).toFixed(1)) || 25.0;
        const reelId = `sched-ingest-${Date.now()}-${index}`;
        createdIds.push(reelId);

        return {
          id: reelId,
          filename: file.name,
          title: item.title,
          description: item.description,
          surahNumber: item.surahNumber || 1,
          surahName: item.surahName || 'Quran Reel',
          ayahRange: item.ayahRange || `Part ${index + 1}`,
          reciterName: item.reciterName || 'Mishary Rashid Alafasy',
          durationSeconds: 30,
          resolution: '1080x1920',
          fps: 60,
          codec: 'H.264 (MP4)',
          fileSizeMb: sizeMb,
          status: 'READY' as const,
          uploadProgress: 0,
          captionArabic: '',
          captionEnglish: item.description,
          hashtags: item.hashtags || ['#Quran', '#IslamicReels'],
          targetPageIds: defaultPageIds.length > 0 ? defaultPageIds : ['fb-page-109823471829301'],
          targetPlatforms: ['facebook', 'instagram', 'youtube', 'tiktok'] as ('facebook' | 'instagram' | 'tiktok' | 'youtube')[],
          audioLufs: -14,
          audioNormalized: true,
          videoValid: true,
          resolutionValid: true,
          durationValid: true,
          videoFile: file,
        };
      });

      addReels(parsedReels);
      setSelectedReelIds(createdIds);
      showToast(
        `✅ Ingested ${totalVideos} videos (${matchedCaptionsCount} matched with manifest)! Opening schedule wizard...`,
        'success'
      );
      setBulkScheduleModalOpen(true);
    } catch {
      showToast('Failed to ingest folder', 'error');
    } finally {
      setIsIngestingFolder(false);
      if (e.target) e.target.value = '';
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // 1. Unified Event Aggregation: combines scheduleEvents + any scheduled reels
  // Strictly normalizes all dates and times to the local calendar day
  const allEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    const eventMap = new Map<string, UnifiedCalendarEvent>();

    // From scheduleEvents
    for (const ev of scheduleEvents) {
      const matchReel = reels.find((r) => r.id === ev.reelId);
      
      // If the reel has an authoritative scheduledTime timestamp, use local date/time from it
      let dateStr = ev.dateStr;
      let timeStr = ev.timeStr;
      let scheduledIso = matchReel?.scheduledTime;

      if (matchReel?.scheduledTime) {
        const d = new Date(matchReel.scheduledTime);
        if (!isNaN(d.getTime())) {
          dateStr = formatLocalDate(d);
          timeStr = formatLocalTime(d);
          scheduledIso = matchReel.scheduledTime;
        }
      }

      const key = `${ev.reelId}-${dateStr}-${timeStr}`;
      const prayerSlot = getPrayerSlot(timeStr, prayerTimesToday);

      eventMap.set(key, {
        id: ev.id,
        dateStr,
        timeStr,
        reelId: ev.reelId,
        reelTitle: ev.reelTitle,
        surahName: ev.surahName,
        pageId: ev.pageId,
        pageName: ev.pageName,
        platforms: matchReel?.targetPlatforms || ['facebook'],
        status: matchReel?.status || 'SCHEDULED',
        scheduledTimeIso: scheduledIso,
        prayerSlot,
      });
    }

    // From reels with scheduledTime
    for (const r of reels) {
      if (r.scheduledTime) {
        const d = new Date(r.scheduledTime);
        if (!isNaN(d.getTime())) {
          const dateStr = formatLocalDate(d);
          const timeStr = formatLocalTime(d);
          const targetPage = pages.find((p) => (r.targetPageIds || []).includes(p.id)) || pages[0];
          const key = `${r.id}-${dateStr}-${timeStr}`;

          if (!eventMap.has(key)) {
            const prayerSlot = getPrayerSlot(timeStr, prayerTimesToday);
            eventMap.set(key, {
              id: `ev-reel-${r.id}`,
              dateStr,
              timeStr,
              reelId: r.id,
              reelTitle: r.title || r.filename,
              surahName: r.surahName || 'Quran Reel',
              pageId: targetPage?.id || 'fb-page-default',
              pageName: targetPage?.name || 'Facebook Page',
              platforms: r.targetPlatforms || ['facebook'],
              status: r.status,
              scheduledTimeIso: r.scheduledTime,
              prayerSlot,
            });
          }
        }
      }
    }

    return Array.from(eventMap.values());
  }, [scheduleEvents, reels, pages, prayerTimesToday]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (selectedPageFilter !== 'ALL' && ev.pageId !== selectedPageFilter) {
        return false;
      }
      return true;
    });
  }, [allEvents, selectedPageFilter]);

  // Calendar Math: standard 7-column grid with leading and trailing days
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  
  // Day of week for 1st of month (0 = Sun, 1 = Mon, ... 6 = Sat).
  // Shift so Monday = 0, Sunday = 6
  const rawFirstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const firstDayOffset = (rawFirstDayOfWeek + 6) % 7;

  // Leading days from previous month
  const prevMonthDate = new Date(viewYear, viewMonth, 0);
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthMonth = prevMonthDate.getMonth() + 1;

  const prevDays = Array.from(
    { length: firstDayOffset },
    (_, i) => {
      const dayNum = daysInPrevMonth - firstDayOffset + 1 + i;
      const dateStr = `${prevMonthYear}-${String(prevMonthMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dateStr };
    }
  );

  // Current month days
  const currentMonthDays = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return { dayNum, dateStr };
  });

  // Trailing days to fill standard 35 or 42 grid slots
  const totalSlotsSoFar = prevDays.length + currentMonthDays.length;
  const nextMonthTrailingSlots = totalSlotsSoFar > 35 ? 42 - totalSlotsSoFar : 35 - totalSlotsSoFar;

  const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
  const nextMonthYear = nextMonthDate.getFullYear();
  const nextMonthMonth = nextMonthDate.getMonth() + 1;

  const nextDays = Array.from({ length: nextMonthTrailingSlots }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${nextMonthYear}-${String(nextMonthMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return { dayNum, dateStr };
  });

  const getEventsForDateStr = (queryDate: string) => {
    return filteredEvents.filter((ev) => ev.dateStr === queryDate);
  };

  const isCurrentToday = (dateStr: string) => {
    return formatLocalDate(today) === dateStr;
  };

  const handleOpenScheduleForDate = (dateStr: string) => {
    setTargetScheduleDate(dateStr);
    setBulkScheduleModalOpen(true);
  };

  // Next upcoming drop
  const nextUpcomingDrop = useMemo(() => {
    const now = Date.now();
    const futureEvents = allEvents
      .filter((ev) => {
        if (!ev.scheduledTimeIso) return false;
        return new Date(ev.scheduledTimeIso).getTime() > now;
      })
      .sort((a, b) => new Date(a.scheduledTimeIso!).getTime() - new Date(b.scheduledTimeIso!).getTime());
    return futureEvents[0] || null;
  }, [allEvents]);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pro text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              CALENDAR STUDIO
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Solar-Synced Multi-Channel Publishing
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-mono font-bold">
              {filteredEvents.length} Scheduled Drop{filteredEvents.length === 1 ? '' : 's'}
            </span>
            {nextUpcomingDrop && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
                <Clock className="w-3 h-3 text-emerald-400" />
                Next: {nextUpcomingDrop.reelTitle.slice(0, 18)} ({formatRelativePublishTime(nextUpcomingDrop.scheduledTimeIso!)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/15 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg text-xs font-mono text-primary hover:bg-primary/15 font-semibold transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Timezone / Prayer Location Selector */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-on-surface-variant">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              {PRAYER_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-[#051424] text-white">
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hidden folder input */}
          <input
            type="file"
            // @ts-expect-error webkitdirectory supported in modern browsers
            webkitdirectory=""
            directory=""
            multiple
            ref={folderInputRef}
            onChange={handleFolderIngest}
            className="hidden"
          />

          <Button
            variant="secondary"
            size="sm"
            icon={<FolderDown className="w-4 h-4 text-emerald-400" />}
            onClick={() => folderInputRef.current?.click()}
            disabled={isIngestingFolder}
            className="border-emerald-500/30 hover:border-emerald-500/50"
            title="Ingest a folder containing videos and manifest.json, then auto-schedule across prayer times"
          >
            {isIngestingFolder ? 'Ingesting Folder...' : 'Ingest & Schedule Folder'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<FolderOpen className="w-4 h-4 text-amber-400" />}
            onClick={() => setLocalExplorerModalOpen(true)}
            className="border-amber-500/30 hover:border-amber-500/50"
            title="Browse export pack folders on disk"
          >
            Disk Packs
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setTargetScheduleDate(formatLocalDate(today));
              setBulkScheduleModalOpen(true);
            }}
            className="shadow-gold-glow font-bold"
          >
            Bulk Schedule
          </Button>
        </div>
      </div>

      {/* Islamic Solar Prayer Times Ribbon */}
      <div className="glass-panel p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-[#071626]/90 via-[#0A1F35]/80 to-[#071626]/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🕌</span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif">
              <span>Prayer Times Schedule Ribbon</span>
              <span className="text-[10px] font-mono text-primary font-normal">({selectedLocation.name})</span>
            </div>
            <div className="text-[10px] font-mono text-on-surface-variant">
              Click any prayer time slot below to schedule upcoming drops at that exact moment
            </div>
          </div>
        </div>

        {/* Prayer Time Badges with 1-Click Schedule Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { name: 'Fajr', ar: 'الفجر', icon: '🌅', time: prayerTimesToday.fajr, color: 'text-amber-300 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' },
            { name: 'Sunrise', ar: 'الشروق', icon: '🌄', time: prayerTimesToday.sunrise, color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' },
            { name: 'Dhuhr', ar: 'الظهر', icon: '☀️', time: prayerTimesToday.dhuhr, color: 'text-sky-300 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20' },
            { name: 'Asr', ar: 'العصر', icon: '🌤️', time: prayerTimesToday.asr, color: 'text-orange-300 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' },
            { name: 'Maghrib', ar: 'المغرب', icon: '🌇', time: prayerTimesToday.maghrib, color: 'text-rose-300 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20' },
            { name: 'Isha', ar: 'العشاء', icon: '🌙', time: prayerTimesToday.isha, color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20' },
            { name: 'Tahajjud', ar: 'قيام', icon: '✨', time: prayerTimesToday.tahajjud, color: 'text-purple-300 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20' },
          ].map((slot) => (
            <button
              key={slot.name}
              type="button"
              onClick={() => {
                setTargetScheduleDate(formatLocalDate(today));
                setBulkScheduleModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono transition-all cursor-pointer ${slot.color}`}
              title={`Schedule for ${slot.name} (${slot.time})`}
            >
              <span>{slot.icon}</span>
              <span className="font-semibold text-white">{slot.name}:</span>
              <strong className="tracking-wider">{slot.time}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar & Legend */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-on-surface-variant font-semibold">Filter by Destination Page:</span>
          <select
            value={selectedPageFilter}
            onChange={(e) => setSelectedPageFilter(e.target.value)}
            className="bg-black/50 border border-white/15 text-white rounded-xl px-3.5 py-1.5 text-xs font-mono outline-none cursor-pointer focus:border-primary transition-colors"
          >
            <option value="ALL">All Connected Facebook & IG Accounts ({pages.length} Pages)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.instagramBusinessAccount ? `(📸 @${p.instagramBusinessAccount.username})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Facebook
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400" /> Instagram
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> TikTok
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Auto-Pushed
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-black/40 text-center text-xs font-mono font-bold text-on-surface-variant py-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-[#0A0E17]/40 divide-x divide-y divide-white/5">
          
          {/* 1. Previous month leading days */}
          {prevDays.map(({ dayNum, dateStr }, i) => {
            const dayEvents = getEventsForDateStr(dateStr);
            return (
              <div 
                key={`prev-${i}`} 
                onClick={() => handleOpenScheduleForDate(dateStr)}
                className="min-h-[135px] p-2.5 bg-black/40 opacity-40 hover:opacity-80 transition-opacity text-xs font-mono text-on-surface-variant cursor-pointer group flex flex-col justify-between"
                title={`Click to schedule for ${dateStr}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] group-hover:text-white">
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] px-1 rounded bg-white/10 text-white font-mono">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day events if any */}
                <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar max-h-[105px]">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const matchReel = reels.find((r) => r.id === ev.reelId);
                        if (matchReel) openDrawer(matchReel);
                      }}
                      className="p-1 rounded-lg bg-black/70 border border-white/10 text-[10px] truncate text-white/80 hover:text-white"
                    >
                      {ev.timeStr} • {ev.reelTitle}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 2. Current Month Active Days */}
          {currentMonthDays.map(({ dayNum, dateStr }) => {
            const dayEvents = getEventsForDateStr(dateStr);
            const isToday = isCurrentToday(dateStr);

            return (
              <div
                key={dayNum}
                onClick={() => {
                  handleOpenScheduleForDate(dateStr);
                }}
                className={`min-h-[135px] p-2.5 transition-colors group flex flex-col justify-between cursor-pointer ${
                  isToday
                    ? 'bg-primary/10 border-2 border-primary/60 ring-1 ring-primary/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                        isToday
                          ? 'bg-primary text-black font-bold shadow-gold-glow'
                          : 'text-on-surface-variant group-hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-mono font-bold text-primary tracking-wider bg-primary/20 px-1.5 py-0.2 rounded border border-primary/30">
                        TODAY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        {dayEvents.length} drop{dayEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {/* Hover "+ Drop" prompt */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenScheduleForDate(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-primary hover:text-black text-on-surface-variant transition-all"
                      title="Schedule reel on this date"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Day Scheduled Events */}
                <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar max-h-[110px]">
                  {dayEvents.map((ev) => {
                    const matchReel = reels.find((reel) => reel.id === ev.reelId);
                    const isPublished = ev.status === 'PUBLISHED' || matchReel?.status === 'PUBLISHED';
                    const isFailed = ev.status === 'FAILED' || matchReel?.status === 'FAILED';

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (matchReel) openDrawer(matchReel);
                        }}
                        className={`p-1.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-sm group/slot ${
                          isPublished
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            : isFailed
                            ? 'bg-red-500/15 border-red-500/40 text-red-200'
                            : 'bg-black/60 border-primary/30 hover:border-primary text-white'
                        }`}
                        title={`${ev.reelTitle} (${ev.timeStr}) - Click to preview`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                          <span className="flex items-center gap-1 text-primary">
                            <Clock className="w-2.5 h-2.5" />
                            {ev.timeStr}
                          </span>

                          {/* Solar Prayer Slot Pill */}
                          {ev.prayerSlot && ev.prayerSlot.name !== 'Custom' && (
                            <span className={`text-[8px] px-1 py-0.2 rounded border font-sans font-medium flex items-center gap-0.5 ${ev.prayerSlot.color}`}>
                              <span>{ev.prayerSlot.icon}</span>
                              <span>{ev.prayerSlot.name}</span>
                            </span>
                          )}
                          
                          {/* Platform Badges */}
                          <div className="flex items-center gap-0.5">
                            {ev.platforms?.includes('facebook') && (
                              <span className="text-[8px] px-1 rounded bg-blue-500/20 text-blue-300 font-bold">f</span>
                            )}
                            {ev.platforms?.includes('instagram') && (
                              <span className="text-[8px] px-1 rounded bg-pink-500/20 text-pink-300 font-bold">📸</span>
                            )}
                            {ev.platforms?.includes('tiktok') && (
                              <span className="text-[8px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-bold">🎵</span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] font-medium text-white truncate mt-0.5 leading-snug">
                          {ev.reelTitle}
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-on-surface-variant truncate mt-0.5">
                          <span>{ev.pageName.split(' ')[0]}</span>
                          {isPublished ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> LIVE
                            </span>
                          ) : isFailed ? (
                            <span className="text-red-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> FAILED
                            </span>
                          ) : (
                            <span className="text-primary/70">AUTO</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 3. Next month trailing days */}
          {nextDays.map(({ dayNum, dateStr }, i) => {
            const dayEvents = getEventsForDateStr(dateStr);
            return (
              <div 
                key={`next-${i}`} 
                onClick={() => handleOpenScheduleForDate(dateStr)}
                className="min-h-[135px] p-2.5 bg-black/40 opacity-40 hover:opacity-80 transition-opacity text-xs font-mono text-on-surface-variant cursor-pointer group flex flex-col justify-between"
                title={`Click to schedule for ${dateStr}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] group-hover:text-white">
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] px-1 rounded bg-white/10 text-white font-mono">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day events if any */}
                <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar max-h-[105px]">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const matchReel = reels.find((r) => r.id === ev.reelId);
                        if (matchReel) openDrawer(matchReel);
                      }}
                      className="p-1 rounded-lg bg-black/70 border border-white/10 text-[10px] truncate text-white/80 hover:text-white"
                    >
                      {ev.timeStr} • {ev.reelTitle}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
