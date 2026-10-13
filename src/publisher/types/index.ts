export type ReelStatus = 
  | 'READY' 
  | 'VALIDATING' 
  | 'PROCESSING' 
  | 'UPLOADING' 
  | 'PUBLISHING' 
  | 'PUBLISHED' 
  | 'FAILED' 
  | 'SCHEDULED';

export interface Reel {
  id: string;
  filename: string;
  title: string;
  surahNumber: number;
  surahName: string;
  ayahRange: string;
  reciterName: string;
  durationSeconds: number;
  resolution: string; // e.g. "1080x1920"
  fps: number; // e.g. 60
  codec: string; // e.g. "H.264 (MP4)"
  fileSizeMb: number;
  status: ReelStatus;
  uploadProgress: number; // 0 to 100
  captionArabic: string;
  captionEnglish: string;
  description?: string;
  hashtags: string[];
  targetPageIds: string[];
  targetPlatforms?: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[];
  scheduledTime?: string; // ISO or date string
  batchId?: string;
  batchName?: string;
  audioLufs: number; // e.g. -14.2
  audioNormalized: boolean;
  videoValid: boolean;
  resolutionValid: boolean;
  durationValid: boolean;
  errorMessage?: string;
  errorReason?: string;
  errorSolution?: string;
  thumbnailGradient?: string;
  bgImageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  videoFile?: File | Blob;
  isUploadedToCloud?: boolean;
  metaVideoId?: string;
  youtubeVideoId?: string;
  insights?: ReelInsights;
  createdAt: string;
  publishedAt?: string;
}

export interface ReelInsights {
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchTimeSeconds: number;
  completionRate: number; // 0 to 100 %
  retentionGraph?: number[]; // percentage points [100, 92, 85, ...]
  lastSyncedAt: string;
}

export type BatchStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Batch {
  id: string;
  name: string;
  targetPageIds: string[];
  totalReels: number;
  publishedCount: number;
  queuedCount: number;
  uploadingCount: number;
  failedCount: number;
  scheduledCount: number;
  progressPercent: number;
  status: BatchStatus;
  createdAt: string;
  estimatedRemainingMins: number;
}

export type PageStatus = 'CONNECTED' | 'TOKEN_WARNING' | 'DISCONNECTED';

export interface FacebookPage {
  id: string;
  name: string;
  handle: string;
  category: string;
  followersCount: number;
  avatarUrl: string;
  status: PageStatus;
  tokenExpiryDays: number;
  queuedCount: number;
  publishedTodayCount: number;
  totalPublished: number;
  hasPermissions: boolean;
  accessToken?: string;
  pageNumericId?: string;
  instagramBusinessAccount?: {
    id: string;
    username: string;
    name?: string;
    profilePic?: string;
  };
}

export interface TikTokAccount {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  accessToken?: string;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED';
}

export interface YouTubeChannel {
  id: string;
  title: string;
  customUrl?: string;
  subscriberCount?: number;
  avatarUrl?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  accessToken?: string;
  privacyDefault: 'public' | 'unlisted' | 'private';
}

export type ActivityType = 'PUBLISHED' | 'UPLOADING' | 'SCHEDULED' | 'FAILED' | 'VALIDATED';

export interface ActivityLog {
  id: string;
  reelId: string;
  reelTitle: string;
  surahName: string;
  pageName: string;
  platform?: 'facebook' | 'instagram' | 'tiktok' | 'youtube';
  actionType: ActivityType;
  timestamp: string;
  progress?: number;
  message?: string;
  isError?: boolean;
}

export interface ScheduleEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  reelId: string;
  reelTitle: string;
  surahName: string;
  pageId: string;
  pageName: string;
}

export type ActiveNavTab = 
  | 'dashboard' 
  | 'upload' 
  | 'queue' 
  | 'batches' 
  | 'schedule' 
  | 'history' 
  | 'pages' 
  | 'settings'
  | 'exports';
