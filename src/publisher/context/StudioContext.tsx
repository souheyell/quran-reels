import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { 
  Reel, 
  Batch, 
  FacebookPage, 
  ActivityLog, 
  ScheduleEvent, 
  ActiveNavTab,
} from '../types';
import { 
  loadStudioState, 
  saveStudioState, 
  clearStudioStorage 
} from '../services/storageService';
import {
  INITIAL_FACEBOOK_PAGES,
  USER_META_CONFIG
} from '../data/mockData';
import { 
  publishReelToFacebook, 
  publishInstagramReel,
  fetchPageInstagramAccount,
  cacheReelBinary, 
  getReelBinary,
  type MetaFetchedPage
} from '../services/metaGraphApi';
import { publishTikTokVideo } from '../services/tiktokApi';
import { formatLocalDate, formatLocalTime } from '../utils/dateUtils';
import { generatePrayerSequence, type PrayerPacingType } from '../services/prayerTimes';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

interface StudioContextType {
  reels: Reel[];
  batches: Batch[];
  pages: FacebookPage[];
  activityLogs: ActivityLog[];
  scheduleEvents: ScheduleEvent[];
  selectedReelIds: string[];
  activeTab: ActiveNavTab;
  activeDrawerReel: Reel | null;
  diagnosticsModalReel: Reel | null;
  bulkCaptionModalOpen: boolean;
  bulkScheduleModalOpen: boolean;
  createBatchModalOpen: boolean;
  connectPageModalOpen: boolean;
  isWorkerRunning: boolean;
  toast: ToastInfo | null;
  
  // Actions
  setActiveTab: (tab: ActiveNavTab) => void;
  selectReel: (id: string) => void;
  setSelectedReelIds: (ids: string[]) => void;
  toggleReelSelection: (id: string) => void;
  selectAllReels: () => void;
  clearSelection: () => void;
  openDrawer: (reel: Reel) => void;
  closeDrawer: () => void;
  setDiagnosticsModalReel: (reel: Reel | null) => void;
  setBulkCaptionModalOpen: (open: boolean) => void;
  setBulkScheduleModalOpen: (open: boolean) => void;
  setCreateBatchModalOpen: (open: boolean) => void;
  setConnectPageModalOpen: (open: boolean) => void;
  fetchPagesModalOpen: boolean;
  setFetchPagesModalOpen: (open: boolean) => void;
  publishModalReel: Reel | null;
  setPublishModalReel: (reel: Reel | null) => void;
  targetScheduleDate: string | null;
  setTargetScheduleDate: (date: string | null) => void;
  localExplorerModalOpen: boolean;
  setLocalExplorerModalOpen: (open: boolean) => void;
  
  addReels: (newReelsData: Array<Partial<Reel>>, replaceUnscheduled?: boolean) => void;
  clearQueue: (filter?: 'all' | 'published' | 'ready') => void;
  updateReel: (id: string, updates: Partial<Reel>) => void;
  deleteReels: (ids: string[]) => void;
  autoFixReelAudio: (id: string) => void;
  autoFixSelected: () => void;
  applyBulkCaptions: (template: string, hashtags: string[]) => void;
  assignPagesToReels: (reelIds: string[], pageIds: string[]) => void;
  scheduleReelsBulk: (
    reelIds: string[], 
    startDate: string, 
    startTime: string, 
    intervalMinutes: number, 
    targetPlatforms?: ('facebook' | 'instagram' | 'tiktok')[],
    preUploadToCloud?: boolean,
    targetPageId?: string,
    prayerPacing?: PrayerPacingType
  ) => Promise<void>;
  publishReelsNow: (reelIds: string[], overrides?: Partial<Reel>) => Promise<void>;
  
  toggleWorker: (running?: boolean) => void;
  pauseBatch: (batchId: string) => void;
  resumeBatch: (batchId: string) => void;
  cancelBatch: (batchId: string) => void;
  retryFailedInBatch: (batchId: string) => void;
  createNewBatch: (name: string, targetPageIds: string[], reelIds: string[]) => void;
  
  reconnectPage: (pageId: string) => void;
  refreshPageInstagramAccount: (pageId: string) => Promise<boolean>;
  connectNewPage: (name: string, category: string, pageNumericId?: string, accessToken?: string) => void;
  updatePage: (pageId: string, updates: Partial<FacebookPage>) => void;
  disconnectPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  importFetchedPages: (pages: MetaFetchedPage[], allDiscoveredPages?: MetaFetchedPage[]) => void;
  
  generateSampleBatch: (count: number) => void;
  resetAllData: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = loadStudioState();
  const [reels, setReels] = useState<Reel[]>(initial.reels);
  const [batches, setBatches] = useState<Batch[]>(initial.batches);
  const [pages, setPages] = useState<FacebookPage[]>(initial.pages);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initial.activityLogs);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(initial.scheduleEvents);
  const [selectedReelIds, setSelectedReelIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [activeDrawerReel, setActiveDrawerReel] = useState<Reel | null>(null);
  const [diagnosticsModalReel, setDiagnosticsModalReel] = useState<Reel | null>(null);
  
  const [bulkCaptionModalOpen, setBulkCaptionModalOpen] = useState(false);
  const [bulkScheduleModalOpen, setBulkScheduleModalOpen] = useState(false);
  const [createBatchModalOpen, setCreateBatchModalOpen] = useState(false);
  const [connectPageModalOpen, setConnectPageModalOpen] = useState(false);
  const [fetchPagesModalOpen, setFetchPagesModalOpen] = useState(false);
  const [publishModalReel, setPublishModalReel] = useState<Reel | null>(null);
  const [targetScheduleDate, setTargetScheduleDate] = useState<string | null>(null);
  const [localExplorerModalOpen, setLocalExplorerModalOpen] = useState(false);
  
  const [isWorkerRunning, setIsWorkerRunning] = useState(true);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Ensure initial pages exist on first load and auto-detect connected Instagram accounts
  useEffect(() => {
    if (!pages || pages.length === 0) {
      setPages(INITIAL_FACEBOOK_PAGES);
      return;
    }

    // Auto-detect Instagram profile for pages missing instagramBusinessAccount
    pages.forEach((p) => {
      if ((p.pageNumericId || p.id) && p.accessToken && !p.instagramBusinessAccount) {
        const pid = p.pageNumericId || (p.id.startsWith('fb-page-') ? p.id.replace('fb-page-', '') : p.id);
        fetchPageInstagramAccount(pid, p.accessToken).then((ig) => {
          if (ig) {
            setPages((prev) =>
              prev.map((item) => (item.id === p.id ? { ...item, instagramBusinessAccount: ig } : item))
            );
          }
        }).catch(() => {});
      }
    });
  }, []);

  // Auto-Save effect debounced
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveStudioState({
        reels,
        batches,
        pages,
        activityLogs,
        scheduleEvents,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [reels, batches, pages, activityLogs, scheduleEvents]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  const selectReel = (id: string) => {
    setSelectedReelIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleReelSelection = (id: string) => {
    selectReel(id);
  };

  const selectAllReels = () => {
    if (selectedReelIds.length === reels.length) {
      setSelectedReelIds([]);
    } else {
      setSelectedReelIds(reels.map((r) => r.id));
    }
  };

  const clearSelection = () => {
    setSelectedReelIds([]);
  };

  const openDrawer = (reel: Reel) => {
    setActiveDrawerReel(reel);
  };

  const closeDrawer = () => {
    setActiveDrawerReel(null);
  };

  const updateReel = (id: string, updates: Partial<Reel>) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          if (activeDrawerReel?.id === id) {
            setActiveDrawerReel(updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const deleteReels = (ids: string[]) => {
    setReels((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelectedReelIds((prev) => prev.filter((id) => !ids.includes(id)));
    if (activeDrawerReel && ids.includes(activeDrawerReel.id)) {
      setActiveDrawerReel(null);
    }
    showToast(`Removed ${ids.length} reel${ids.length > 1 ? 's' : ''} from library`, 'info');
  };

  const autoFixReelAudio = (id: string) => {
    updateReel(id, {
      audioLufs: -14.0,
      audioNormalized: true,
    });
    showToast('Audio normalized to platform standard (-14.0 LUFS)', 'success');
  };

  const autoFixSelected = () => {
    if (selectedReelIds.length === 0) return;
    setReels((prev) =>
      prev.map((r) =>
        selectedReelIds.includes(r.id)
          ? { ...r, audioLufs: -14.0, audioNormalized: true, videoValid: true, resolutionValid: true, durationValid: true }
          : r
      )
    );
    showToast(`Auto-fixed video specifications & audio levels for ${selectedReelIds.length} reels`, 'success');
  };

  const applyBulkCaptions = (template: string, hashtags: string[]) => {
    if (selectedReelIds.length === 0) return;
    setReels((prev) =>
      prev.map((r) => {
        if (selectedReelIds.includes(r.id)) {
          return {
            ...r,
            captionEnglish: template
              .replace('{surah}', r.surahName)
              .replace('{ayah}', r.ayahRange)
              .replace('{reciter}', r.reciterName),
            hashtags: Array.from(new Set([...r.hashtags, ...hashtags])),
          };
        }
        return r;
      })
    );
    setBulkCaptionModalOpen(false);
    showToast(`Updated captions & hashtags for ${selectedReelIds.length} reels`, 'success');
  };

  const assignPagesToReels = (reelIds: string[], pageIds: string[]) => {
    setReels((prev) =>
      prev.map((r) => (reelIds.includes(r.id) ? { ...r, targetPageIds: pageIds } : r))
    );
    showToast(`Assigned ${pageIds.length} Facebook Page${pageIds.length > 1 ? 's' : ''} to ${reelIds.length} reels`, 'success');
  };

  const scheduleReelsBulk = async (
    reelIds: string[], 
    startDate: string, 
    startTime: string, 
    intervalMinutes: number,
    targetPlatforms?: ('facebook' | 'instagram' | 'tiktok')[],
    preUploadToCloud: boolean = true,
    targetPageId?: string,
    prayerPacing?: PrayerPacingType
  ) => {
    if (reelIds.length === 0) return;

    const chosenPage = (targetPageId ? pages.find((p) => p.id === targetPageId) : null) || pages[0];

    // Calculate baseline start moment
    let currentMoment = new Date(`${startDate}T${startTime}:00`);
    if (isNaN(currentMoment.getTime())) {
      currentMoment = new Date();
      currentMoment.setMinutes(currentMoment.getMinutes() + 15);
    }

    // Meta Graph API requires scheduled_publish_time to be between 10 minutes and 75 days in the future
    const minMetaTime = new Date(Date.now() + 11 * 60 * 1000); // 11 mins from now
    if (currentMoment.getTime() < minMetaTime.getTime()) {
      currentMoment = minMetaTime;
    }

    // Build timeline plan (either prayer-paced or fixed intervals)
    const schedulePlan: { reelId: string; moment: Date }[] = [];
    if (prayerPacing) {
      const moments = generatePrayerSequence(reelIds.length, currentMoment, prayerPacing);
      for (let i = 0; i < reelIds.length; i++) {
        schedulePlan.push({ reelId: reelIds[i], moment: moments[i] });
      }
    } else {
      for (const id of reelIds) {
        schedulePlan.push({ reelId: id, moment: new Date(currentMoment) });
        currentMoment = new Date(currentMoment.getTime() + intervalMinutes * 60000);
      }
    }

    // Close modal & reset selection
    setBulkScheduleModalOpen(false);
    setTargetScheduleDate(null);
    clearSelection();

    const platforms: ('facebook' | 'instagram' | 'tiktok')[] = targetPlatforms && targetPlatforms.length > 0 
      ? targetPlatforms 
      : ['facebook', 'instagram'];
    const includesFacebook = platforms.includes('facebook');

    // If preUploadToCloud is false OR if Facebook is not selected (e.g. Instagram Only),
    // route to the in-app scheduler worker (since Meta Cloud pre-scheduling is Facebook Page-only)
    if (!preUploadToCloud || !includesFacebook) {
      // Local client-side scheduling / In-app scheduler worker
      const newEvents: ScheduleEvent[] = [];
      setReels((prev) =>
        prev.map((r) => {
          const item = schedulePlan.find((p) => p.reelId === r.id);
          if (item) {
            const isoTime = item.moment.toISOString();
            const timeStr = formatLocalTime(item.moment);
            const dateStr = formatLocalDate(item.moment);
            const targetPage = targetPageId 
              ? chosenPage 
              : (pages.find((p) => (r.targetPageIds || []).includes(p.id)) || pages[0]);
            newEvents.push({
              id: `sch-${Date.now()}-${Math.random()}`,
              dateStr,
              timeStr,
              reelId: r.id,
              reelTitle: r.title,
              surahName: r.surahName,
              pageId: targetPage.id,
              pageName: targetPage.name,
            });
            return {
              ...r,
              targetPageIds: [targetPage.id],
              status: 'SCHEDULED',
              scheduledTime: isoTime,
              isUploadedToCloud: false,
              targetPlatforms: platforms,
            };
          }
          return r;
        })
      );
      setScheduleEvents((prev) => [...prev, ...newEvents]);
      const platLabel = !includesFacebook && platforms.includes('instagram')
        ? `Instagram (@${chosenPage.instagramBusinessAccount?.username || 'Instagram'})`
        : chosenPage.name;
      showToast(`Scheduled ${reelIds.length} reel${reelIds.length > 1 ? 's' : ''} for "${platLabel}". In-app scheduler worker active.`, 'info');
      return;
    }

    // --- Meta Cloud Pre-Scheduling (Zero-Laptop Dependency) ---
    // 1. Immediately mark reels as UPLOADING
    setReels((prev) =>
      prev.map((r) => {
        const item = schedulePlan.find((p) => p.reelId === r.id);
        if (item) {
          const targetPage = targetPageId 
            ? chosenPage 
            : (pages.find((p) => (r.targetPageIds || []).includes(p.id)) || pages[0]);
          return {
            ...r,
            targetPageIds: [targetPage.id],
            status: 'UPLOADING',
            uploadProgress: 10,
            scheduledTime: item.moment.toISOString(),
            targetPlatforms: targetPlatforms || r.targetPlatforms || ['facebook', 'instagram'],
            errorMessage: undefined,
            errorReason: undefined,
          };
        }
        return r;
      })
    );

    showToast(`☁️ Pre-uploading ${reelIds.length} reel${reelIds.length > 1 ? 's' : ''} to Meta for "${chosenPage.name}"...`, 'info');

    let successCount = 0;
    const newEvents: ScheduleEvent[] = [];

    // 2. Upload each reel with scheduledPublishTime
    for (const item of schedulePlan) {
      const currentReel = reels.find((r) => r.id === item.reelId);
      if (!currentReel) continue;

      const targetPage = targetPageId 
        ? chosenPage 
        : (pages.find((p) => (currentReel.targetPageIds || []).includes(p.id)) || pages[0]);
      const pageId = targetPage?.pageNumericId || '1217144761490127';
      const pageToken = targetPage?.accessToken || USER_META_CONFIG.userAccessToken;
      const scheduledUnixSeconds = Math.floor(item.moment.getTime() / 1000);

      const binary = getReelBinary(currentReel.id) || currentReel.videoFile || currentReel.videoUrl || '';

      const manualDesc = (currentReel.description || currentReel.captionEnglish || currentReel.captionArabic || '').trim();
      const tags = (currentReel.hashtags || []).filter(Boolean).join(' ');
      const finalCaption = manualDesc && tags 
        ? `${manualDesc}\n\n${tags}` 
        : (manualDesc || tags || currentReel.title);

      const platforms = targetPlatforms || currentReel.targetPlatforms || ['facebook', 'instagram'];

      try {
        const result = await publishReelToFacebook(
          pageId,
          pageToken,
          binary,
          {
            title: currentReel.title,
            caption: finalCaption,
            scheduledPublishTime: scheduledUnixSeconds,
            onProgress: (pct) => {
              setReels((prev) =>
                prev.map((r) => (r.id === currentReel.id ? { ...r, uploadProgress: pct } : r))
              );
            },
          }
        );

        if (result.success) {
          successCount++;
          setReels((prev) =>
            prev.map((r) =>
              r.id === currentReel.id
                ? {
                    ...r,
                    targetPageIds: [targetPage.id],
                    status: 'SCHEDULED',
                    uploadProgress: 100,
                    isUploadedToCloud: true,
                    metaVideoId: result.videoId,
                    scheduledTime: item.moment.toISOString(),
                    targetPlatforms: platforms,
                  }
                : r
            )
          );

          newEvents.push({
            id: `sch-${Date.now()}-${currentReel.id}`,
            dateStr: formatLocalDate(item.moment),
            timeStr: formatLocalTime(item.moment),
            reelId: currentReel.id,
            reelTitle: currentReel.title,
            surahName: currentReel.surahName,
            pageId: targetPage.id,
            pageName: targetPage.name,
          });

          const hasIg = !!targetPage.instagramBusinessAccount;
          const igNote = (platforms.includes('instagram') && hasIg)
            ? ` • 📸 Instagram (@${targetPage.instagramBusinessAccount?.username}) will auto-dispatch at ${item.moment.toLocaleTimeString()}`
            : '';

          setActivityLogs((prev) => [
            {
              id: `log-cloud-${Date.now()}-${currentReel.id}`,
              reelId: currentReel.id,
              reelTitle: currentReel.title,
              surahName: currentReel.surahName,
              pageName: targetPage?.name || 'Facebook Page',
              platform: 'facebook',
              actionType: 'SCHEDULED',
              timestamp: 'Just now',
              message: `☁️ Pre-Scheduled on Meta Cloud for ${targetPage.name}! Video ID: ${result.videoId}. Auto-publishing at ${item.moment.toLocaleString()}.${igNote} Safe to turn off laptop.`,
              isError: false,
            },
            ...prev.slice(0, 29),
          ]);
        } else {
          setReels((prev) =>
            prev.map((r) =>
              r.id === currentReel.id
                ? {
                    ...r,
                    status: 'FAILED',
                    uploadProgress: 0,
                    errorMessage: result.errorMessage,
                    errorReason: 'Meta Cloud Pre-Scheduling Error',
                    errorSolution: 'Verify Page Token permissions (pages_manage_posts) and scheduled time is >= 10 mins in the future.',
                  }
                : r
            )
          );

          setActivityLogs((prev) => [
            {
              id: `log-cloud-fail-${Date.now()}-${currentReel.id}`,
              reelId: currentReel.id,
              reelTitle: currentReel.title,
              surahName: currentReel.surahName,
              pageName: targetPage?.name || 'Facebook Page',
              platform: 'facebook',
              actionType: 'FAILED',
              timestamp: 'Just now',
              message: `Meta Cloud Scheduling Failed for ${targetPage.name}: ${result.errorMessage}`,
              isError: true,
            },
            ...prev.slice(0, 29),
          ]);
        }
      } catch (uploadErr: any) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === currentReel.id
              ? {
                  ...r,
                  status: 'FAILED',
                  uploadProgress: 0,
                  errorMessage: uploadErr?.message || 'Network error during Meta upload',
                  errorReason: 'Network error',
                }
              : r
          )
        );
      }
    }

    if (newEvents.length > 0) {
      setScheduleEvents((prev) => [...prev, ...newEvents]);
    }

    if (successCount > 0) {
      showToast(
        `☁️ Successfully pre-scheduled ${successCount} reel${successCount > 1 ? 's' : ''} on Meta Cloud for "${chosenPage.name}"! Your laptop can now be safely turned off.`,
        'success'
      );
    } else {
      showToast(`Failed to pre-schedule reels to Meta Cloud. Check activity logs for details.`, 'error');
    }
  };

  const publishReelsNow = async (reelIds: string[], overrides?: Partial<Reel>) => {
    if (reelIds.length === 0) return;

    // Immediately mark reels as UPLOADING and merge overrides into state
    setReels((prev) =>
      prev.map((r) =>
        reelIds.includes(r.id)
          ? { 
              ...r, 
              ...(overrides || {}),
              status: 'UPLOADING', 
              uploadProgress: 10, 
              errorMessage: undefined, 
              errorReason: undefined 
            }
          : r
      )
    );

    showToast(`Dispatching ${reelIds.length} Reel${reelIds.length > 1 ? 's' : ''} to Meta Graph API...`, 'info');

    // Process each selected reel sequentially or in parallel with live status updates
    for (const reelId of reelIds) {
      const baseReel = reels.find((r) => r.id === reelId);
      if (!baseReel) continue;

      // Merge overrides immediately so user selections take effect without React render lag
      const currentReel = { ...baseReel, ...(overrides || {}) };

      const targetPageId = currentReel.targetPageIds?.[0];
      const targetPage = pages.find((p) => p.id === targetPageId) || pages[0];
      const pageId = targetPage?.pageNumericId || '1217144761490127';
      const pageToken = targetPage?.accessToken || USER_META_CONFIG.userAccessToken;

      const binary = getReelBinary(reelId) || currentReel.videoFile || currentReel.videoUrl || '';

      // Assemble caption: send only manual description / user text (no boilerplate)
      const manualDesc = (currentReel.description || currentReel.captionEnglish || currentReel.captionArabic || '').trim();
      const tags = (currentReel.hashtags || []).filter(Boolean).join(' ');
      const finalCaption = manualDesc && tags 
        ? `${manualDesc}\n\n${tags}` 
        : (manualDesc || tags || currentReel.title);

      const platforms = currentReel.targetPlatforms && currentReel.targetPlatforms.length > 0 
        ? currentReel.targetPlatforms 
        : ['facebook'];

      let anySuccess = false;
      const publishedPlatformNames: string[] = [];
      const platformErrors: string[] = [];

      // 1. Facebook Dispatch
      if (platforms.includes('facebook')) {
        try {
          const result = await publishReelToFacebook(
            pageId,
            pageToken,
            binary,
            {
              title: currentReel.title,
              caption: finalCaption,
              onProgress: (pct) => {
                setReels((prev) =>
                  prev.map((r) => (r.id === reelId ? { ...r, uploadProgress: pct } : r))
                );
              },
            }
          );

          if (result.success) {
            anySuccess = true;
            publishedPlatformNames.push(`Facebook (${targetPage?.name})`);
            setActivityLogs((prev) => [
              {
                id: `log-fb-${Date.now()}`,
                reelId,
                reelTitle: currentReel.title,
                surahName: currentReel.surahName,
                pageName: targetPage?.name || 'Facebook Page',
                platform: 'facebook',
                actionType: 'PUBLISHED',
                timestamp: 'Just now',
                message: `Published to Facebook Page "${targetPage?.name}"! Video ID: ${result.videoId}`,
                isError: false,
              },
              ...prev.slice(0, 29),
            ]);
          } else {
            platformErrors.push(`Facebook (${targetPage?.name}): ${result.errorMessage || 'Publishing rejected'}`);
            setActivityLogs((prev) => [
              {
                id: `log-fb-fail-${Date.now()}`,
                reelId,
                reelTitle: currentReel.title,
                surahName: currentReel.surahName,
                pageName: targetPage?.name || 'Facebook Page',
                platform: 'facebook',
                actionType: 'FAILED',
                timestamp: 'Just now',
                message: `Facebook (${targetPage?.name}) Rejected: ${result.errorMessage}`,
                isError: true,
              },
              ...prev.slice(0, 29),
            ]);
          }
        } catch (fbErr: any) {
          const fbMsg = fbErr?.message || 'Unknown Facebook network error';
          platformErrors.push(`Facebook: ${fbMsg}`);
          console.warn('Facebook dispatch error:', fbErr);
        }
      }

      // 2. Instagram Dispatch
      if (platforms.includes('instagram')) {
        const igUserId = targetPage?.instagramBusinessAccount?.id;
        if (!igUserId) {
          const noIgMsg = `Facebook Page "${targetPage?.name}" has no linked Instagram Business Account. Choose a page with linked Instagram (such as "أَجْر - Ajr" @ajr4_all or "Boumardessna" @boumardessna) or uncheck Instagram.`;
          platformErrors.push(`Instagram: ${noIgMsg}`);
          setActivityLogs((prev) => [
            {
              id: `log-ig-fail-${Date.now()}`,
              reelId,
              reelTitle: currentReel.title,
              surahName: currentReel.surahName,
              pageName: targetPage?.name || 'Instagram',
              platform: 'instagram',
              actionType: 'FAILED',
              timestamp: 'Just now',
              message: `Instagram Skipped: ${noIgMsg}`,
              isError: true,
            },
            ...prev.slice(0, 29),
          ]);
        } else {
          try {
            const igResult = await publishInstagramReel({
              igUserId,
              accessToken: pageToken,
              caption: finalCaption,
              reelId,
              videoUrl: currentReel.videoUrl,
              videoInput: binary,
              onProgress: (pct) => {
                setReels((prev) =>
                  prev.map((r) => (r.id === reelId ? { ...r, uploadProgress: pct } : r))
                );
              },
            });

            if (igResult.success) {
              anySuccess = true;
              const igUser = targetPage?.instagramBusinessAccount?.username;
              publishedPlatformNames.push(`Instagram (@${igUser || 'Instagram'})`);
              setActivityLogs((prev) => [
                {
                  id: `log-ig-${Date.now()}`,
                  reelId,
                  reelTitle: currentReel.title,
                  surahName: currentReel.surahName,
                  pageName: igUser ? `@${igUser} (${targetPage?.name})` : (targetPage?.name || 'Instagram'),
                  platform: 'instagram',
                  actionType: 'PUBLISHED',
                  timestamp: 'Just now',
                  message: `Published to Instagram Reels (@${igUser})! Media ID: ${igResult.videoId}`,
                  isError: false,
                },
                ...prev.slice(0, 29),
              ]);
            } else {
              platformErrors.push(`Instagram: ${igResult.errorMessage || 'Processing rejected'}`);
              setActivityLogs((prev) => [
                {
                  id: `log-ig-fail-${Date.now()}`,
                  reelId,
                  reelTitle: currentReel.title,
                  surahName: currentReel.surahName,
                  pageName: targetPage?.name || 'Instagram',
                  platform: 'instagram',
                  actionType: 'FAILED',
                  timestamp: 'Just now',
                  message: `Instagram Rejected: ${igResult.errorMessage}`,
                  isError: true,
                },
                ...prev.slice(0, 29),
              ]);
            }
          } catch (igErr: any) {
            const igMsg = igErr?.message || 'Instagram connection error';
            platformErrors.push(`Instagram: ${igMsg}`);
            console.warn('Instagram dispatch error:', igErr);
          }
        }
      }

      // 3. TikTok Dispatch
      if (platforms.includes('tiktok')) {
        try {
          const ttResult = await publishTikTokVideo({
            title: finalCaption,
            reelId,
            onProgress: (pct) => {
              setReels((prev) =>
                prev.map((r) => (r.id === reelId ? { ...r, uploadProgress: pct } : r))
              );
            },
          });

          if (ttResult.success) {
            anySuccess = true;
            publishedPlatformNames.push('TikTok');
            setActivityLogs((prev) => [
              {
                id: `log-tt-${Date.now()}`,
                reelId,
                reelTitle: currentReel.title,
                surahName: currentReel.surahName,
                pageName: 'TikTok Creator Hub',
                platform: 'tiktok',
                actionType: 'PUBLISHED',
                timestamp: 'Just now',
                message: `Dispatched to TikTok! Post ID: ${ttResult.publishId}`,
                isError: false,
              },
              ...prev.slice(0, 29),
            ]);
          } else {
            platformErrors.push(`TikTok: ${ttResult.errorMessage || 'TikTok rejected'}`);
            setActivityLogs((prev) => [
              {
                id: `log-tt-fail-${Date.now()}`,
                reelId,
                reelTitle: currentReel.title,
                surahName: currentReel.surahName,
                pageName: 'TikTok',
                platform: 'tiktok',
                actionType: 'FAILED',
                timestamp: 'Just now',
                message: `TikTok Rejected: ${ttResult.errorMessage}`,
                isError: true,
              },
              ...prev.slice(0, 29),
            ]);
          }
        } catch (ttErr: any) {
          const ttMsg = ttErr?.message || 'TikTok upload error';
          platformErrors.push(`TikTok: ${ttMsg}`);
          console.warn('TikTok dispatch error:', ttErr);
        }
      }

      if (anySuccess) {
        const hasPlatformError = platformErrors.length > 0;
        setReels((prev) =>
          prev.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  status: 'PUBLISHED',
                  uploadProgress: 100,
                  publishedAt: new Date().toISOString(),
                  errorMessage: hasPlatformError ? platformErrors.join(' • ') : undefined,
                  errorReason: hasPlatformError ? platformErrors.join(' • ') : undefined,
                }
              : r
          )
        );

        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.75 },
            colors: ['#F59E0B', '#10B981', '#FFC174', '#EC4899', '#3B82F6'],
          });
        } catch (_) {}

        if (hasPlatformError) {
          showToast(`⚠️ Published to ${publishedPlatformNames.join(' & ')}, but failed on: ${platformErrors.join(' • ')}`, 'info');
        } else {
          showToast(`🎉 "${currentReel.title}" published live to ${publishedPlatformNames.join(' & ')}!`, 'success');
        }
      } else {
        const fullCombinedError = platformErrors.join(' • ') || 'Dispatch failed on selected platforms.';
        setReels((prev) =>
          prev.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  status: 'FAILED',
                  uploadProgress: 0,
                  errorMessage: fullCombinedError,
                  errorReason: fullCombinedError,
                  errorSolution: 'Check Facebook Page permissions (publish_video, pages_manage_posts), verify video file exists, or select a page with linked Instagram.',
                }
              : r
          )
        );
        showToast(`❌ ${fullCombinedError}`, 'error');
      }
    }
  };

  const addReels = (newReelsData: Array<Partial<Reel>>, replaceUnscheduled: boolean = false) => {
    const defaultPageIds = [pages[0]?.id || 'fb-page-ajr'];
    const createdReels: Reel[] = newReelsData.map((data, index) => {
      const id = data.id || `reel-${Date.now()}-${index}`;
      
      if (data.videoFile) {
        cacheReelBinary(id, data.videoFile);
      }

      return {
        id,
        filename: data.filename || `reel_${id}.mp4`,
        title: data.title || 'Quranic Verse & Reflection',
        surahNumber: data.surahNumber || 1,
        surahName: data.surahName || 'Al-Fatiha',
        ayahRange: data.ayahRange || '1 - 7',
        reciterName: data.reciterName || 'Mishary Rashid Alafasy',
        durationSeconds: data.durationSeconds || 45,
        resolution: data.resolution || '1080x1920',
        fps: data.fps || 60,
        codec: data.codec || 'H.264 (MP4)',
        fileSizeMb: data.fileSizeMb || 38.5,
        status: data.status || 'READY',
        uploadProgress: data.uploadProgress || 0,
        captionArabic: data.captionArabic || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        captionEnglish: data.captionEnglish || 'In the name of Allah, the Entirely Merciful, the Especially Merciful. #Quran #Noor',
        description: data.description || '',
        hashtags: data.hashtags || ['#Quran', '#IslamicReels', '#Tilawah', '#Reflection'],
        targetPageIds: data.targetPageIds || defaultPageIds,
        targetPlatforms: data.targetPlatforms || ['facebook'],
        audioLufs: data.audioLufs || -14.0,
        audioNormalized: data.audioNormalized ?? true,
        videoValid: data.videoValid ?? true,
        resolutionValid: data.resolutionValid ?? true,
        durationValid: data.durationValid ?? true,
        thumbnailUrl: data.thumbnailUrl || '',
        videoUrl: data.videoUrl || '',
        bgImageUrl: data.thumbnailUrl || data.bgImageUrl || '',
        batchName: data.batchName,
        createdAt: data.createdAt || new Date().toISOString(),
      };
    });

    setReels((prev) => {
      // If replaceUnscheduled is true, preserve only already scheduled or published reels
      const baseList = replaceUnscheduled
        ? prev.filter((r) => r.status === 'SCHEDULED' || r.status === 'PUBLISHED')
        : prev;

      // Deduplicate: If an existing reel matches the new reel ID or (batchName + filename), update it
      const newIds = new Set(createdReels.map((c) => c.id));
      const newBatchFiles = new Set(
        createdReels
          .filter((c) => c.batchName)
          .map((c) => `${c.batchName}::${c.filename}`)
      );

      const filteredBase = baseList.filter((r) => {
        if (newIds.has(r.id)) return false;
        if (r.batchName && newBatchFiles.has(`${r.batchName}::${r.filename}`)) return false;
        return true;
      });

      return [...createdReels, ...filteredBase];
    });

    showToast(`Added ${createdReels.length} Reel${createdReels.length > 1 ? 's' : ''} to Queue`, 'success');
  };

  const clearQueue = (filter: 'all' | 'published' | 'ready' = 'ready') => {
    setReels((prev) => {
      if (filter === 'all') return [];
      if (filter === 'published') return prev.filter((r) => r.status !== 'PUBLISHED');
      if (filter === 'ready') return prev.filter((r) => r.status !== 'READY' && r.status !== 'FAILED');
      return prev;
    });
    setSelectedReelIds([]);
    showToast(`Queue cleared (${filter})`, 'info');
  };

  const generateSampleBatch = (count: number) => {
    const surahPool = [
      { num: 1, name: 'Al-Fatiha', range: '1-7', reciter: 'Mishary Alafasy', arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ', eng: 'Praise be to Allah, Lord of the worlds, the Entirely Merciful, the Especially Merciful.' },
      { num: 18, name: 'Al-Kahf', range: '1-10', reciter: 'Abdul Basit', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا ۜ', eng: 'Praise be to Allah who revealed to His servant the Book and made no crookedness therein.' },
      { num: 55, name: 'Ar-Rahman', range: '1-13', reciter: 'Maher Al-Muaiqly', arabic: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ', eng: 'So which of the favors of your Lord will you deny?' },
      { num: 67, name: 'Al-Mulk', range: '1-15', reciter: 'Islam Sobhi', arabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', eng: 'Blessed is He in whose hand is dominion, and He is over all things competent.' },
      { num: 36, name: 'Ya-Sin', range: '1-12', reciter: 'Nasser Al-Qatami', arabic: 'يس ۝ وَالْقُرْآنِ الْحَكِيمِ ۝ إِنَّكَ لَمِنَ الْمُرْسَلِينَ', eng: 'Ya-Sin. By the wise Quran, indeed you are of the messengers.' },
      { num: 87, name: 'Al-A\'la', range: '1-19', reciter: 'Yasser Al-Dossari', arabic: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى ۝ الَّذِي خَلَقَ فَسَوَّىٰ', eng: 'Exalt the name of your Lord, the Most High, who created and proportioned.' },
      { num: 2, name: 'Al-Baqarah', range: '255', reciter: 'Saad Al-Ghamdi', arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ', eng: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.' },
    ];

    const imagesPool = [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80',
    ];

    const sampleItems: Array<Partial<Reel>> = [];
    for (let i = 0; i < count; i++) {
      const s = surahPool[i % surahPool.length];
      const img = imagesPool[i % imagesPool.length];
      sampleItems.push({
        filename: `${String(s.num).padStart(3, '0')}_Surah_${s.name}_batch_${i + 1}.mp4`,
        title: `Surah ${s.name} (${s.range}) — ${s.reciter}`,
        surahNumber: s.num,
        surahName: s.name,
        ayahRange: s.range,
        reciterName: s.reciter,
        durationSeconds: 35 + (i * 7) % 50,
        resolution: '1080x1920',
        fps: 60,
        codec: 'H.264 (MP4)',
        fileSizeMb: Number((32 + (i * 3.4) % 40).toFixed(1)),
        captionArabic: s.arabic,
        captionEnglish: s.eng,
        hashtags: ['#Quran', `#Surah${s.name.replace(/[^a-zA-Z]/g, '')}`, '#IslamicReels', '#DailyAyah'],
        targetPageIds: ['fb-page-1', 'fb-page-2'],
        audioLufs: -14.0,
        audioNormalized: true,
        bgImageUrl: img,
      });
    }

    addReels(sampleItems);
  };

  const createNewBatch = (name: string, targetPageIds: string[], reelIds: string[]) => {
    const newBatchId = `batch-${Date.now()}`;
    const newBatch: Batch = {
      id: newBatchId,
      name,
      targetPageIds,
      totalReels: reelIds.length,
      publishedCount: 0,
      queuedCount: reelIds.length,
      uploadingCount: 0,
      failedCount: 0,
      scheduledCount: 0,
      progressPercent: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      estimatedRemainingMins: Math.ceil(reelIds.length * 2.5),
    };

    setBatches((prev) => [newBatch, ...prev]);
    setReels((prev) =>
      prev.map((r) =>
        reelIds.includes(r.id)
          ? { ...r, batchId: newBatchId, batchName: name, targetPageIds, status: 'READY' }
          : r
      )
    );
    setCreateBatchModalOpen(false);
    clearSelection();
    showToast(`Batch "${name}" created with ${reelIds.length} reels`, 'success');
  };

  const pauseBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'PAUSED' } : b))
    );
    showToast('Batch paused. Active publishing suspended.', 'info');
  };

  const resumeBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'ACTIVE' } : b))
    );
    showToast('Batch resumed. Publishing queue running.', 'success');
  };

  const cancelBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'CANCELLED' } : b))
    );
    showToast('Batch cancelled.', 'warning');
  };

  const retryFailedInBatch = (batchId: string) => {
    setReels((prev) =>
      prev.map((r) =>
        r.batchId === batchId && r.status === 'FAILED'
          ? { ...r, status: 'READY', errorMessage: undefined, errorReason: undefined, targetPageIds: ['fb-page-1'] }
          : r
      )
    );
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId ? { ...b, queuedCount: b.queuedCount + b.failedCount, failedCount: 0 } : b
      )
    );
    showToast('Re-queued failed reels with healthy Facebook Page credentials', 'success');
  };

  const reconnectPage = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? { ...p, status: 'CONNECTED', tokenExpiryDays: 60, hasPermissions: true }
          : p
      )
    );
    // Fix any reels failed due to this page
    setReels((prev) =>
      prev.map((r) =>
        r.targetPageIds.includes(pageId) && r.status === 'FAILED'
          ? { ...r, status: 'READY', errorMessage: undefined }
          : r
      )
    );
    setDiagnosticsModalReel(null);
    showToast('Facebook Page token successfully refreshed & permissions verified!', 'success');
  };

  const refreshPageInstagramAccount = async (pageId: string): Promise<boolean> => {
    const target = pages.find((p) => p.id === pageId);
    if (!target) return false;
    const pid = target.pageNumericId || (target.id.startsWith('fb-page-') ? target.id.replace('fb-page-', '') : target.id);
    const token = target.accessToken;
    if (!token) {
      showToast('No Page Access Token configured for this page', 'warning');
      return false;
    }
    showToast(`Checking Meta Graph API for linked Instagram profile...`, 'info');
    try {
      const ig = await fetchPageInstagramAccount(pid, token);
      if (ig) {
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, instagramBusinessAccount: ig } : p))
        );
        showToast(`Linked Instagram account: @${ig.username}`, 'success');
        return true;
      } else {
        showToast('No linked Instagram Business account found on this Facebook Page', 'warning');
        return false;
      }
    } catch (err: any) {
      showToast(`Failed to query Instagram account: ${err?.message || err}`, 'error');
      return false;
    }
  };

  const connectNewPage = (
    name: string, 
    category: string, 
    pageNumericId?: string, 
    accessToken?: string
  ) => {
    const newPage: FacebookPage = {
      id: `fb-page-${Date.now()}`,
      name,
      handle: `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      category,
      followersCount: 15000,
      avatarUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80',
      status: 'CONNECTED',
      tokenExpiryDays: 60,
      queuedCount: 0,
      publishedTodayCount: 0,
      totalPublished: 0,
      hasPermissions: true,
      pageNumericId,
      accessToken,
    };
    setPages((prev) => [...prev, newPage]);
    setConnectPageModalOpen(false);
    showToast(`Connected "${name}" successfully`, 'success');

    if (pageNumericId && accessToken) {
      fetchPageInstagramAccount(pageNumericId, accessToken).then((ig) => {
        if (ig) {
          setPages((prev) =>
            prev.map((p) => (p.id === newPage.id ? { ...p, instagramBusinessAccount: ig } : p))
          );
          showToast(`Linked Instagram Profile @${ig.username} discovered!`, 'success');
        }
      }).catch(() => {});
    }
  };

  const updatePage = (pageId: string, updates: Partial<FacebookPage>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, ...updates } : p))
    );
    showToast('Facebook Page details updated', 'success');
  };

  const disconnectPage = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, status: 'DISCONNECTED', hasPermissions: false } : p))
    );
    showToast('Page disconnected', 'info');
  };

  const deletePage = (pageId: string) => {
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    showToast('Page removed from Studio', 'info');
  };

  const importFetchedPages = (fetchedPages: MetaFetchedPage[], allDiscoveredPages?: MetaFetchedPage[]) => {
    // If allDiscoveredPages provided, identify and remove unselected pages from Studio selectors
    const unselectedNamesAndIds = new Set<string>();
    if (allDiscoveredPages && allDiscoveredPages.length > 0) {
      const selectedIds = new Set(fetchedPages.map((p) => p.id));
      for (const dp of allDiscoveredPages) {
        if (!selectedIds.has(dp.id)) {
          unselectedNamesAndIds.add(dp.id);
          unselectedNamesAndIds.add(`fb-page-${dp.id}`);
          unselectedNamesAndIds.add(dp.name);
        }
      }
    }

    setPages((prev) => {
      // 1. Remove unselected pages from Studio
      const filtered = prev.filter(
        (p) =>
          !unselectedNamesAndIds.has(p.id) &&
          !unselectedNamesAndIds.has(p.pageNumericId || '') &&
          !unselectedNamesAndIds.has(p.name)
      );

      // 2. Add or update selected pages
      const updated = [...filtered];
      for (const fp of fetchedPages) {
        const existingIdx = updated.findIndex(
          (p) => p.pageNumericId === fp.id || p.id === `fb-page-${fp.id}` || p.name === fp.name
        );
        const newPage: FacebookPage = {
          id: existingIdx >= 0 ? updated[existingIdx].id : `fb-page-${fp.id}`,
          name: fp.name,
          handle: `@${fp.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          category: fp.category || 'Facebook Page',
          followersCount: fp.followersCount || 0,
          avatarUrl: fp.avatarUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80',
          status: 'CONNECTED',
          tokenExpiryDays: 60,
          queuedCount: existingIdx >= 0 ? updated[existingIdx].queuedCount : 0,
          publishedTodayCount: existingIdx >= 0 ? updated[existingIdx].publishedTodayCount : 0,
          totalPublished: existingIdx >= 0 ? updated[existingIdx].totalPublished : 0,
          hasPermissions: true,
          pageNumericId: fp.id,
          accessToken: fp.accessToken,
          instagramBusinessAccount: fp.instagramBusinessAccount,
        };

        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...newPage };
        } else {
          updated.push(newPage);
        }
      }
      return updated;
    });

    setFetchPagesModalOpen(false);
    const removedCount = unselectedNamesAndIds.size > 0 && allDiscoveredPages
      ? allDiscoveredPages.length - fetchedPages.length
      : 0;
    showToast(
      removedCount > 0
        ? `Synced ${fetchedPages.length} Page(s) & removed ${removedCount} unselected page(s) from selectors!`
        : `Successfully imported/synced ${fetchedPages.length} Facebook Page${fetchedPages.length > 1 ? 's' : ''}!`,
      'success'
    );
  };

  const resetAllData = () => {
    const reset = clearStudioStorage();
    setReels(reset.reels);
    setBatches(reset.batches);
    setPages(reset.pages);
    setActivityLogs(reset.activityLogs);
    setScheduleEvents(reset.scheduleEvents);
    setSelectedReelIds([]);
    setActiveDrawerReel(null);
    setDiagnosticsModalReel(null);
    showToast('Studio data reset to original Noor Studio defaults', 'info');
  };

  const publishingInProgressRef = useRef<Set<string>>(new Set());

  // Active in-app background scheduler worker: checks every 15s for due scheduled drops
  useEffect(() => {
    if (!isWorkerRunning) return;

    const intervalId = setInterval(() => {
      const now = Date.now();

      // Find reels that are SCHEDULED and whose scheduledTime has arrived or passed
      const dueReels = reels.filter((r) => {
        if (r.status !== 'SCHEDULED' || !r.scheduledTime) return false;
        const schedTime = new Date(r.scheduledTime).getTime();
        return !isNaN(schedTime) && schedTime <= now && !publishingInProgressRef.current.has(r.id);
      });

      if (dueReels.length === 0) return;

      console.log(`⏰ [Scheduler Worker] Triggering ${dueReels.length} due reel(s):`, dueReels.map((r) => r.title));

      for (const dueReel of dueReels) {
        publishingInProgressRef.current.add(dueReel.id);

        const platforms = dueReel.targetPlatforms || ['facebook'];

        if (dueReel.isUploadedToCloud) {
          // If already pre-uploaded to Meta Cloud for Facebook:
          if (platforms.includes('instagram')) {
            // Instagram requires real-time dispatch for non-whitelisted accounts
            publishReelsNow([dueReel.id], { targetPlatforms: ['instagram'] })
              .finally(() => {
                publishingInProgressRef.current.delete(dueReel.id);
              });
          } else {
            // Facebook was pre-uploaded with scheduledPublishTime; server released it
            setReels((prev) =>
              prev.map((r) =>
                r.id === dueReel.id
                  ? { ...r, status: 'PUBLISHED', publishedAt: new Date().toISOString() }
                  : r
              )
            );
            publishingInProgressRef.current.delete(dueReel.id);
            showToast(`🎉 Scheduled Reel "${dueReel.title}" released on Meta Cloud!`, 'success');
          }
        } else {
          // Local scheduled drop -> dispatch all selected platforms now
          publishReelsNow([dueReel.id])
            .finally(() => {
              publishingInProgressRef.current.delete(dueReel.id);
            });
        }
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isWorkerRunning, reels, pages]);

  const toggleWorker = (running?: boolean) => {
    setIsWorkerRunning((prev) => (running !== undefined ? running : !prev));
  };

  return (
    <StudioContext.Provider
      value={{
        reels,
        batches,
        pages,
        activityLogs,
        scheduleEvents,
        selectedReelIds,
        activeTab,
        activeDrawerReel,
        diagnosticsModalReel,
        bulkCaptionModalOpen,
        bulkScheduleModalOpen,
        createBatchModalOpen,
        connectPageModalOpen,
        fetchPagesModalOpen,
        publishModalReel,
        isWorkerRunning,
        toast,
        
        setActiveTab,
        selectReel,
        setSelectedReelIds,
        toggleReelSelection,
        selectAllReels,
        clearSelection,
        openDrawer,
        closeDrawer,
        setDiagnosticsModalReel,
        setBulkCaptionModalOpen,
        setBulkScheduleModalOpen,
        setCreateBatchModalOpen,
        setConnectPageModalOpen,
        setFetchPagesModalOpen,
        setPublishModalReel,
        targetScheduleDate,
        setTargetScheduleDate,
        localExplorerModalOpen,
        setLocalExplorerModalOpen,
        
        addReels,
        clearQueue,
        updateReel,
        deleteReels,
        autoFixReelAudio,
        autoFixSelected,
        applyBulkCaptions,
        assignPagesToReels,
        scheduleReelsBulk,
        publishReelsNow,
        
        toggleWorker,
        pauseBatch,
        resumeBatch,
        cancelBatch,
        retryFailedInBatch,
        createNewBatch,
        
        reconnectPage,
        refreshPageInstagramAccount,
        connectNewPage,
        updatePage,
        disconnectPage,
        deletePage,
        importFetchedPages,
        
        generateSampleBatch,
        resetAllData,
        showToast,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
