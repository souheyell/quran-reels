import type { Reel, FacebookPage, Batch, ActivityLog, ScheduleEvent } from '../types';

export const USER_META_CONFIG = {
  appId: (import.meta.env?.VITE_META_APP_ID as string) || 'YOUR_META_APP_ID',
  userAccessToken: (import.meta.env?.VITE_META_USER_ACCESS_TOKEN as string) || '',
};

export const INITIAL_FACEBOOK_PAGES: FacebookPage[] = [
  {
    id: 'fb-page-1217144761490127',
    name: 'أَجْر - Ajr',
    handle: '@ajr_quran_reels',
    category: 'Digital creator',
    followersCount: 266,
    avatarUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 0,
    publishedTodayCount: 0,
    totalPublished: 0,
    hasPermissions: true,
    pageNumericId: '1217144761490127',
    accessToken: (import.meta.env?.VITE_FB_PAGE_ACCESS_TOKEN as string) || '',
    instagramBusinessAccount: {
      id: '17841439914332970',
      username: 'ajr4_all',
      name: 'اجر لمسلم بعد مماته',
      profilePic: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'fb-page-2052583428138227',
    name: 'Boumardessna - بومرداسنا',
    handle: '@boumardessna',
    category: 'Community',
    followersCount: 9651,
    avatarUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 0,
    publishedTodayCount: 0,
    totalPublished: 0,
    hasPermissions: true,
    pageNumericId: '2052583428138227',
    accessToken: '',
    instagramBusinessAccount: {
      id: '17841413689696358',
      username: 'boumardessna',
      name: 'Boumardess',
      profilePic: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'fb-page-107936718096823',
    name: 'Reels Daily',
    handle: '@reels_daily',
    category: 'Personal blog',
    followersCount: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 0,
    publishedTodayCount: 0,
    totalPublished: 0,
    hasPermissions: true,
    pageNumericId: '107936718096823',
    accessToken: '',
  },
  {
    id: 'fb-page-743950389140947',
    name: 'Islamic Media Network',
    handle: '@islamic_media',
    category: 'Interest',
    followersCount: 2695,
    avatarUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=150&auto=format&fit=crop&q=80',
    status: 'CONNECTED',
    tokenExpiryDays: 60,
    queuedCount: 0,
    publishedTodayCount: 0,
    totalPublished: 0,
    hasPermissions: true,
    pageNumericId: '743950389140947',
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
    pageName: 'أجر - Ajr',
    actionType: 'VALIDATED',
    timestamp: 'Just now',
    message: 'Islamic Reels Bulk Publisher Studio initialized and ready for video scheduling & publishing.',
    isError: false,
  }
];

export const INITIAL_SCHEDULE_EVENTS: ScheduleEvent[] = [];
