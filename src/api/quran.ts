import type { Edition, Reciter, Verse } from '../types'
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

export const POPULAR_RECITERS: Reciter[] = [
  // ── Golden Age & Classical Masters (كبار قراء العصر الذهبي) ──
  { id: 'ar.husary', name: '👑 Mahmoud Khalil Al-Husary - Murattal (محمود خليل الحصري - مرتل)' },
  { id: 'ar.husarymujawwad', name: '👑 Mahmoud Khalil Al-Husary - Mujawwad (محمود خليل الحصري - مجود)' },
  { id: 'ar.abdulbasitmurattal', name: '👑 Abdulbasit Abdussamad - Murattal (عبد الباسط عبد الصمد - مرتل)' },
  { id: 'ar.abdulbasitmujawwad', name: '👑 Abdulbasit Abdussamad - Mujawwad (عبد الباسط عبد الصمد - مجود)' },
  { id: 'ar.minshawi', name: '👑 Mohamed Siddiq Al-Minshawi - Murattal (محمد صديق المنشاوي - مرتل)' },
  { id: 'ar.minshawimujawwad', name: '👑 Mohamed Siddiq Al-Minshawi - Mujawwad (محمد صديق المنشاوي - مجود)' },
  { id: 'ar.mustafaismail', name: '👑 Mustafa Ismail (مصطفى إسماعيل)' },
  { id: 'ar.tablawi', name: '👑 Mohammad Al-Tablawi (محمد محمود الطبلاوي)' },
  { id: 'ar.banna', name: '👑 Mahmoud Ali Al-Banna (محمود علي البنا)' },
  { id: 'ar.suwaisi', name: '👑 Ali Hajjaj Al-Suwaisi (علي حجاج السويسي)' },
  { id: 'ar.alijaber', name: '🕋 Ali Jaber - Former Haram Imam (علي جابر)' },
  { id: 'ar.muhammadayyoub', name: '🕌 Muhammad Ayyub - Madinah Imam (محمد أيوب)' },
  { id: 'ar.hudhaify', name: '🕌 Ali Al-Hudhaify - Madinah Imam (علي الحذيفي)' },
  { id: 'ar.akhdar', name: '🕌 Ibrahim Al-Akhdar (إبراهيم الأخضر)' },

  // ── Contemporary Masters & Haram Imams (أئمة الحرمين والقراء المعاصرون) ──
  { id: 'ar.alafasy', name: '✨ Mishary Rashid Alafasy (مشاري راشد العفاسي)' },
  { id: 'ar.sudais', name: '🕋 Abdul Rahman Al-Sudais (عبد الرحمن السديس)' },
  { id: 'ar.shuraim', name: '🕋 Saud Al-Shuraim (سعود الشريم)' },
  { id: 'ar.dossari', name: '🕋 Yasser Al-Dosari (ياسر الدوسري)' },
  { id: 'ar.maher', name: '🕋 Maher Al-Muaiqly (ماهر المعيقلي)' },
  { id: 'ar.qatami', name: '✨ Nasser Al-Qatami (ناصر القطامي)' },
  { id: 'ar.shaatree', name: '✨ Abu Bakr Al-Shatri (أبو بكر الشاطري)' },
  { id: 'ar.ghamadi', name: '✨ Saad Al-Ghamdi (سعد الغامدي)' },
  { id: 'ar.fares', name: '✨ Fares Abbad (فارس عباد)' },
  { id: 'ar.rifai', name: '✨ Hani Ar-Rifai (هاني الرفاعي)' },
  { id: 'ar.budair', name: '🕌 Salah Al-Budair (صلاح البدير)' },
]

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
  'ar.qatami': 'Nasser_Alqatami_128kbps',
  'ar.shaatree': 'Abu_Bakr_Ash-Shaatree_128kbps',
  'ar.ghamadi': 'Ghamadi_40kbps',
  'ar.fares': 'Fares_Abbad_64kbps',
  'ar.rifai': 'Hani_Rifai_192kbps',
  'ar.budair': 'Salah_Al_Budair_128kbps',
  // Legacy aliases
  'ar.abdulsamad': 'Abdul_Basit_Murattal_192kbps',
  'ar.mahermuaiqly': 'MaherAlMuaiqly128kbps',
  'ar.abdurrahmaansudais': 'Abdurrahmaan_As-Sudais_192kbps',
  'ar.saoodshuraym': 'Saood_ash-Shuraym_128kbps',
  'ar.hanirifai': 'Hani_Rifai_192kbps',
  'ar.ibrahimakhbar': 'Ibrahim_Akhdar_32kbps',
}

function getEveryAyahAudioUrl(folder: string, surah: number, ayat: number): string {
  const s = String(surah).padStart(3, '0')
  const a = String(ayat).padStart(3, '0')
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`
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
): Promise<Verse[]> {
  const safeSurah = Number(surah) || 1
  const safeStart = Number(startAyat) || 1
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 30)
  const safeReciterId = reciterId || DEFAULT_RECITER_ID

  const everyAyahFolder = EVERYAYAH_RECITERS[safeReciterId] || EVERYAYAH_RECITERS[DEFAULT_RECITER_ID]

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
  const secondaryData = secondaryEditionId && secondaryEditionId !== 'none'
    ? json.data.find((d) => d.edition?.identifier === secondaryEditionId)
    : undefined

  const edition = POPULAR_EDITIONS.find((e) => e.id === editionId)
  const secondaryEdition = secondaryEditionId
    ? POPULAR_EDITIONS.find((e) => e.id === secondaryEditionId)
    : undefined
  const reciter = POPULAR_RECITERS.find((r) => r.id === safeReciterId)

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
      surahName: surahMeta?.englishName ?? `Surah ${safeSurah}`,
      surahArabicName: surahMeta?.name ?? `سورة ${safeSurah}`,
      arabic,
      translation,
      secondaryTranslation: secondaryTranslation || undefined,
      editionId,
      editionName: edition?.name ?? editionId,
      secondaryEditionId: secondaryEdition ? secondaryEdition.id : undefined,
      secondaryEditionName: secondaryEdition ? secondaryEdition.name : undefined,
      reciterId: safeReciterId,
      reciterName: reciter?.name ?? safeReciterId,
      audioUrl,
    })
  }

  if (verses.length === 0) {
    throw new Error(`No verses found for ${safeSurah}:${safeStart}`)
  }

  return verses
}

/**
 * Fetch random verses across the Quran.
 */
export async function fetchRandomVerses(
  count = 1,
  editionId = 'en.sahih',
  reciterId = DEFAULT_RECITER_ID,
  signal?: AbortSignal,
  secondaryEditionId?: string,
): Promise<Verse[]> {
  const surahs = await fetchSurahList(signal)
  const randomSurah = surahs[Math.floor(Math.random() * surahs.length)]
  const maxStart = Math.max(1, randomSurah.numberOfAyahs - count + 1)
  const randomStart = Math.floor(Math.random() * maxStart) + 1
  return fetchVerses(randomSurah.number, randomStart, count, editionId, reciterId, signal, secondaryEditionId)
}
