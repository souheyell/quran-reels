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
  { id: 'ur.jalandhry', name: 'Jalandhry', language: 'Urdu' },
  { id: 'bn.bengali', name: 'Muhiuddin Khan', language: 'Bengali' },
  { id: 'hi.hindi', name: 'Suhel Farooq Khan', language: 'Hindi' },
  { id: 'fr.hamidullah', name: 'Hamidullah', language: 'French' },
]

export const POPULAR_RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy (مشاري العفاسي)' },
  { id: 'ar.alijaber', name: 'Ali Jaber (علي جابر)' },
  { id: 'ar.muhammadayyoub', name: 'Mohamed Ayoub (محمد أيوب)' },
  { id: 'ar.abdulsamad', name: 'AbdulBaset AbdulSamad (عبد الباسط عبد الصمد)' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly (ماهر المعيقلي)' },
  { id: 'ar.abdurrahmaansudais', name: 'Abdurrahmaan As-Sudais (عبد الرحمن السديس)' },
  { id: 'ar.dussary', name: 'Yasser Al-Dosari (ياسر الدوسري)' },
  { id: 'ar.ghamadi', name: 'Saad Al-Ghamdi (سعد الغامدي)' },
  { id: 'ar.qatami', name: 'Nasser Al-Qatami (ناصر القطامي)' },
  { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shaatree (أبو بكر الشاطري)' },
  { id: 'ar.ahmedajamy', name: 'Ahmed al-Ajamy (أحمد العجمي)' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary (محمود خليل الحصري)' },
  { id: 'ar.husarymujawwad', name: 'Al-Husary Mujawwad (الحصري مجود)' },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify (علي الحذيفي)' },
  { id: 'ar.saoodshuraym', name: 'Saood Ash-Shuraym (سعود الشريم)' },
  { id: 'ar.hanirifai', name: 'Hani Ar-Rifai (هاني الرفاعي)' },
  { id: 'ar.muhammadjibreel', name: 'Muhammad Jibreel (محمد جبريل)' },
  { id: 'ar.abdullahbasfar', name: 'Abdullah Basfar (عبد الله بصفر)' },
  { id: 'ar.ibrahimakhbar', name: 'Ibrahim Akhdar (إبراهيم الأخضر)' },
]

export const DEFAULT_RECITER_ID = 'ar.alafasy'

/** Custom EveryAyah CDN mappings for reciters not on alquran.cloud */
const EVERYAYAH_RECITERS: Record<string, string> = {
  'ar.alijaber': 'Ali_Jaber_64kbps',
  'ar.dussary': 'Yasser_Ad-Dussary_128kbps',
  'ar.ghamadi': 'Ghamadi_40kbps',
  'ar.qatami': 'Nasser_Alqatami_128kbps',
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
): Promise<Verse[]> {
  const safeSurah = Number(surah) || 1
  const safeStart = Number(startAyat) || 1
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 30)
  const safeReciterId = reciterId || DEFAULT_RECITER_ID

  const isEveryAyah = Boolean(EVERYAYAH_RECITERS[safeReciterId])
  const apiAudioEdition = isEveryAyah ? DEFAULT_RECITER_ID : safeReciterId

  const editions = `${ARABIC_EDITION_ID},${editionId},${apiAudioEdition}`
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
  const audioData = json.data.find((d) => d.edition?.identifier === apiAudioEdition)
  const edition = POPULAR_EDITIONS.find((e) => e.id === editionId)
  const reciter = POPULAR_RECITERS.find((r) => r.id === safeReciterId)

  // Ensure surah list is loaded for surah name
  const surahs = await fetchSurahList(signal)
  const surahMeta = surahs.find((s) => s.number === safeSurah)

  const endAyat = safeStart + safeCount - 1
  const verses: Verse[] = []

  for (let ayat = safeStart; ayat <= endAyat; ayat++) {
    const arabic = arabicData?.ayahs?.find((a) => a.numberInSurah === ayat)?.text ?? ''
    const translation = translationData?.ayahs?.find((a) => a.numberInSurah === ayat)?.text ?? ''

    let audioUrl: string | null = null
    if (isEveryAyah) {
      audioUrl = getEveryAyahAudioUrl(EVERYAYAH_RECITERS[safeReciterId], safeSurah, ayat)
    } else {
      audioUrl = audioData?.ayahs?.find((a) => a.numberInSurah === ayat)?.audio ?? null
    }

    if (!arabic && !translation) break // past end of surah

    verses.push({
      surah: safeSurah,
      ayat,
      surahName: surahMeta?.englishName ?? `Surah ${safeSurah}`,
      surahArabicName: surahMeta?.name ?? `سورة ${safeSurah}`,
      arabic,
      translation,
      editionId,
      editionName: edition?.name ?? editionId,
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

export async function fetchRandomVerses(
  count: number,
  editionId: string,
  reciterId = DEFAULT_RECITER_ID,
  signal?: AbortSignal,
): Promise<Verse[]> {
  const safeCount = typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : 1
  const surahs = await fetchSurahList(signal)
  const surahMeta = surahs[Math.floor(Math.random() * surahs.length)]
  const totalAyahs = Number(surahMeta?.numberOfAyahs) || 7
  const maxStart = Math.max(1, totalAyahs - safeCount + 1)
  const startAyat = Math.floor(Math.random() * maxStart) + 1
  return fetchVerses(surahMeta.number, startAyat, safeCount, editionId, reciterId, signal)
}

export async function validateReference(
  surah: number,
  ayat: number,
): Promise<{ valid: boolean; maxAyahs: number }> {
  if (surah < 1 || surah > 114) return { valid: false, maxAyahs: 0 }
  const surahs = await fetchSurahList()
  const meta = surahs.find((s) => s.number === surah)
  if (!meta) return { valid: false, maxAyahs: 0 }
  return { valid: ayat >= 1 && ayat <= meta.numberOfAyahs, maxAyahs: meta.numberOfAyahs }
}
