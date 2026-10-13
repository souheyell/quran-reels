import type { Reel, FacebookPage, Batch, ActivityLog, ScheduleEvent } from '../types';

export const USER_META_CONFIG = {
  appId: (import.meta.env?.VITE_META_APP_ID as string) || 'YOUR_META_APP_ID',
  userAccessToken: (import.meta.env?.VITE_META_USER_ACCESS_TOKEN as string) || '',
};

export const INITIAL_FACEBOOK_PAGES: FacebookPage[] = [
  {
    id: 'fb-page-109823471829301',
    name: 'Noor Al-Quran - نُور القُرآن',
    handle: '@noor_alquran_reels',
    category: 'Religious Organization',
    followersCount: 142500,
    avatarUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 12,
    publishedTodayCount: 3,
    totalPublished: 184,
    hasPermissions: true,
    pageNumericId: '109823471829301',
    accessToken: (import.meta.env?.VITE_FB_PAGE_ACCESS_TOKEN as string) || '',
    instagramBusinessAccount: {
      id: '17841459201948210',
      username: 'noor_alquran_official',
      name: 'نور القرآن الكريم',
      profilePic: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'fb-page-204859182746193',
    name: 'Ayat & Dhikr - آيات وذكر',
    handle: '@ayat_dhikr',
    category: 'Media/News Company',
    followersCount: 89300,
    avatarUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 58,
    queuedCount: 8,
    publishedTodayCount: 2,
    totalPublished: 96,
    hasPermissions: true,
    pageNumericId: '204859182746193',
    accessToken: '',
    instagramBusinessAccount: {
      id: '17841483920184719',
      username: 'ayat_wa_dhikr',
      name: 'آيات قرآنية وأذكار',
      profilePic: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'fb-page-305928174829104',
    name: 'Quran Daily Reminders',
    handle: '@quran_daily_reminders',
    category: 'Community',
    followersCount: 45200,
    avatarUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 4,
    publishedTodayCount: 1,
    totalPublished: 42,
    hasPermissions: true,
    pageNumericId: '305928174829104',
    accessToken: '',
    instagramBusinessAccount: {
      id: '17841492018374920',
      username: 'quran_daily_reminders',
      name: 'Quran Daily Official',
      profilePic: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'fb-page-409182736192830',
    name: 'Islamic Media Network',
    handle: '@islamic_media_net',
    category: 'Educational',
    followersCount: 26950,
    avatarUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 45,
    queuedCount: 2,
    publishedTodayCount: 0,
    totalPublished: 28,
    hasPermissions: true,
    pageNumericId: '409182736192830',
    accessToken: '',
  },
];

export const INITIAL_BATCHES: Batch[] = [];

export const INITIAL_REELS: Reel[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-meta-live-1',
    reelId: 'init',
    reelTitle: 'Studio Initialized',
    surahName: 'System',
    pageName: 'Noor Al-Quran - نُور القُرآن',
    actionType: 'VALIDATED',
    timestamp: 'Just now',
    message: 'Islamic Reels Bulk Publisher Studio initialized and ready for video scheduling & publishing.',
    isError: false,
  }
];

export const INITIAL_SCHEDULE_EVENTS: ScheduleEvent[] = [];
