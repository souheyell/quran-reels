/**
 * Screen WakeLock Utility for Android & Mobile Web
 * Prevents device screen from turning off and CPU from throttling during
 * hardware-accelerated video rendering and batch exports.
 */

let wakeLockSentinel: WakeLockSentinel | null = null;
let isAcquiring = false;

export const acquireWakeLock = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  if (wakeLockSentinel !== null && !wakeLockSentinel.released) {
    return true;
  }

  if (isAcquiring) return false;

  try {
    isAcquiring = true;
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });

    return true;
  } catch (err) {
    console.warn('Screen WakeLock could not be acquired:', err);
    return false;
  } finally {
    isAcquiring = false;
  }
};

export const releaseWakeLock = async (): Promise<void> => {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
};

export const isWakeLockActive = (): boolean => {
  return wakeLockSentinel !== null && !wakeLockSentinel.released;
};
