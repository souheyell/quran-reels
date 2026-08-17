import type { Edition, Reciter, ReciterCategory, Verse } from '../types'
import { ARABIC_EDITION_ID } from '../types'
import { QURAN_API_BASE } from '../env'

interface SurahMeta {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
}

let surahList: SurahMeta[] | null = null

async function fetchSurahList(signal?: AbortSignal): Promise<SurahMeta[]> {
  if (surahList) return surahList
  const res = await fetch(`${QURAN_API_BASE}/surah`, { signal })
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`)
  const json = (await res.json()) as {
    code: number
    status: string
    data?: { number: number; name: string; englishName: string; numberOfAyahs: number }[]
  }
  if (json.code !== 200 || !json.data) {
    throw new Error('Quran API returned no data')
  }
  surahList = json.data.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    numberOfAyahs: s.numberOfAyahs,
  }))
  return surahList
}

export function getSurahMeta(surahNumber: number): SurahMeta | undefined {
  return surahList?.find((s) => s.number === surahNumber)
}

export const POPULAR_EDITIONS: Edition[] = [
  { id: 'en.sahih', name: 'Saheeh International', language: 'English' },
  { id: 'en.pickthall', name: 'Pickthall', language: 'English' },
  { id: 'en.asad', name: 'Muhammad Asad', language: 'English' },
  { id: 'fr.hamidullah', name: 'Hamidullah', language: 'French' },
  { id: 'ur.jalandhry', name: 'Jalandhry', language: 'Urdu' },
  { id: 'tr.diyanet', name: 'Diyanet Isleri', language: 'Turkish' },
  { id: 'id.indonesian', name: 'Bahasa Indonesia', language: 'Indonesian' },
  { id: 'de.bubenheim', name: 'Bubenheim & Elyas', language: 'German' },
  { id: 'bn.bengali', name: 'Muhiuddin Khan', language: 'Bengali' },
  { id: 'hi.hindi', name: 'Suhel Farooq Khan', language: 'Hindi' },
]

export const ALL_RECITERS: Reciter[] = [
  // ── Golden Age & Classical Masters (كبار قراء العصر الذهبي) ──
  {
    id: 'ar.husary',
    name: 'Mahmoud Khalil Al-Husary (Murattal)',
    arabicName: 'محمود خليل الحصري (مرتل)',
    category: 'golden-age',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Husary_128kbps',
  },
  {
    id: 'ar.husarymujawwad',
    name: 'Mahmoud Khalil Al-Husary (Mujawwad)',
    arabicName: 'محمود خليل الحصري (مجود)',
    category: 'mujawwad',
    style: 'Mujawwad',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Husary_128kbps_Mujawwad',
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdulbasit Abdussamad (Murattal)',
    arabicName: 'عبد الباسط عبد الصمد (مرتل)',
    category: 'golden-age',
    style: 'Murattal',
    bitrate: '192kbps',
    country: 'Egypt',
    subfolder: 'Abdul_Basit_Murattal_192kbps',
  },
  {
    id: 'ar.abdulbasitmujawwad',
    name: 'Abdulbasit Abdussamad (Mujawwad)',
    arabicName: 'عبد الباسط عبد الصمد (مجود)',
    category: 'mujawwad',
    style: 'Mujawwad',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Abdul_Basit_Mujawwad_128kbps',
  },
  {
    id: 'ar.minshawi',
    name: 'Mohamed Siddiq Al-Minshawi (Murattal)',
    arabicName: 'محمد صديق المنشاوي (مرتل)',
    category: 'golden-age',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Minshawy_Murattal_128kbps',
  },
  {
    id: 'ar.minshawimujawwad',
    name: 'Mohamed Siddiq Al-Minshawi (Mujawwad)',
    arabicName: 'محمد صديق المنشاوي (مجود)',
    category: 'mujawwad',
    style: 'Mujawwad',
    bitrate: '192kbps',
    country: 'Egypt',
    subfolder: 'Minshawy_Mujawwad_192kbps',
  },
  {
    id: 'ar.mustafaismail',
    name: 'Mustafa Ismail',
    arabicName: 'مصطفى إسماعيل',
    category: 'golden-age',
    style: 'Mujawwad',
    bitrate: '48kbps',
    country: 'Egypt',
    subfolder: 'Mustafa_Ismail_48kbps',
  },
  {
    id: 'ar.tablawi',
    name: 'Mohammad Al-Tablawi',
    arabicName: 'محمد محمود الطبلاوي',
    category: 'golden-age',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Mohammad_al_Tablaway_128kbps',
  },
  {
    id: 'ar.banna',
    name: 'Mahmoud Ali Al-Banna',
    arabicName: 'محمود علي البنا',
    category: 'golden-age',
    style: 'Murattal',
    bitrate: '32kbps',
    country: 'Egypt',
    subfolder: 'Mahmoud_Ali_al_Banna_32kbps',
  },
  {
    id: 'ar.suwaisi',
    name: 'Ali Hajjaj Al-Suwaisi',
    arabicName: 'علي حجاج السويسي',
    category: 'golden-age',
    style: 'Mujawwad',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Ali_Hajjaj_AlSuesy_128kbps',
  },
  {
    id: 'ar.bahtimi',
    name: 'Kamel Al-Bahtimi',
    arabicName: 'كامل يوسف البهتيمي',
    category: 'golden-age',
    style: 'Mujawwad',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Kamel_Al_Bahtimi_128kbps',
  },

  // ── Haramain Imams (أئمة المسجد الحرام والمسجد النبوي) ──
  {
    id: 'ar.sudais',
    name: 'Abdul Rahman Al-Sudais (Makkah Imam)',
    arabicName: 'عبد الرحمن السديس (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '192kbps',
    country: 'Saudi Arabia',
    subfolder: 'Abdurrahmaan_As-Sudais_192kbps',
  },
  {
    id: 'ar.shuraim',
    name: 'Saud Al-Shuraim (Makkah Imam)',
    arabicName: 'سعود الشريم (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Saood_ash-Shuraym_128kbps',
  },
  {
    id: 'ar.dossari',
    name: 'Yasser Al-Dosari (Makkah Imam)',
    arabicName: 'ياسر الدوسري (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Yasser_Ad-Dussary_128kbps',
  },
  {
    id: 'ar.maher',
    name: 'Maher Al-Muaiqly (Makkah Imam)',
    arabicName: 'ماهر المعيقلي (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'MaherAlMuaiqly128kbps',
  },
  {
    id: 'ar.baleela',
    name: 'Bandar Baleela (Makkah Imam)',
    arabicName: 'بندر بليلة (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Bandar_Baleela_128kbps',
  },
  {
    id: 'ar.juhany',
    name: 'Abdullah Awad Al-Juhany (Makkah Imam)',
    arabicName: 'عبد الله عواد الجهني (إمام الحرم المكي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Abdullah_Juhany_128kbps',
  },
  {
    id: 'ar.alijaber',
    name: 'Ali Jaber (Former Haram Imam)',
    arabicName: 'علي عبد الله جابر (إمام الحرم المكي سابقاً)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '64kbps',
    country: 'Saudi Arabia',
    subfolder: 'Ali_Jaber_64kbps',
  },
  {
    id: 'ar.muhammadayyoub',
    name: 'Muhammad Ayyub (Madinah Prophet Mosque Imam)',
    arabicName: 'محمد أيوب (إمام المسجد النبوي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Muhammad_Ayyoub_128kbps',
  },
  {
    id: 'ar.hudhaify',
    name: 'Ali Al-Hudhaify (Madinah Imam)',
    arabicName: 'علي بن عبد الرحمن الحذيفي (إمام المسجد النبوي)',
    category: 'haramain',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Hudhaify_128kbps',
  },
  {
    id: 'ar.budair',
    name: 'Salah Al-Budair (Madinah Imam)',
    arabicName: 'صلاح البدير (إمام المسجد النبوي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Salah_Al_Budair_128kbps',
  },
  {
    id: 'ar.qasim',
    name: 'Abdul Muhsin Al-Qasim (Madinah Imam)',
    arabicName: 'عبد المحسن القاسم (إمام المسجد النبوي)',
    category: 'haramain',
    style: 'Haramain',
    bitrate: '192kbps',
    country: 'Saudi Arabia',
    subfolder: 'Abdul_Muhsin_Al_Qasim_192kbps',
  },
  {
    id: 'ar.akhdar',
    name: 'Ibrahim Al-Akhdar (Madinah Imam)',
    arabicName: 'إبراهيم الأخضر (شيخ قراء المدينة)',
    category: 'haramain',
    style: 'Murattal',
    bitrate: '32kbps',
    country: 'Saudi Arabia',
    subfolder: 'Ibrahim_Akhdar_32kbps',
  },

  // ── Contemporary Masters (القراء المعاصرون) ──
  {
    id: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري راشد العفاسي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Kuwait',
    subfolder: 'Alafasy_128kbps',
  },
  {
    id: 'ar.ajamy',
    name: 'Ahmed Ibn Ali Al-Ajamy',
    arabicName: 'أحمد بن علي العجمي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps',
  },
  {
    id: 'ar.qatami',
    name: 'Nasser Al-Qatami',
    arabicName: 'ناصر القطامي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Nasser_Alqatami_128kbps',
  },
  {
    id: 'ar.shaatree',
    name: 'Abu Bakr Al-Shatri',
    arabicName: 'أبو بكر الشاطري',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Abu_Bakr_Ash-Shaatree_128kbps',
  },
  {
    id: 'ar.ghamadi',
    name: 'Saad Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '40kbps',
    country: 'Saudi Arabia',
    subfolder: 'Ghamadi_40kbps',
  },
  {
    id: 'ar.fares',
    name: 'Fares Abbad',
    arabicName: 'فارس عباد',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '64kbps',
    country: 'Yemen',
    subfolder: 'Fares_Abbad_64kbps',
  },
  {
    id: 'ar.rifai',
    name: 'Hani Ar-Rifai',
    arabicName: 'هاني الرفاعي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '192kbps',
    country: 'Saudi Arabia',
    subfolder: 'Hani_Rifai_192kbps',
  },
  {
    id: 'ar.abkar',
    name: 'Idris Abkar',
    arabicName: 'إدريس أبكر',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Idrees_Abkar_128kbps',
  },
  {
    id: 'ar.jalil',
    name: 'Khalid Al-Jaleel',
    arabicName: 'خالد الجليل',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Khalid_al-Jalil_128kbps',
  },
  {
    id: 'ar.yamani',
    name: 'Wadee Al-Yamani',
    arabicName: 'وديع اليمني',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Yemen',
    subfolder: 'Wadee_Al-Yamani_128kbps',
  },
  {
    id: 'ar.bukhatir',
    name: 'Salah Bukhatir',
    arabicName: 'صلاح بوخاطر',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'UAE',
    subfolder: 'Salah_Bukhatir_128kbps',
  },
  {
    id: 'ar.kurdi',
    name: 'Raad Al-Kurdi',
    arabicName: 'رعد الكردي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Iraq',
    subfolder: 'Raad_Al_Kurdi_128kbps',
  },
  {
    id: 'ar.awsi',
    name: 'Abdurrahman Al-Awsi',
    arabicName: 'عبد الرحمن العوسي',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Abdurrahmaan_Al-Ausy_128kbps',
  },
  {
    id: 'ar.jibreel',
    name: 'Muhammad Jibreel',
    arabicName: 'محمد جبريل',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Muhammad_Jibreel_128kbps',
  },
  {
    id: 'ar.muhaisni',
    name: 'Muhammad Al-Muhaisni',
    arabicName: 'محمد المحيسني',
    category: 'contemporary',
    style: 'Murattal',
    bitrate: '128kbps',
    country: 'Saudi Arabia',
    subfolder: 'Mohamed_Al-Mohisni_128kbps',
  },

  // ── Warsh & Distinct Riwayat (روايات ورش وقالون) ──
  {
    id: 'ar.warsh.abdulbasit',
    name: 'Abdulbasit Abdussamad (Warsh an Nafi)',
    arabicName: 'عبد الباسط عبد الصمد (رواية ورش عن نافع)',
    category: 'warsh',
    style: 'Warsh',
    bitrate: '128kbps',
    country: 'Egypt',
    subfolder: 'Warsh_Abdulbasit_128kbps',
  },
  {
    id: 'ar.warsh.jazairi',
    name: 'Yassin Al-Jazairi (Warsh an Nafi)',
    arabicName: 'ياسين الجزائري (رواية ورش عن نافع)',
    category: 'warsh',
    style: 'Warsh',
    bitrate: '64kbps',
    country: 'Algeria',
    subfolder: 'Warsh_Yassin_Al_Jazairi_64kbps',
  },
  {
    id: 'ar.warsh.qazabri',
    name: 'Omar Al-Qazabri (Warsh an Nafi)',
    arabicName: 'عمر القزابري (رواية ورش عن نافع)',
    category: 'warsh',
    style: 'Warsh',
    bitrate: '128kbps',
    country: 'Morocco',
    subfolder: 'Warsh_Kushite_128kbps',
  },
  {
    id: 'ar.qalun.dokali',
    name: 'Dokali Muhammad Al-Alim (Qalun an Nafi)',
    arabicName: 'الدكالي محمد العالم (رواية قالون عن نافع)',
    category: 'warsh',
    style: 'Qalun',
    bitrate: '128kbps',
    country: 'Libya',
    subfolder: 'Qalun_Al_Dokali_128kbps',
  },
]

export const POPULAR_RECITERS = ALL_RECITERS

export const DEFAULT_RECITER_ID = 'ar.alafasy'

/** Direct high-speed EveryAyah CDN mappings for all classical & contemporary reciters */
const EVERYAYAH_RECITERS: Record<string, string> = {
  'ar.husary': 'Husary_128kbps',
  'ar.husarymujawwad': 'Husary_128kbps_Mujawwad',
  'ar.abdulbasitmurattal': 'Abdul_Basit_Murattal_192kbps',
  'ar.abdulbasitmujawwad': 'Abdul_Basit_Mujawwad_128kbps',
  'ar.minshawi': 'Minshawy_Murattal_128kbps',
  'ar.minshawimujawwad': 'Minshawy_Mujawwad_192kbps',
  'ar.mustafaismail': 'Mustafa_Ismail_48kbps',
  'ar.tablawi': 'Mohammad_al_Tablaway_128kbps',
  'ar.banna': 'Mahmoud_Ali_al_Banna_32kbps',
  'ar.suwaisi': 'Ali_Hajjaj_AlSuesy_128kbps',
  'ar.bahtimi': 'Kamel_Al_Bahtimi_128kbps',
  'ar.alijaber': 'Ali_Jaber_64kbps',
  'ar.muhammadayyoub': 'Muhammad_Ayyoub_128kbps',
  'ar.hudhaify': 'Hudhaify_128kbps',
  'ar.akhdar': 'Ibrahim_Akhdar_32kbps',
  'ar.alafasy': 'Alafasy_128kbps',
  'ar.sudais': 'Abdurrahmaan_As-Sudais_192kbps',
  'ar.shuraim': 'Saood_ash-Shuraym_128kbps',
  'ar.dossari': 'Yasser_Ad-Dussary_128kbps',
  'ar.dussary': 'Yasser_Ad-Dussary_128kbps',
  'ar.maher': 'MaherAlMuaiqly128kbps',
  'ar.baleela': 'Bandar_Baleela_128kbps',
  'ar.juhany': 'Abdullah_Juhany_128kbps',
  'ar.qasim': 'Abdul_Muhsin_Al_Qasim_192kbps',
  'ar.qatami': 'Nasser_Alqatami_128kbps',
  'ar.shaatree': 'Abu_Bakr_Ash-Shaatree_128kbps',
  'ar.ghamadi': 'Ghamadi_40kbps',
  'ar.fares': 'Fares_Abbad_64kbps',
  'ar.rifai': 'Hani_Rifai_192kbps',
  'ar.budair': 'Salah_Al_Budair_128kbps',
  'ar.ajamy': 'Ahmed_ibn_Ali_al-Ajamy_128kbps',
  'ar.abkar': 'Idrees_Abkar_128kbps',
  'ar.jalil': 'Khalid_al-Jalil_128kbps',
  'ar.yamani': 'Wadee_Al-Yamani_128kbps',
  'ar.bukhatir': 'Salah_Bukhatir_128kbps',
  'ar.kurdi': 'Raad_Al_Kurdi_128kbps',
  'ar.awsi': 'Abdurrahmaan_Al-Ausy_128kbps',
  'ar.jibreel': 'Muhammad_Jibreel_128kbps',
  'ar.muhaisni': 'Mohamed_Al-Mohisni_128kbps',
  'ar.warsh.abdulbasit': 'Warsh_Abdulbasit_128kbps',
  'ar.warsh.jazairi': 'Warsh_Yassin_Al_Jazairi_64kbps',
  'ar.warsh.qazabri': 'Warsh_Kushite_128kbps',
  'ar.qalun.dokali': 'Qalun_Al_Dokali_128kbps',
  // Legacy aliases
  'ar.abdulsamad': 'Abdul_Basit_Murattal_192kbps',
  'ar.mahermuaiqly': 'MaherAlMuaiqly128kbps',
  'ar.abdurrahmaansudais': 'Abdurrahmaan_As-Sudais_192kbps',
  'ar.saoodshuraym': 'Saood_ash-Shuraym_128kbps',
  'ar.hanirifai': 'Hani_Rifai_192kbps',
  'ar.ibrahimakhbar': 'Ibrahim_Akhdar_32kbps',
}

export function getEveryAyahAudioUrl(folder: string, surah: number, ayat: number): string {
  const s = String(surah).padStart(3, '0')
  const a = String(ayat).padStart(3, '0')
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`
}

export function getReciterSampleAudioUrl(reciterId: string, customList?: Reciter[]): string {
  const all = [...(customList || []), ...ALL_RECITERS]
  const reciter = all.find((r) => r.id === reciterId)
  const folder = reciter?.subfolder || EVERYAYAH_RECITERS[reciterId] || EVERYAYAH_RECITERS[DEFAULT_RECITER_ID]
  return getEveryAyahAudioUrl(folder, 1, 1) // Al-Fatiha 1:1
}

export function getReciterById(id: string, customList?: Reciter[]): Reciter | undefined {
  const all = [...(customList || []), ...ALL_RECITERS]
  return all.find((r) => r.id === id)
}

export function searchReciters(
  query: string,
  category?: ReciterCategory | 'all' | 'favorites',
  favoriteIds: string[] = [],
  customList: Reciter[] = [],
): Reciter[] {
  const all = [...customList, ...ALL_RECITERS]
  const q = query.trim().toLowerCase()

  return all.filter((r) => {
    // Category filter
    if (category === 'favorites') {
      if (!favoriteIds.includes(r.id)) return false
    } else if (category && category !== 'all') {
      if (r.category !== category) return false
    }

    // Keyword filter
    if (!q) return true
    return (
      r.name.toLowerCase().includes(q) ||
      (r.arabicName && r.arabicName.toLowerCase().includes(q)) ||
      (r.country && r.country.toLowerCase().includes(q)) ||
      (r.style && r.style.toLowerCase().includes(q))
    )
  })
}

/**
 * Fetch a range of verses using the bulk surah endpoint (1 request instead of N).
 */
export async function fetchVerses(
  surah: number,
  startAyat: number,
  count: number,
  editionId: string,
  reciterId = DEFAULT_RECITER_ID,
  signal?: AbortSignal,
  secondaryEditionId?: string,
  customReciters?: Reciter[],
): Promise<Verse[]> {
  const safeSurah = Number(surah) || 1
  const safeStart = Number(startAyat) || 1
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 30)
  const safeReciterId = reciterId || DEFAULT_RECITER_ID

  const customReciter = customReciters?.find((r) => r.id === safeReciterId)
  const everyAyahFolder =
    customReciter?.subfolder ||
    EVERYAYAH_RECITERS[safeReciterId] ||
    EVERYAYAH_RECITERS[DEFAULT_RECITER_ID]

  const editionList = [ARABIC_EDITION_ID, editionId]
  if (secondaryEditionId && secondaryEditionId !== 'none' && secondaryEditionId !== editionId) {
    editionList.push(secondaryEditionId)
  }

  const editions = editionList.join(',')
  const res = await fetch(`${QURAN_API_BASE}/surah/${safeSurah}/editions/${editions}`, { signal })
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`)

  const json = (await res.json()) as {
    code: number
    status: string
    data?: {
      edition?: { identifier?: string }
      ayahs?: { numberInSurah: number; text?: string; audio?: string }[]
    }[]
  }
  if (json.code !== 200 || !json.data) {
    throw new Error('Quran API returned no data')
  }

  const arabicData = json.data.find((d) => d.edition?.identifier === ARABIC_EDITION_ID)
  const translationData = json.data.find((d) => d.edition?.identifier === editionId)
  const secondaryData =
    secondaryEditionId && secondaryEditionId !== 'none'
      ? json.data.find((d) => d.edition?.identifier === secondaryEditionId)
      : undefined

  const edition = POPULAR_EDITIONS.find((e) => e.id === editionId)
  const secondaryEdition = secondaryEditionId
    ? POPULAR_EDITIONS.find((e) => e.id === secondaryEditionId)
    : undefined
  const reciter =
    customReciter ||
    ALL_RECITERS.find((r) => r.id === safeReciterId) ||
    ALL_RECITERS[0]

  // Ensure surah list is loaded for surah name
  const surahs = await fetchSurahList(signal)
  const surahMeta = surahs.find((s) => s.number === safeSurah)

  const endAyat = safeStart + safeCount - 1
  const verses: Verse[] = []

  const BASMALAH_PREFIX_REGEX = /^(?:[\ufeff\s]*بِسْمِ\s+ٱ?لل[َّٰـ]*هِ\s+ٱلرَّحْم[َٰـ]*نِ\s+ٱلرَّحِيمِ\s*)/u

  for (let ayat = safeStart; ayat <= endAyat; ayat++) {
    const rawArabic = arabicData?.ayahs?.find((a) => a.numberInSurah === ayat)?.text ?? ''
    const arabic =
      ayat === 1 && safeSurah > 1
        ? rawArabic.replace(BASMALAH_PREFIX_REGEX, '').trim()
        : rawArabic.replace(/^\ufeff/, '').trim()
    const translation = translationData?.ayahs?.find((a) => a.numberInSurah === ayat)?.text ?? ''
    const secondaryTranslation = secondaryData?.ayahs?.find((a) => a.numberInSurah === ayat)?.text ?? ''

    const audioUrl = getEveryAyahAudioUrl(everyAyahFolder, safeSurah, ayat)

    if (!arabic && !translation) break // past end of surah

    verses.push({
      surah: safeSurah,
      ayat,
      surahName: surahMeta?.englishName || `Surah ${safeSurah}`,
      surahArabicName: surahMeta?.name,
      arabic,
      translation,
      secondaryTranslation,
      editionId,
      editionName: edition?.name || editionId,
      secondaryEditionId: secondaryEdition ? secondaryEdition.id : undefined,
      secondaryEditionName: secondaryEdition ? secondaryEdition.name : undefined,
      reciterId: safeReciterId,
      reciterName: reciter.name,
      audioUrl,
    })
  }

  return verses
}

export async function fetchRandomVerses(
  count = 1,
  editionId = 'en.sahih',
  reciterId = DEFAULT_RECITER_ID,
  signal?: AbortSignal,
  secondaryEditionId?: string,
  customReciters?: Reciter[],
): Promise<Verse[]> {
  const surahs = await fetchSurahList(signal)
  const randomSurahMeta = surahs[Math.floor(Math.random() * surahs.length)]
  const maxAyat = randomSurahMeta.numberOfAyahs
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 30)

  // Choose a random start ayat that accommodates the count if possible
  const maxStart = Math.max(1, maxAyat - safeCount + 1)
  const randomStart = Math.floor(Math.random() * maxStart) + 1

  return fetchVerses(
    randomSurahMeta.number,
    randomStart,
    safeCount,
    editionId,
    reciterId,
    signal,
    secondaryEditionId,
    customReciters,
  )
}
