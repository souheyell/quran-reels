/**
 * Islamic Prayer Times Engine for Quran Reels Publishing
 * Computes accurate solar prayer times for major Islamic capitals and any custom coordinates,
 * tags scheduled drops with prayer slots (Fajr, Dhuhr, Asr, Maghrib, Isha, Tahajjud),
 * and generates multi-day prayer-paced release plans.
 */

export interface PrayerTimesResult {
  fajr: string;      // HH:mm
  sunrise: string;   // HH:mm
  dhuhr: string;     // HH:mm
  asr: string;       // HH:mm
  maghrib: string;   // HH:mm
  isha: string;      // HH:mm
  tahajjud: string;  // HH:mm
  dateStr: string;   // YYYY-MM-DD
  locationName: string;
}

export interface PrayerSlotInfo {
  name: 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Tahajjud' | 'Custom';
  arabicName: string;
  icon: string;
  timeStr: string;
  color: string;
  isHighEngagement: boolean;
}

export interface PrayerLocationPreset {
  id: string;
  name: string;
  arabicName: string;
  lat: number;
  lng: number;
  timezoneOffsetHours: number; // e.g. +3 for Mecca, +2 for Cairo
  fajrAngle: number;
  ishaAngle: number;
  label: string;
}

export const PRAYER_LOCATIONS: PrayerLocationPreset[] = [
  {
    id: 'mecca',
    name: 'Makkah Al-Mukarramah',
    arabicName: 'مكة المكرمة',
    lat: 21.4225,
    lng: 39.8262,
    timezoneOffsetHours: 3,
    fajrAngle: 18.5,
    ishaAngle: 19.0, // 90 min after Maghrib in Umm Al-Qura
    label: '🕋 Makkah Al-Mukarramah (Umm Al-Qura, UTC+3)',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    arabicName: 'القاهرة',
    lat: 30.0444,
    lng: 31.2357,
    timezoneOffsetHours: 2,
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    label: '🕌 Cairo (Egyptian General Authority, UTC+2)',
  },
  {
    id: 'riyadh',
    name: 'Riyadh',
    arabicName: 'الرياض',
    lat: 24.7136,
    lng: 46.6753,
    timezoneOffsetHours: 3,
    fajrAngle: 18.5,
    ishaAngle: 19.0,
    label: '🌴 Riyadh (Saudi Arabia, UTC+3)',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    arabicName: 'دبي',
    lat: 25.2048,
    lng: 55.2708,
    timezoneOffsetHours: 4,
    fajrAngle: 18.2,
    ishaAngle: 18.2,
    label: '🏙️ Dubai (Gulf Standard, UTC+4)',
  },
  {
    id: 'algiers',
    name: 'Algiers / Paris',
    arabicName: 'الجزائر / باريس',
    lat: 36.7538,
    lng: 3.0588,
    timezoneOffsetHours: 1,
    fajrAngle: 18.0,
    ishaAngle: 17.0,
    label: '🌍 Algiers / Paris (CET, UTC+1)',
  },
  {
    id: 'london',
    name: 'London',
    arabicName: 'لندن',
    lat: 51.5074,
    lng: -0.1278,
    timezoneOffsetHours: 0,
    fajrAngle: 18.0,
    ishaAngle: 18.0,
    label: '🇬🇧 London (GMT / BST, UTC+0)',
  },
  {
    id: 'newyork',
    name: 'New York',
    arabicName: 'نيويورك',
    lat: 40.7128,
    lng: -74.006,
    timezoneOffsetHours: -4,
    fajrAngle: 15.0,
    ishaAngle: 15.0,
    label: '🗽 New York (ISNA, UTC-4)',
  },
];

// Helper: Convert degrees to radians and back
const degToRad = (d: number) => (d * Math.PI) / 180.0;
const radToDeg = (r: number) => (r * 180.0) / Math.PI;

/**
 * Astronomical Prayer Times Calculator based on solar coordinates.
 * Accurately solves solar altitude angles for Fajr, Shuruq, Dhuhr, Asr (Standard Hanafi/Shafi'i),
 * Maghrib, and Isha.
 */
export function calculatePrayerTimes(
  date: Date,
  location: PrayerLocationPreset = PRAYER_LOCATIONS[0]
): PrayerTimesResult {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Julian day number calculation
  const julianDate =
    367 * year -
    Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) +
    Math.floor((275 * (month + 1)) / 9) +
    day -
    730531.5;

  // Solar coordinates
  const meanAnomaly = degToRad((357.529 + 0.98560028 * julianDate) % 360);
  const eclipticLongitude = degToRad(
    (280.459 +
      0.98564736 * julianDate +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) %
      360
  );
  const obliquity = degToRad(23.439 - 0.00000036 * julianDate);
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  // Equation of time in minutes
  const rightAscension =
    radToDeg(
      Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
    ) / 15.0;
  const solarMean = (280.459 + 0.98564736 * julianDate) / 15.0;
  const equationOfTime = (solarMean - rightAscension) * 60.0;

  // Solar noon in local standard time
  const solarNoonMinutes = 12 * 60 - location.lng * 4 - equationOfTime + location.timezoneOffsetHours * 60;

  // Hour angle helper for a given altitude angle alpha
  const calculateHourAngle = (alpha: number): number | null => {
    const latRad = degToRad(location.lat);
    const cosHA =
      (Math.sin(degToRad(alpha)) - Math.sin(latRad) * Math.sin(declination)) /
      (Math.cos(latRad) * Math.cos(declination));
    if (cosHA < -1 || cosHA > 1) return null;
    return (radToDeg(Math.acos(cosHA)) / 15.0) * 60.0; // returns minutes
  };

  // 1. Dhuhr (solar noon + slight margin)
  const dhuhrMinutes = solarNoonMinutes + 1;

  // 2. Sunrise & Sunset (alpha = -0.8333 degrees)
  const sunRiseSetHA = calculateHourAngle(-0.8333) ?? 360;
  const sunriseMinutes = solarNoonMinutes - sunRiseSetHA;
  const maghribMinutes = solarNoonMinutes + sunRiseSetHA + 2; // sunset + 2 mins

  // 3. Fajr (alpha = -fajrAngle degrees)
  const fajrHA = calculateHourAngle(-location.fajrAngle) ?? sunRiseSetHA + 90;
  const fajrMinutes = solarNoonMinutes - fajrHA;

  // 4. Asr (shadow = object length + shadow at noon)
  const latRad = degToRad(location.lat);
  const minShadow = Math.tan(Math.abs(latRad - declination));
  const asrAltitude = radToDeg(Math.atan(1.0 / (1.0 + minShadow)));
  const asrHA = calculateHourAngle(asrAltitude) ?? 180;
  const asrMinutes = solarNoonMinutes + asrHA;

  // 5. Isha
  let ishaMinutes: number;
  if (location.id === 'mecca' || location.id === 'riyadh') {
    // Umm Al-Qura: fixed 90 mins after Maghrib (120 mins during Ramadan)
    ishaMinutes = maghribMinutes + 90;
  } else {
    const ishaHA = calculateHourAngle(-location.ishaAngle) ?? sunRiseSetHA + 80;
    ishaMinutes = solarNoonMinutes + ishaHA;
  }

  // 6. Tahajjud: Middle of last third of the night (between Maghrib and next day's Fajr)
  const nightDurationMinutes = 24 * 60 - maghribMinutes + fajrMinutes;
  const tahajjudMinutes = ((maghribMinutes + (nightDurationMinutes * 5) / 6) % (24 * 60));

  const formatMins = (totalMinutes: number): string => {
    let normalized = Math.round(totalMinutes) % (24 * 60);
    if (normalized < 0) normalized += 24 * 60;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return {
    fajr: formatMins(fajrMinutes),
    sunrise: formatMins(sunriseMinutes),
    dhuhr: formatMins(dhuhrMinutes),
    asr: formatMins(asrMinutes),
    maghrib: formatMins(maghribMinutes),
    isha: formatMins(ishaMinutes),
    tahajjud: formatMins(tahajjudMinutes),
    dateStr: `${year}-${monthStr}-${dayStr}`,
    locationName: location.name,
  };
}

/**
 * Maps any time string (HH:mm) to the closest prayer window.
 */
export function getPrayerSlot(
  timeStr: string,
  prayerTimes?: PrayerTimesResult
): PrayerSlotInfo {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) {
    return {
      name: 'Custom',
      arabicName: 'مخصص',
      icon: '⏱️',
      timeStr,
      color: 'text-on-surface-variant bg-white/5 border-white/10',
      isHighEngagement: false,
    };
  }

  const currentMins = h * 60 + (m || 0);

  // If specific prayer times for the day are provided, compare with true solar times:
  if (prayerTimes) {
    const parseM = (s: string) => {
      const [ph, pm] = s.split(':').map(Number);
      return ph * 60 + (pm || 0);
    };

    const prayers = [
      {
        name: 'Tahajjud' as const,
        arabicName: 'قيام الليل',
        icon: '✨',
        mins: parseM(prayerTimes.tahajjud),
        color: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
        isHighEngagement: true,
      },
      {
        name: 'Fajr' as const,
        arabicName: 'الفجر',
        icon: '🌅',
        mins: parseM(prayerTimes.fajr),
        color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
        isHighEngagement: true,
      },
      {
        name: 'Sunrise' as const,
        arabicName: 'الشروق',
        icon: '🌄',
        mins: parseM(prayerTimes.sunrise),
        color: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30',
        isHighEngagement: false,
      },
      {
        name: 'Dhuhr' as const,
        arabicName: 'الظهر',
        icon: '☀️',
        mins: parseM(prayerTimes.dhuhr),
        color: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
        isHighEngagement: true,
      },
      {
        name: 'Asr' as const,
        arabicName: 'العصر',
        icon: '🌤️',
        mins: parseM(prayerTimes.asr),
        color: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
        isHighEngagement: true,
      },
      {
        name: 'Maghrib' as const,
        arabicName: 'المغرب',
        icon: '🌇',
        mins: parseM(prayerTimes.maghrib),
        color: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
        isHighEngagement: true,
      },
      {
        name: 'Isha' as const,
        arabicName: 'العشاء',
        icon: '🌙',
        mins: parseM(prayerTimes.isha),
        color: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30',
        isHighEngagement: true,
      },
    ];

    // Find prayer with smallest distance (within +/- 90 minutes)
    let closest = prayers[0];
    let minDiff = 9999;
    for (const p of prayers) {
      const diff = Math.abs(currentMins - p.mins);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    if (minDiff <= 100) {
      return {
        name: closest.name,
        arabicName: closest.arabicName,
        icon: closest.icon,
        timeStr,
        color: closest.color,
        isHighEngagement: closest.isHighEngagement,
      };
    }
  }

  // Fallback heuristic based on typical Islamic solar windows:
  if (currentMins >= 4 * 60 && currentMins < 7 * 60) {
    return {
      name: 'Fajr',
      arabicName: 'الفجر',
      icon: '🌅',
      timeStr,
      color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
      isHighEngagement: true,
    };
  }
  if (currentMins >= 11 * 60 + 30 && currentMins < 14 * 60 + 30) {
    return {
      name: 'Dhuhr',
      arabicName: 'الظهر',
      icon: '☀️',
      timeStr,
      color: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
      isHighEngagement: true,
    };
  }
  if (currentMins >= 15 * 60 && currentMins < 17 * 60 + 30) {
    return {
      name: 'Asr',
      arabicName: 'العصر',
      icon: '🌤️',
      timeStr,
      color: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
      isHighEngagement: true,
    };
  }
  if (currentMins >= 17 * 60 + 30 && currentMins < 19 * 60 + 30) {
    return {
      name: 'Maghrib',
      arabicName: 'المغرب',
      icon: '🌇',
      timeStr,
      color: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
      isHighEngagement: true,
    };
  }
  if (currentMins >= 19 * 60 + 30 && currentMins < 23 * 60 + 30) {
    return {
      name: 'Isha',
      arabicName: 'العشاء',
      icon: '🌙',
      timeStr,
      color: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30',
      isHighEngagement: true,
    };
  }
  if (currentMins >= 2 * 60 && currentMins < 4 * 60) {
    return {
      name: 'Tahajjud',
      arabicName: 'قيام الليل',
      icon: '✨',
      timeStr,
      color: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
      isHighEngagement: true,
    };
  }

  return {
    name: 'Custom',
    arabicName: 'مخصص',
    icon: '⏱️',
    timeStr,
    color: 'text-on-surface-variant bg-white/5 border-white/10',
    isHighEngagement: false,
  };
}

export type PrayerPacingType = 'all_prayers' | 'peak_three' | 'daily_maghrib' | 'fajr_isha';

/**
 * Generates an accurate multi-day sequence of Date objects matching real prayer times
 * for bulk scheduling Quran reels.
 */
export function generatePrayerSequence(
  reelCount: number,
  startDate: Date,
  pacingType: PrayerPacingType = 'all_prayers',
  location: PrayerLocationPreset = PRAYER_LOCATIONS[0]
): Date[] {
  const resultMoments: Date[] = [];
  const minFutureTime = Date.now() + 12 * 60 * 1000; // minimum 12 mins from now for Meta safety

  // Define prayer slot order based on selected pacing strategy
  let targetSlots: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[];
  switch (pacingType) {
    case 'peak_three':
      targetSlots = ['fajr', 'maghrib', 'isha']; // Maximum viewer engagement
      break;
    case 'daily_maghrib':
      targetSlots = ['maghrib']; // 1 drop per day at sunset
      break;
    case 'fajr_isha':
      targetSlots = ['fajr', 'isha']; // Morning & Evening remembrance
      break;
    case 'all_prayers':
    default:
      targetSlots = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      break;
  }

  let currentDayOffset = 0;
  const baseDay = new Date(startDate);

  while (resultMoments.length < reelCount && currentDayOffset < 90) {
    const dayDate = new Date(baseDay);
    dayDate.setDate(baseDay.getDate() + currentDayOffset);

    const prayerTimes = calculatePrayerTimes(dayDate, location);

    for (const slot of targetSlots) {
      if (resultMoments.length >= reelCount) break;

      const timeStr = prayerTimes[slot];
      const [h, m] = timeStr.split(':').map(Number);

      const candidate = new Date(dayDate);
      candidate.setHours(h, m, 0, 0);

      // Only schedule if candidate is in the future (at least minFutureTime)
      if (candidate.getTime() >= minFutureTime) {
        resultMoments.push(candidate);
      }
    }

    currentDayOffset++;
  }

  // In the improbable edge case that no slots were future-safe, push future-paced slots
  while (resultMoments.length < reelCount) {
    const fallback = new Date(Date.now() + (resultMoments.length + 1) * 3 * 3600 * 1000);
    resultMoments.push(fallback);
  }

  return resultMoments;
}
