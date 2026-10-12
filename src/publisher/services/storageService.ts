import type { Reel, Batch, FacebookPage, ActivityLog, ScheduleEvent } from '../types';
import { 
  INITIAL_REELS, 
  INITIAL_BATCHES, 
  INITIAL_FACEBOOK_PAGES, 
  INITIAL_ACTIVITY_LOGS, 
  INITIAL_SCHEDULE_EVENTS 
} from '../data/mockData';

const CURRENT_STORAGE_KEY = 'REELS_BULK_QURAN_STATE_V7_MULTI_PAGES';
const LEGACY_STORAGE_KEYS = [
  'REELS_BULK_QURAN_STATE_V1',
  'REELS_BULK_QURAN_STATE_V2_LIVE',
  'REELS_BULK_QURAN_STATE_V3_AJR_ONLY',
  'REELS_BULK_QURAN_STATE_V4_AJR_ONLY',
  'REELS_BULK_QURAN_STATE_V5_LIVE_PAGE_TOKEN',
  'REELS_BULK_QURAN_STATE_V6_EXTENDED_TOKEN'
];

export interface PersistedStudioState {
  reels: Reel[];
  batches: Batch[];
  pages: FacebookPage[];
  activityLogs: ActivityLog[];
  scheduleEvents: ScheduleEvent[];
  lastSavedAt: string;
}

export const loadStudioState = (): PersistedStudioState => {
  try {
    // Purge legacy storage keys
    LEGACY_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });

    const raw = localStorage.getItem(CURRENT_STORAGE_KEY);
    if (!raw) {
      const freshState: PersistedStudioState = {
        reels: INITIAL_REELS,
        batches: INITIAL_BATCHES,
        pages: INITIAL_FACEBOOK_PAGES,
        activityLogs: INITIAL_ACTIVITY_LOGS,
        scheduleEvents: INITIAL_SCHEDULE_EVENTS,
        lastSavedAt: new Date().toISOString(),
      };
      saveStudioState(freshState);
      return freshState;
    }

    const parsed = JSON.parse(raw) as PersistedStudioState;

    // Validate that pages array is present and populated
    const storedPages = Array.isArray(parsed.pages) && parsed.pages.length > 0
      ? parsed.pages
      : INITIAL_FACEBOOK_PAGES;

    // Merge any missing pages from INITIAL_FACEBOOK_PAGES into storedPages
    const existingIds = new Set(storedPages.map((p) => p.pageNumericId || p.id));
    const mergedPages = [...storedPages];
    for (const initPage of INITIAL_FACEBOOK_PAGES) {
      const hasPage = (initPage.pageNumericId ? existingIds.has(initPage.pageNumericId) : false) || existingIds.has(initPage.id);
      if (!hasPage) {
        mergedPages.push(initPage);
      }
    }

    // Backfill connected Instagram account if missing
    const validatedPages = mergedPages.map((p) => {
      const matchInit = INITIAL_FACEBOOK_PAGES.find(
        (ip) => ip.pageNumericId === p.pageNumericId || ip.id === p.id
      );
      if (matchInit?.instagramBusinessAccount && !p.instagramBusinessAccount) {
        return {
          ...p,
          instagramBusinessAccount: matchInit.instagramBusinessAccount,
        };
      }
      return p;
    });

    return {
      reels: Array.isArray(parsed.reels) ? parsed.reels : INITIAL_REELS,
      batches: Array.isArray(parsed.batches) ? parsed.batches : INITIAL_BATCHES,
      pages: validatedPages,
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : INITIAL_ACTIVITY_LOGS,
      scheduleEvents: Array.isArray(parsed.scheduleEvents) ? parsed.scheduleEvents : INITIAL_SCHEDULE_EVENTS,
      lastSavedAt: parsed.lastSavedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Failed to load state from localStorage, resetting to Ajr-only:', err);
    return {
      reels: INITIAL_REELS,
      batches: INITIAL_BATCHES,
      pages: INITIAL_FACEBOOK_PAGES,
      activityLogs: INITIAL_ACTIVITY_LOGS,
      scheduleEvents: INITIAL_SCHEDULE_EVENTS,
      lastSavedAt: new Date().toISOString(),
    };
  }
};

export const saveStudioState = (state: Omit<PersistedStudioState, 'lastSavedAt'>): void => {
  try {
    // Sanitize reels to avoid localStorage QuotaExceededError (strip in-memory File/Blob references)
    const sanitizedReels = (state.reels || []).map((r) => {
      const { videoFile, ...rest } = r;
      return rest;
    });

    const payload: PersistedStudioState = {
      ...state,
      reels: sanitizedReels as Reel[],
      lastSavedAt: new Date().toISOString(),
    };
    localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save ReelsBulkQuran state to localStorage:', err);
  }
};

export const clearStudioStorage = (): PersistedStudioState => {
  try {
    localStorage.removeItem(CURRENT_STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
  return {
    reels: INITIAL_REELS,
    batches: INITIAL_BATCHES,
    pages: INITIAL_FACEBOOK_PAGES,
    activityLogs: INITIAL_ACTIVITY_LOGS,
    scheduleEvents: INITIAL_SCHEDULE_EVENTS,
    lastSavedAt: new Date().toISOString(),
  };
};
