export interface BulkItem {
  id: string
  title: string
  surah: number
  startAyat: number
  count: number
  theme?: string
  reciterId?: string
}

export interface BulkPackPreset {
  id: string
  title: string
  arabicTitle: string
  description: string
  icon: string
  items: BulkItem[]
}

// 114 Surahs reference table
export const SURAHS_INDEX: Array<{ number: number; name: string; englishName: string; totalAyahs: number }> = [
  { number: 1, name: 'الفاتحة', englishName: 'Al-Fatiha', totalAyahs: 7 },
  { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', totalAyahs: 286 },
  { number: 3, name: 'آل عمران', englishName: 'Ali \'Imran', totalAyahs: 200 },
  { number: 4, name: 'النساء', englishName: 'An-Nisa', totalAyahs: 176 },
  { number: 5, name: 'المائدة', englishName: 'Al-Ma\'idah', totalAyahs: 120 },
  { number: 6, name: 'الأنعام', englishName: 'Al-An\'am', totalAyahs: 165 },
  { number: 7, name: 'الأعراف', englishName: 'Al-A\'raf', totalAyahs: 206 },
  { number: 8, name: 'الأنفال', englishName: 'Al-Anfal', totalAyahs: 75 },
  { number: 9, name: 'التوبة', englishName: 'At-Tawbah', totalAyahs: 129 },
  { number: 10, name: 'يونس', englishName: 'Yunus', totalAyahs: 109 },
  { number: 11, name: 'هود', englishName: 'Hud', totalAyahs: 123 },
  { number: 12, name: 'يوسف', englishName: 'Yusuf', totalAyahs: 111 },
  { number: 13, name: 'الرعد', englishName: 'Ar-Ra\'d', totalAyahs: 43 },
  { number: 14, name: 'إبراهيم', englishName: 'Ibrahim', totalAyahs: 52 },
  { number: 15, name: 'الحجر', englishName: 'Al-Hijr', totalAyahs: 99 },
  { number: 16, name: 'النحل', englishName: 'An-Nahl', totalAyahs: 128 },
  { number: 17, name: 'الإسراء', englishName: 'Al-Isra', totalAyahs: 111 },
  { number: 18, name: 'الكهف', englishName: 'Al-Kahf', totalAyahs: 110 },
  { number: 19, name: 'مريم', englishName: 'Maryam', totalAyahs: 98 },
  { number: 20, name: 'طه', englishName: 'Ta-Ha', totalAyahs: 135 },
  { number: 21, name: 'الأنبياء', englishName: 'Al-Anbiya', totalAyahs: 112 },
  { number: 22, name: 'الحج', englishName: 'Al-Hajj', totalAyahs: 78 },
  { number: 23, name: 'المؤمنون', englishName: 'Al-Mu\'minun', totalAyahs: 118 },
  { number: 24, name: 'النور', englishName: 'An-Nur', totalAyahs: 64 },
  { number: 25, name: 'الفرقان', englishName: 'Al-Furqan', totalAyahs: 77 },
  { number: 26, name: 'الشعراء', englishName: 'Ash-Shu\'ara', totalAyahs: 227 },
  { number: 27, name: 'النمل', englishName: 'An-Naml', totalAyahs: 93 },
  { number: 28, name: 'القصص', englishName: 'Al-Qasas', totalAyahs: 88 },
  { number: 29, name: 'العنكبوت', englishName: 'Al-\'Ankabut', totalAyahs: 69 },
  { number: 30, name: 'الروم', englishName: 'Ar-Rum', totalAyahs: 60 },
  { number: 31, name: 'لقمان', englishName: 'Luqman', totalAyahs: 34 },
  { number: 32, name: 'السجدة', englishName: 'As-Sajdah', totalAyahs: 30 },
  { number: 33, name: 'الأحزاب', englishName: 'Al-Ahzab', totalAyahs: 73 },
  { number: 34, name: 'سبأ', englishName: 'Saba', totalAyahs: 54 },
  { number: 35, name: 'فاطر', englishName: 'Fatir', totalAyahs: 45 },
  { number: 36, name: 'يس', englishName: 'Ya-Sin', totalAyahs: 83 },
  { number: 37, name: 'الصافات', englishName: 'As-Saffat', totalAyahs: 182 },
  { number: 38, name: 'ص', englishName: 'Sad', totalAyahs: 88 },
  { number: 39, name: 'الزمر', englishName: 'Az-Zumar', totalAyahs: 75 },
  { number: 40, name: 'غافر', englishName: 'Ghafir', totalAyahs: 85 },
  { number: 41, name: 'فصلت', englishName: 'Fussilat', totalAyahs: 54 },
  { number: 42, name: 'الشورى', englishName: 'Ash-Shura', totalAyahs: 53 },
  { number: 43, name: 'الزخرف', englishName: 'Az-Zukhruf', totalAyahs: 89 },
  { number: 44, name: 'الدخان', englishName: 'Ad-Dukhan', totalAyahs: 59 },
  { number: 45, name: 'الجاثية', englishName: 'Al-Jathiyah', totalAyahs: 37 },
  { number: 46, name: 'الأحقاف', englishName: 'Al-Ahqaf', totalAyahs: 35 },
  { number: 47, name: 'محمد', englishName: 'Muhammad', totalAyahs: 38 },
  { number: 48, name: 'الفتح', englishName: 'Al-Fath', totalAyahs: 29 },
  { number: 49, name: 'الحجرات', englishName: 'Al-Hujurat', totalAyahs: 18 },
  { number: 50, name: 'ق', englishName: 'Qaf', totalAyahs: 45 },
  { number: 51, name: 'الذاريات', englishName: 'Adh-Dhariyat', totalAyahs: 60 },
  { number: 52, name: 'الطور', englishName: 'At-Tur', totalAyahs: 49 },
  { number: 53, name: 'النجم', englishName: 'An-Najm', totalAyahs: 62 },
  { number: 54, name: 'القمر', englishName: 'Al-Qamar', totalAyahs: 55 },
  { number: 55, name: 'الرحمن', englishName: 'Ar-Rahman', totalAyahs: 78 },
  { number: 56, name: 'الواقعة', englishName: 'Al-Waqi\'ah', totalAyahs: 96 },
  { number: 57, name: 'الحديد', englishName: 'Al-Hadid', totalAyahs: 29 },
  { number: 58, name: 'المجادلة', englishName: 'Al-Mujadila', totalAyahs: 22 },
  { number: 59, name: 'الحشر', englishName: 'Al-Hashr', totalAyahs: 24 },
  { number: 60, name: 'الممتحنة', englishName: 'Al-Mumtahanah', totalAyahs: 13 },
  { number: 61, name: 'الصف', englishName: 'As-Saff', totalAyahs: 14 },
  { number: 62, name: 'الجمعة', englishName: 'Al-Jumu\'ah', totalAyahs: 11 },
  { number: 63, name: 'المنافقون', englishName: 'Al-Munafiqun', totalAyahs: 11 },
  { number: 64, name: 'التغابن', englishName: 'At-Taghabun', totalAyahs: 18 },
  { number: 65, name: 'الطلاق', englishName: 'At-Talaq', totalAyahs: 12 },
  { number: 66, name: 'التحريم', englishName: 'At-Tahrim', totalAyahs: 12 },
  { number: 67, name: 'الملك', englishName: 'Al-Mulk', totalAyahs: 30 },
  { number: 68, name: 'القلم', englishName: 'Al-Qalam', totalAyahs: 52 },
  { number: 69, name: 'الحاقة', englishName: 'Al-Haqqah', totalAyahs: 52 },
  { number: 70, name: 'المعارج', englishName: 'Al-Ma\'arij', totalAyahs: 44 },
  { number: 71, name: 'نوح', englishName: 'Nuh', totalAyahs: 28 },
  { number: 72, name: 'الجن', englishName: 'Al-Jinn', totalAyahs: 28 },
  { number: 73, name: 'المزمل', englishName: 'Al-Muzzammil', totalAyahs: 20 },
  { number: 74, name: 'المدثر', englishName: 'Al-Muddaththir', totalAyahs: 56 },
  { number: 75, name: 'القيامة', englishName: 'Al-Qiyamah', totalAyahs: 40 },
  { number: 76, name: 'الإنسان', englishName: 'Al-Insan', totalAyahs: 31 },
  { number: 77, name: 'المرسلات', englishName: 'Al-Mursalat', totalAyahs: 50 },
  { number: 78, name: 'النبأ', englishName: 'An-Naba', totalAyahs: 40 },
  { number: 79, name: 'النازعات', englishName: 'An-Nazi\'at', totalAyahs: 46 },
  { number: 80, name: 'عبس', englishName: '\'Abasa', totalAyahs: 42 },
  { number: 81, name: 'التكوير', englishName: 'At-Takwir', totalAyahs: 29 },
  { number: 82, name: 'الانفطار', englishName: 'Al-Infitar', totalAyahs: 19 },
  { number: 83, name: 'المطففين', englishName: 'Al-Mutaffifin', totalAyahs: 36 },
  { number: 84, name: 'الانشقاق', englishName: 'Al-Inshiqaq', totalAyahs: 25 },
  { number: 85, name: 'البروج', englishName: 'Al-Buruj', totalAyahs: 22 },
  { number: 86, name: 'الطارق', englishName: 'At-Tariq', totalAyahs: 17 },
  { number: 87, name: 'الأعلى', englishName: 'Al-A\'la', totalAyahs: 19 },
  { number: 88, name: 'الغاشية', englishName: 'Al-Ghashiyah', totalAyahs: 26 },
  { number: 89, name: 'الفجر', englishName: 'Al-Fajr', totalAyahs: 30 },
  { number: 90, name: 'البلد', englishName: 'Al-Balad', totalAyahs: 20 },
  { number: 91, name: 'الشمس', englishName: 'Ash-Shams', totalAyahs: 15 },
  { number: 92, name: 'الليل', englishName: 'Al-Layl', totalAyahs: 21 },
  { number: 93, name: 'الضحى', englishName: 'Ad-Duha', totalAyahs: 11 },
  { number: 94, name: 'الشرح', englishName: 'Ash-Sharh', totalAyahs: 8 },
  { number: 95, name: 'التين', englishName: 'At-Tin', totalAyahs: 8 },
  { number: 96, name: 'العلق', englishName: 'Al-\'Alaq', totalAyahs: 19 },
  { number: 97, name: 'القدر', englishName: 'Al-Qadr', totalAyahs: 5 },
  { number: 98, name: 'البينة', englishName: 'Al-Bayyinah', totalAyahs: 8 },
  { number: 99, name: 'الزلزلة', englishName: 'Az-Zalzalah', totalAyahs: 8 },
  { number: 100, name: 'العاديات', englishName: 'Al-\'Adiyat', totalAyahs: 11 },
  { number: 101, name: 'القارعة', englishName: 'Al-Qari\'ah', totalAyahs: 11 },
  { number: 102, name: 'التكاثر', englishName: 'At-Takathur', totalAyahs: 8 },
  { number: 103, name: 'العصر', englishName: 'Al-\'Asr', totalAyahs: 3 },
  { number: 104, name: 'الهمزة', englishName: 'Al-Humazah', totalAyahs: 9 },
  { number: 105, name: 'الفيل', englishName: 'Al-Fil', totalAyahs: 5 },
  { number: 106, name: 'قريش', englishName: 'Quraysh', totalAyahs: 4 },
  { number: 107, name: 'الماعون', englishName: 'Al-Ma\'un', totalAyahs: 7 },
  { number: 108, name: 'الكوثر', englishName: 'Al-Kawthar', totalAyahs: 3 },
  { number: 109, name: 'الكافرون', englishName: 'Al-Kafirun', totalAyahs: 6 },
  { number: 110, name: 'النصر', englishName: 'An-Nasr', totalAyahs: 3 },
  { number: 111, name: 'المسد', englishName: 'Al-Masad', totalAyahs: 5 },
  { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', totalAyahs: 4 },
  { number: 113, name: 'الفلق', englishName: 'Al-Falaq', totalAyahs: 5 },
  { number: 114, name: 'الناس', englishName: 'An-Nas', totalAyahs: 6 },
]

/**
 * Split an entire Surah into a batch of consecutive reels.
 */
export function splitSurahIntoChunks(
  surahNumber: number,
  chunkSize: number,
  startFromAyat = 1,
  upToAyat?: number,
): BulkItem[] {
  const meta = SURAHS_INDEX.find((s) => s.number === surahNumber)
  const total = upToAyat || meta?.totalAyahs || 7
  const validChunk = Math.max(1, Math.min(chunkSize, 10))
  const items: BulkItem[] = []

  let currentStart = startFromAyat
  let partNumber = 1

  while (currentStart <= total) {
    const endAyat = Math.min(currentStart + validChunk - 1, total)
    const count = endAyat - currentStart + 1
    const surahName = meta?.englishName || `Surah ${surahNumber}`

    items.push({
      id: `surah-${surahNumber}-part-${partNumber}`,
      title: `${surahName} (${currentStart}${count > 1 ? `–${endAyat}` : ''})`,
      surah: surahNumber,
      startAyat: currentStart,
      count,
      theme: `Part ${partNumber}`,
    })

    currentStart = endAyat + 1
    partNumber++
  }

  return items
}

/**
 * Parse a user-provided freeform list of verses into BulkItem objects.
 * Examples supported:
 * "2:255, 3:18-19, 18:1-5, 55:13, 67:1-5, 94:1-8, 112:1-4"
 */
export function parseCustomVerseList(input: string): BulkItem[] {
  if (!input || !input.trim()) return []

  const tokens = input
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const items: BulkItem[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    // Regex matches formats: "2:255", "2:255-257", "18:1..5", "Surah 2:255"
    const match = token.match(/(?:(?:Surah|surah|s)\s*)?(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–.]+\s*(\d{1,3}))?/i)
    if (match) {
      const surah = parseInt(match[1], 10)
      const startAyat = parseInt(match[2], 10)
      const endAyat = match[3] ? parseInt(match[3], 10) : startAyat
      const count = Math.max(1, Math.min(endAyat - startAyat + 1, 30))

      if (surah >= 1 && surah <= 114 && startAyat >= 1) {
        const meta = SURAHS_INDEX.find((s) => s.number === surah)
        const name = meta?.englishName || `Surah ${surah}`
        items.push({
          id: `custom-item-${i + 1}`,
          title: `${name} ${surah}:${startAyat}${count > 1 ? `–${startAyat + count - 1}` : ''}`,
          surah,
          startAyat,
          count,
          theme: 'Custom Selection',
        })
      }
    }
  }

  return items
}

/**
 * Curated 30-Day Ramadan & Daily Islamic Reminders Pack (30 Reels)
 */
export const RAMADAN_30_DAYS_PACK: BulkPackPreset = {
  id: 'ramadan-30-days',
  title: '30-Day Islamic Daily Reminders',
  arabicTitle: 'حزمة الـ 30 يوماً للتذكير والتدبر',
  description: '30 curated high-impact Ayahs across the Quran for daily Ramadan & social media posting.',
  icon: '🌙',
  items: [
    { id: 'day-1', title: 'Day 1: The Opening Du\'a', surah: 1, startAyat: 1, count: 7, theme: 'Al-Fatiha' },
    { id: 'day-2', title: 'Day 2: Ayat al-Kursi', surah: 2, startAyat: 255, count: 1, theme: 'The Greatest Ayah' },
    { id: 'day-3', title: 'Day 3: Amanar-Rasool', surah: 2, startAyat: 285, count: 2, theme: 'Night Protection' },
    { id: 'day-4', title: 'Day 4: Supreme Sovereignty', surah: 3, startAyat: 26, count: 2, theme: 'Mulka Man Tasha\'' },
    { id: 'day-5', title: 'Day 5: Du\'a of the Believers', surah: 3, startAyat: 190, count: 3, theme: 'Reflection on Creation' },
    { id: 'day-6', title: 'Day 6: Divine Mercy', surah: 6, startAyat: 12, count: 1, theme: 'Allah is Merciful' },
    { id: 'day-7', title: 'Day 7: The Beautiful Names', surah: 7, startAyat: 180, count: 1, theme: 'Asma\'ul Husna' },
    { id: 'day-8', title: 'Day 8: Tawakkul in Allah', surah: 9, startAyat: 128, count: 2, theme: 'Hasbiyallahu' },
    { id: 'day-9', title: 'Day 9: Comforting the Heart', surah: 10, startAyat: 57, count: 2, theme: 'Healing in the Quran' },
    { id: 'day-10', title: 'Day 10: The Best of Stories', surah: 12, startAyat: 86, count: 2, theme: 'Patience of Ya\'qub' },
    { id: 'day-11', title: 'Day 11: Remembrance of Allah', surah: 13, startAyat: 28, count: 1, theme: 'Peace of Heart' },
    { id: 'day-12', title: 'Day 12: Ibrahim\'s Du\'a for Peace', surah: 14, startAyat: 40, count: 2, theme: 'Du\'a for Family' },
    { id: 'day-13', title: 'Day 13: Honor Your Parents', surah: 17, startAyat: 23, count: 2, theme: 'Birr al-Walidayn' },
    { id: 'day-14', title: 'Day 14: Cave Companions Du\'a', surah: 18, startAyat: 10, count: 1, theme: 'Rabbana Atina Rahmah' },
    { id: 'day-15', title: 'Day 15: Last 4 of Al-Kahf', surah: 18, startAyat: 107, count: 4, theme: 'Gardens of Firdaws' },
    { id: 'day-16', title: 'Day 16: Maryam & Zakariya', surah: 19, startAyat: 4, count: 2, theme: 'Never Despair in Du\'a' },
    { id: 'day-17', title: 'Day 17: Du\'a of Musa', surah: 20, startAyat: 25, count: 4, theme: 'Rabbi-shrahli Sadri' },
    { id: 'day-18', title: 'Day 18: Yunus\'s Prayer in the Whale', surah: 21, startAyat: 87, count: 2, theme: 'La Ilaha Illa Anta' },
    { id: 'day-19', title: 'Day 19: Light upon Light', surah: 24, startAyat: 35, count: 1, theme: 'Ayat An-Nur' },
    { id: 'day-20', title: 'Day 20: Servants of the Merciful', surah: 25, startAyat: 63, count: 3, theme: '\'Ibadur-Rahman' },
    { id: 'day-21', title: 'Day 21: Musa\'s Sincere Request', surah: 28, startAyat: 24, count: 1, theme: 'Rabbi Inni Lima Anzalta' },
    { id: 'day-22', title: 'Day 22: Forgiveness for All Sins', surah: 39, startAyat: 53, count: 2, theme: 'Do Not Despair' },
    { id: 'day-23', title: 'Day 23: Heart of the Quran', surah: 36, startAyat: 58, count: 1, theme: 'Salamun Qawlan' },
    { id: 'day-24', title: 'Day 24: Favours of the Lord', surah: 55, startAyat: 1, count: 13, theme: 'Ar-Rahman' },
    { id: 'day-25', title: 'Day 25: Closing of Al-Hashr', surah: 59, startAyat: 22, count: 3, theme: 'The Holy Names' },
    { id: 'day-26', title: 'Day 26: Protector in the Grave', surah: 67, startAyat: 1, count: 5, theme: 'Tabarakalladhi' },
    { id: 'day-27', title: 'Day 27: The Night of Decree', surah: 97, startAyat: 1, count: 5, theme: 'Laylatul Qadr' },
    { id: 'day-28', title: 'Day 28: Relief after Hardship', surah: 94, startAyat: 1, count: 8, theme: 'Ash-Sharh' },
    { id: 'day-29', title: 'Day 29: Absolute Oneness', surah: 112, startAyat: 1, count: 4, theme: 'Al-Ikhlas' },
    { id: 'day-30', title: 'Day 30: Morning Dawn & Refuge', surah: 113, startAyat: 1, count: 5, theme: 'Al-Falaq' },
  ],
}

/**
 * Thematic Packs: Duas, Sabr, Juz Amma
 */
export const THEMATIC_PACKS: BulkPackPreset[] = [
  {
    id: 'pack-duas',
    title: '10 Powerful Quranic Duas',
    arabicTitle: 'أدعية القرآن الكريم المستجابة',
    description: '10 timeless Quranic supplications starting with Rabbana & Rabbi for barakah, guidance, and forgiveness.',
    icon: '🤲',
    items: [
      { id: 'dua-1', title: 'Du\'a for Good in Both Worlds', surah: 2, startAyat: 201, count: 1, theme: 'Rabbana Atina Fid-Dunya' },
      { id: 'dua-2', title: 'Du\'a for Steadfastness', surah: 3, startAyat: 8, count: 1, theme: 'Rabbana La Tuzigh Quloobana' },
      { id: 'dua-3', title: 'Du\'a of Yunus in Distress', surah: 21, startAyat: 87, count: 1, theme: 'La Ilaha Illa Anta' },
      { id: 'dua-4', title: 'Du\'a of Musa for Good', surah: 28, startAyat: 24, count: 1, theme: 'Rabbi Inni Lima Anzalta' },
      { id: 'dua-5', title: 'Du\'a for Ease and Speech', surah: 20, startAyat: 25, count: 4, theme: 'Rabbi-shrahli Sadri' },
      { id: 'dua-6', title: 'Du\'a for Increase in Knowledge', surah: 20, startAyat: 114, count: 1, theme: 'Rabbi Zidni \'Ilma' },
      { id: 'dua-7', title: 'Du\'a for Righteous Family', surah: 25, startAyat: 74, count: 1, theme: 'Qurrata A\'yun' },
      { id: 'dua-8', title: 'Du\'a for Forgiveness of Parents', surah: 14, startAyat: 41, count: 1, theme: 'Rabbanaghfir Li Wa Liwalidayya' },
      { id: 'dua-9', title: 'Du\'a of Adam & Hawwa', surah: 7, startAyat: 23, count: 1, theme: 'Rabbana Zalamna Anfusana' },
      { id: 'dua-10', title: 'Du\'a for Patience & Victory', surah: 2, startAyat: 250, count: 1, theme: 'Rabbana Afrigh \'Alayna Sabran' },
    ],
  },
  {
    id: 'pack-sabr-hope',
    title: '10 Verses of Patience & Hope',
    arabicTitle: 'آيات الصبر والفرج والبشرى',
    description: '10 uplifting verses to strengthen the heart through trial, grief, and hardship.',
    icon: '🌿',
    items: [
      { id: 'sabr-1', title: 'With Hardship comes Ease', surah: 94, startAyat: 5, count: 2, theme: 'Ash-Sharh' },
      { id: 'sabr-2', title: 'Allah is with the Patient', surah: 2, startAyat: 153, count: 1, theme: 'Inna Allaha Ma\'as-Sabirin' },
      { id: 'sabr-3', title: 'Never Despair of Allah\'s Mercy', surah: 39, startAyat: 53, count: 1, theme: 'La Taqnatou' },
      { id: 'sabr-4', title: 'Whoever Relies on Allah', surah: 65, startAyat: 2, count: 2, theme: 'Wa May-Yattaqillah' },
      { id: 'sabr-5', title: 'Allah will not Burden a Soul', surah: 2, startAyat: 286, count: 1, theme: 'La Yukallifullahu' },
      { id: 'sabr-6', title: 'Call upon Me, I will Respond', surah: 40, startAyat: 60, count: 1, theme: 'Ud\'uni Astajib Lakum' },
      { id: 'sabr-7', title: 'Indeed, my Lord is Near', surah: 11, startAyat: 61, count: 1, theme: 'Inna Rabbi Qaribun Mujib' },
      { id: 'sabr-8', title: 'When my Servants ask of Me', surah: 2, startAyat: 186, count: 1, theme: 'Fa-Inni Qarib' },
      { id: 'sabr-9', title: 'Good End for the Righteous', surah: 28, startAyat: 83, count: 1, theme: 'Wal-\'Aqibatu Lil-Muttaqin' },
      { id: 'sabr-10', title: 'Glad Tidings for the Patient', surah: 2, startAyat: 155, count: 2, theme: 'Wa Bashshiris-Sabirin' },
    ],
  },
  {
    id: 'pack-juz-amma',
    title: '15 Juz Amma Surah Gems',
    arabicTitle: 'روائع قصار السور من جزء عم',
    description: '15 beloved short Surahs and Ayahs ideal for TikTok, Instagram Reels, and YouTube Shorts.',
    icon: '🕋',
    items: [
      { id: 'juz-1', title: 'Surah Al-Ikhlas (Purity)', surah: 112, startAyat: 1, count: 4, theme: 'Tawhid' },
      { id: 'juz-2', title: 'Surah Al-Falaq (Daybreak)', surah: 113, startAyat: 1, count: 5, theme: 'Protection' },
      { id: 'juz-3', title: 'Surah An-Nas (Mankind)', surah: 114, startAyat: 1, count: 6, theme: 'Refuge' },
      { id: 'juz-4', title: 'Surah Al-Kawthar (Abundance)', surah: 108, startAyat: 1, count: 3, theme: 'Gratitude' },
      { id: 'juz-5', title: 'Surah An-Nasr (Divine Help)', surah: 110, startAyat: 1, count: 3, theme: 'Victory' },
      { id: 'juz-6', title: 'Surah Al-\'Asr (Time)', surah: 103, startAyat: 1, count: 3, theme: 'Value of Time' },
      { id: 'juz-7', title: 'Surah Al-Qadr (Power)', surah: 97, startAyat: 1, count: 5, theme: 'Night of Glory' },
      { id: 'juz-8', title: 'Surah Ad-Duha (Morning Sun)', surah: 93, startAyat: 1, count: 11, theme: 'Hope' },
      { id: 'juz-9', title: 'Surah Ash-Sharh (Relief)', surah: 94, startAyat: 1, count: 8, theme: 'Ease' },
      { id: 'juz-10', title: 'Surah At-Tin (The Fig)', surah: 95, startAyat: 1, count: 8, theme: 'Creation of Man' },
      { id: 'juz-11', title: 'Surah Al-\'Alaq (The Clot)', surah: 96, startAyat: 1, count: 5, theme: 'First Revelation' },
      { id: 'juz-12', title: 'Surah Az-Zalzalah (Earthquake)', surah: 99, startAyat: 1, count: 8, theme: 'Deeds Weighed' },
      { id: 'juz-13', title: 'Surah Al-Qari\'ah (Calamity)', surah: 101, startAyat: 1, count: 11, theme: 'Day of Judgment' },
      { id: 'juz-14', title: 'Surah At-Takathur (Rivalry)', surah: 102, startAyat: 1, count: 8, theme: 'Worldly Competition' },
      { id: 'juz-15', title: 'Surah Quraysh (Custodians)', surah: 106, startAyat: 1, count: 4, theme: 'Security & Sustenance' },
    ],
  },
]
