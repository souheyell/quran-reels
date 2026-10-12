import { parseQuranFilename } from './audioLoudnessAnalyzer';

export interface WipLinkedItem {
  videoFile: File;
  title: string;
  description: string;
  captionFileName?: string;
  matchedBy: 'EXACT_STEM' | 'SLUG_MATCH' | 'MANIFEST' | 'INDEX_ORDER' | 'DEFAULT_CLEAN';
  surahNumber: number;
  surahName: string;
  ayahRange: string;
  reciterName: string;
  hashtags: string[];
}

export interface WipLinkingResult {
  linkedItems: WipLinkedItem[];
  totalVideos: number;
  matchedCaptionsCount: number;
  manifestDetected: boolean;
}

/**
 * Normalizes filenames to aid fuzzy matching (lowercased, removes punctuation & underscores).
 */
const normalizeStem = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, '') // remove extension
    .toLowerCase()
    .replace(/[_\s\-\.]+/g, '')
    .trim();
};

export const isVideoFile = (file: File): boolean => {
  return (
    file.type.startsWith('video/') ||
    Boolean(file.name.match(/\.(mp4|mov|m4v|webm|mkv|avi)$/i))
  );
};

export const isCaptionOrMetaFile = (file: File): boolean => {
  return Boolean(file.name.match(/\.(txt|json|caption|srt|vtt|desc)$/i));
};

export const isManifestFile = (file: File): boolean => {
  return Boolean(file.name.match(/^(manifest|metadata|captions|tracks|info|wip|reels)\.json$/i));
};

/**
 * Automatically links video tracks with their respective caption / metadata files
 * from a dropped or selected WIP directory.
 */
export async function linkWipTracksAndCaptions(files: File[]): Promise<WipLinkingResult> {
  const videoFiles = files.filter(isVideoFile);
  const captionFiles = files.filter((f) => isCaptionOrMetaFile(f) && !isManifestFile(f));
  const manifestFile = files.find(isManifestFile);

  let manifestData: any = null;
  if (manifestFile) {
    try {
      const text = await manifestFile.text();
      manifestData = JSON.parse(text);
    } catch (e) {
      console.warn('Failed to parse WIP manifest JSON:', e);
    }
  }

  // Pre-load caption file texts into cache
  const captionCache = new Map<string, string>();
  await Promise.all(
    captionFiles.map(async (cf) => {
      try {
        const text = await cf.text();
        captionCache.set(cf.name, text.trim());
      } catch (_) {}
    })
  );

  let matchedCaptionsCount = 0;
  const linkedItems: WipLinkedItem[] = [];

  for (let idx = 0; idx < videoFiles.length; idx++) {
    const video = videoFiles[idx];
    const videoBase = video.name.replace(/\.[^/.]+$/, '').trim();
    const normVideo = normalizeStem(video.name);

    let title = videoBase;
    let description = '';
    let matchedCaptionFile: string | undefined = undefined;
    let matchedBy: WipLinkedItem['matchedBy'] = 'DEFAULT_CLEAN';
    let hashtags: string[] = ['#Quran', '#IslamicReels', '#Tilawah'];
    let metaSurah: number | undefined;
    let metaSurahName: string | undefined;
    let metaAyahRange: string | undefined;
    let metaReciter: string | undefined;

    // 1. Check Manifest Data
    if (manifestData) {
      let entry: any = null;
      if (Array.isArray(manifestData)) {
        entry = manifestData.find(
          (item) =>
            item.filename === video.name ||
            item.video === video.name ||
            normalizeStem(item.filename || item.video || item.title || '') === normVideo ||
            item.id === idx ||
            item.index === idx + 1
        );
      } else if (typeof manifestData === 'object') {
        entry =
          manifestData[video.name] ||
          manifestData[videoBase] ||
          Object.entries(manifestData).find(([k]) => normalizeStem(k) === normVideo)?.[1];
      }

      if (entry) {
        matchedBy = 'MANIFEST';
        matchedCaptionsCount++;
        matchedCaptionFile = manifestFile?.name;

        if (typeof entry === 'string') {
          description = entry;
          title = entry.split('\n')[0].trim().slice(0, 60) || videoBase;
        } else {
          const rawTitle = entry.title || entry.name || entry.surah_title || entry.caption_title || '';
          const rawDesc = entry.description || entry.caption || entry.text || entry.captionEnglish || entry.captionArabic || entry.desc || entry.summary || '';

          // Read manifest for titles and descriptions OR the other way around
          title = rawTitle || (rawDesc ? rawDesc.split('\n')[0].trim().slice(0, 60) : videoBase);
          description = rawDesc || (rawTitle ? rawTitle : '');

          if (entry.hashtags && Array.isArray(entry.hashtags)) hashtags = entry.hashtags;
          if (entry.surah || entry.surahNumber || entry.surah_number) {
            metaSurah = Number(entry.surah || entry.surahNumber || entry.surah_number);
          }
          if (entry.surahName || entry.surah_name) metaSurahName = entry.surahName || entry.surah_name;
          if (entry.ayah || entry.ayahRange || entry.ayah_range || entry.verse || entry.verses) {
            metaAyahRange = String(entry.ayah || entry.ayahRange || entry.ayah_range || entry.verse || entry.verses);
          }
          if (entry.reciter || entry.reciterName || entry.qari) metaReciter = entry.reciter || entry.reciterName || entry.qari;
        }
      }
    }

    // 2. Exact Stem Match (e.g. video_01.mp4 <-> video_01.txt or video_01.json)
    if (!description) {
      const exactMatch = captionFiles.find(
        (cf) => cf.name.replace(/\.[^/.]+$/, '').trim() === videoBase
      );

      if (exactMatch) {
        matchedBy = 'EXACT_STEM';
        matchedCaptionsCount++;
        matchedCaptionFile = exactMatch.name;
        const content = captionCache.get(exactMatch.name) || '';

        if (exactMatch.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            const rawTitle = parsed.title || parsed.name || '';
            const rawDesc = parsed.description || parsed.caption || parsed.text || parsed.captionEnglish || parsed.captionArabic || content;
            title = rawTitle || (rawDesc ? rawDesc.split('\n')[0].trim().slice(0, 60) : videoBase);
            description = rawDesc || rawTitle || content;
            if (parsed.hashtags) hashtags = parsed.hashtags;
            if (parsed.surah) metaSurah = Number(parsed.surah);
            if (parsed.surahName) metaSurahName = parsed.surahName;
            if (parsed.ayah || parsed.ayahRange) metaAyahRange = String(parsed.ayah || parsed.ayahRange);
            if (parsed.reciter) metaReciter = parsed.reciter;
          } catch (_) {
            description = content;
            if (!title || title === videoBase) {
              title = content.split('\n')[0].trim().slice(0, 60);
            }
          }
        } else {
          description = content;
          if (!title || title === videoBase) {
            const firstLine = content.split('\n')[0].trim();
            if (firstLine.length > 2 && firstLine.length < 80) {
              title = firstLine;
            }
          }
        }
      }
    }

    // 3. Slug / Fuzzy Match (e.g. 01_kahf_video.mp4 <-> 01_kahf_caption.txt)
    if (!description) {
      const fuzzyMatch = captionFiles.find((cf) => {
        const normCaption = normalizeStem(cf.name);
        return (
          normCaption === normVideo ||
          normCaption.includes(normVideo) ||
          normVideo.includes(normCaption) ||
          normCaption.replace(/caption|text|desc|sub/, '') === normVideo.replace(/video|track|reel/, '')
        );
      });

      if (fuzzyMatch) {
        matchedBy = 'SLUG_MATCH';
        matchedCaptionsCount++;
        matchedCaptionFile = fuzzyMatch.name;
        description = captionCache.get(fuzzyMatch.name) || '';
      }
    }

    // 4. Index-Order Match (e.g. track 1 matches caption 1)
    if (!description && captionFiles.length === videoFiles.length) {
      const sortedVideos = [...videoFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const sortedCaptions = [...captionFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const vIndex = sortedVideos.indexOf(video);
      if (vIndex >= 0 && sortedCaptions[vIndex]) {
        const pairedCaption = sortedCaptions[vIndex];
        matchedBy = 'INDEX_ORDER';
        matchedCaptionsCount++;
        matchedCaptionFile = pairedCaption.name;
        description = captionCache.get(pairedCaption.name) || '';
      }
    }

    // Intelligent Surah metadata fallback
    const quranMeta = parseQuranFilename(video.name);

    linkedItems.push({
      videoFile: video,
      title: title.trim(),
      description: description.trim(),
      captionFileName: matchedCaptionFile,
      matchedBy,
      surahNumber: metaSurah || quranMeta.surahNumber || 1,
      surahName: metaSurahName || quranMeta.surahName || 'Al-Fatiha',
      ayahRange: metaAyahRange || quranMeta.ayahRange || '1 - 7',
      reciterName: metaReciter || quranMeta.reciterName || 'Mishary Rashid Alafasy',
      hashtags,
    });
  }

  return {
    linkedItems,
    totalVideos: videoFiles.length,
    matchedCaptionsCount,
    manifestDetected: Boolean(manifestFile),
  };
}
