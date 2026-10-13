/**
 * Notification service for Android & Web
 * Dispatches prayer time scheduled publishing reminders and batch completion alerts.
 */

export interface PrayerReminderConfig {
  prayerName: string;
  timeStr: string;
  surahName?: string;
  reelCount?: number;
}

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};

export const hasNotificationPermission = (): boolean => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
};

export const sendLocalNotification = (
  title: string,
  options?: NotificationOptions
): boolean => {
  if (!hasNotificationPermission()) return false;

  try {
    const defaultIcon = '/favicon.svg';
    new Notification(title, {
      icon: defaultIcon,
      badge: defaultIcon,
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
    return false;
  }
};

export const notifyPrayerReelPublished = (
  prayerName: string,
  surahName: string,
  platforms: string[]
): void => {
  const platformStr = platforms.map((p) => p.toUpperCase()).join(' & ');
  sendLocalNotification(`🕌 Reel Published at ${prayerName}`, {
    body: `Surah ${surahName} was dispatched to ${platformStr || 'your channels'}!`,
  });
};

export const notifyBatchComplete = (
  batchName: string,
  totalReels: number,
  durationSecs?: number
): void => {
  const durStr = durationSecs ? ` (${durationSecs}s total duration)` : '';
  sendLocalNotification(`🎬 Batch Render Complete!`, {
    body: `Successfully generated ${totalReels} reels for "${batchName}"${durStr}. Ready for review and scheduling.`,
  });
};
