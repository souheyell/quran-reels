import { describe, it, expect } from 'vitest';
import { 
  calculatePrayerTimes, 
  getPrayerSlot, 
  generatePrayerSequence, 
  PRAYER_LOCATIONS 
} from '../services/prayerTimes';
import { 
  formatLocalDate, 
  formatLocalTime, 
  parseLocalDateAndTime, 
  formatDisplayDate 
} from '../utils/dateUtils';

describe('Publishing Calendar - Date & Time Accuracy', () => {
  it('formats local date strictly without UTC day skew', () => {
    // Construct a specific date
    const d = new Date(2026, 9, 15, 23, 45, 0); // Oct 15, 2026 at 23:45 local
    expect(formatLocalDate(d)).toBe('2026-10-15');
    expect(formatLocalTime(d)).toBe('23:45');
  });

  it('correctly roundtrips parseLocalDateAndTime', () => {
    const parsed = parseLocalDateAndTime('2026-10-18', '05:30');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed October
    expect(parsed.getDate()).toBe(18);
    expect(parsed.getHours()).toBe(5);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('formats display date human-readably', () => {
    const todayStr = formatLocalDate(new Date());
    expect(formatDisplayDate(todayStr)).toBe('Today');
  });
});

describe('Publishing Calendar - Islamic Prayer Times Engine', () => {
  it('calculates accurate prayer times for Makkah Al-Mukarramah', () => {
    const testDate = new Date(2026, 9, 15);
    const makkah = PRAYER_LOCATIONS.find((l) => l.id === 'mecca')!;
    const times = calculatePrayerTimes(testDate, makkah);

    expect(times.fajr).toMatch(/^\d{2}:\d{2}$/);
    expect(times.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(times.dhuhr).toMatch(/^\d{2}:\d{2}$/);
    expect(times.asr).toMatch(/^\d{2}:\d{2}$/);
    expect(times.maghrib).toMatch(/^\d{2}:\d{2}$/);
    expect(times.isha).toMatch(/^\d{2}:\d{2}$/);
    expect(times.locationName).toBe('Makkah Al-Mukarramah');

    // Solar chronology verification: Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha
    const toMins = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };

    expect(toMins(times.fajr)).toBeLessThan(toMins(times.sunrise));
    expect(toMins(times.sunrise)).toBeLessThan(toMins(times.dhuhr));
    expect(toMins(times.dhuhr)).toBeLessThan(toMins(times.asr));
    expect(toMins(times.asr)).toBeLessThan(toMins(times.maghrib));
    expect(toMins(times.maghrib)).toBeLessThan(toMins(times.isha));
  });

  it('tags time strings with their accurate prayer slot', () => {
    const slotFajr = getPrayerSlot('05:15');
    expect(slotFajr.name).toBe('Fajr');
    expect(slotFajr.icon).toBe('🌅');

    const slotDhuhr = getPrayerSlot('12:30');
    expect(slotDhuhr.name).toBe('Dhuhr');

    const slotAsr = getPrayerSlot('15:45');
    expect(slotAsr.name).toBe('Asr');

    const slotMaghrib = getPrayerSlot('18:15');
    expect(slotMaghrib.name).toBe('Maghrib');

    const slotIsha = getPrayerSlot('20:00');
    expect(slotIsha.name).toBe('Isha');
  });

  it('generates a multi-day sequence of upcoming prayer moments for bulk publishing', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const sequence = generatePrayerSequence(5, tomorrow, 'all_prayers');
    expect(sequence).toHaveLength(5);

    // Each subsequent moment must be chronologically after the previous one
    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i].getTime()).toBeGreaterThan(sequence[i - 1].getTime());
    }
  });

  it('generates peak three prayers (Fajr, Maghrib, Isha) correctly', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const sequence = generatePrayerSequence(3, tomorrow, 'peak_three');
    expect(sequence).toHaveLength(3);
    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i].getTime()).toBeGreaterThan(sequence[i - 1].getTime());
    }
  });
});
