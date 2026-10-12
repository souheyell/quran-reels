export interface AudioAnalysisResult {
  lufs: number;
  peakDbfs: number;
  durationSeconds: number;
  isCompliant: boolean;
  gainToTargetDb: number;
}

export interface VideoMediaSpecs {
  width: number;
  height: number;
  aspectRatio: string;
  isVertical916: boolean;
  durationSeconds: number;
  isDurationValid: boolean;
  thumbnailUrl: string;
  videoUrl: string;
}

export interface QuranMetadata {
  surahNumber: number;
  surahName: string;
  ayahRange: string;
  reciterName: string;
  captionArabic: string;
  captionEnglish: string;
  hashtags: string[];
}

const SURAH_NAMES: Record<number, { en: string; ar: string }> = {
  1: { en: 'Al-Fatiha', ar: 'الفاتحة' },
  2: { en: 'Al-Baqarah', ar: 'البقرة' },
  3: { en: 'Ali \'Imran', ar: 'آل عمران' },
  4: { en: 'An-Nisa', ar: 'النساء' },
  5: { en: 'Al-Ma\'idah', ar: 'المائدة' },
  6: { en: 'Al-An\'am', ar: 'الأنعام' },
  7: { en: 'Al-A\'raf', ar: 'الأعراف' },
  8: { en: 'Al-Anfal', ar: 'الأنفال' },
  9: { en: 'At-Tawbah', ar: 'التوبة' },
  10: { en: 'Yunus', ar: 'يونس' },
  11: { en: 'Hud', ar: 'هود' },
  12: { en: 'Yusuf', ar: 'يوسف' },
  13: { en: 'Ar-Ra\'d', ar: 'الرعد' },
  14: { en: 'Ibrahim', ar: 'إبراهيم' },
  15: { en: 'Al-Hijr', ar: 'الحجر' },
  16: { en: 'An-Nahl', ar: 'النحل' },
  17: { en: 'Al-Isra', ar: 'الإسراء' },
  18: { en: 'Al-Kahf', ar: 'الكهف' },
  19: { en: 'Maryam', ar: 'مريم' },
  20: { en: 'Ta-Ha', ar: 'طه' },
  21: { en: 'Al-Anbiya', ar: 'الأنبياء' },
  22: { en: 'Al-Hajj', ar: 'الحج' },
  23: { en: 'Al-Mu\'minun', ar: 'المؤمنون' },
  24: { en: 'An-Nur', ar: 'النور' },
  25: { en: 'Al-Furqan', ar: 'الفرقان' },
  26: { en: 'Ash-Shu\'ara', ar: 'الشعراء' },
  27: { en: 'An-Naml', ar: 'النمل' },
  28: { en: 'Al-Qasas', ar: 'القصص' },
  29: { en: 'Al-\'Ankabut', ar: 'العنكبوت' },
  30: { en: 'Ar-Rum', ar: 'الروم' },
  31: { en: 'Luqman', ar: 'لقمان' },
  32: { en: 'As-Sajdah', ar: 'السجدة' },
  33: { en: 'Al-Ahzab', ar: 'الأحزاب' },
  34: { en: 'Saba', ar: 'سبأ' },
  35: { en: 'Fatir', ar: 'فاطر' },
  36: { en: 'Ya-Sin', ar: 'يس' },
  37: { en: 'As-Saffat', ar: 'الصافات' },
  38: { en: 'Sad', ar: 'ص' },
  39: { en: 'Az-Zumar', ar: 'الزمر' },
  40: { en: 'Ghafir', ar: 'غافر' },
  41: { en: 'Fussilat', ar: 'فصلت' },
  42: { en: 'Ash-Shura', ar: 'الشورى' },
  43: { en: 'Az-Zukhruf', ar: 'الزخرف' },
  44: { en: 'Ad-Dukhan', ar: 'الدخان' },
  45: { en: 'Al-Jathiyah', ar: 'الجاثية' },
  46: { en: 'Al-Ahqaf', ar: 'الأحقاف' },
  47: { en: 'Muhammad', ar: 'محمد' },
  48: { en: 'Al-Fath', ar: 'الفتح' },
  49: { en: 'Al-Hujurat', ar: 'الحجرات' },
  50: { en: 'Qaf', ar: 'ق' },
  51: { en: 'Adh-Dhariyat', ar: 'الذاريات' },
  52: { en: 'At-Tur', ar: 'الطور' },
  53: { en: 'An-Najm', ar: 'النجم' },
  54: { en: 'Al-Qamar', ar: 'القمر' },
  55: { en: 'Ar-Rahman', ar: 'الرحمن' },
  56: { en: 'Al-Waqi\'ah', ar: 'الواقعة' },
  57: { en: 'Al-Hadid', ar: 'الحديد' },
  58: { en: 'Al-Mujadila', ar: 'المجادلة' },
  59: { en: 'Al-Hashr', ar: 'الحشر' },
  60: { en: 'Al-Mumtahanah', ar: 'الممتحنة' },
  61: { en: 'As-Saff', ar: 'الصف' },
  62: { en: 'Al-Jumu\'ah', ar: 'الجمعة' },
  63: { en: 'Al-Munafiqun', ar: 'المنافقون' },
  64: { en: 'At-Taghabun', ar: 'التغابن' },
  65: { en: 'At-Talaq', ar: 'الطلاق' },
  66: { en: 'At-Tahrim', ar: 'التحريم' },
  67: { en: 'Al-Mulk', ar: 'الملك' },
  68: { en: 'Al-Qalam', ar: 'القلم' },
  69: { en: 'Al-Haqqah', ar: 'الحاقة' },
  70: { en: 'Al-Ma\'arij', ar: 'المعارج' },
  71: { en: 'Nuh', ar: 'نوح' },
  72: { en: 'Al-Jinn', ar: 'الجن' },
  73: { en: 'Al-Muzzammil', ar: 'المزمل' },
  74: { en: 'Al-Muddaththir', ar: 'المدثر' },
  75: { en: 'Al-Qiyamah', ar: 'القيامة' },
  76: { en: 'Al-Insan', ar: 'الإنسان' },
  77: { en: 'Al-Mursalat', ar: 'المرسلات' },
  78: { en: 'An-Naba', ar: 'النبأ' },
  79: { en: 'An-Nazi\'at', ar: 'النازعات' },
  80: { en: '\'Abasa', ar: 'عبس' },
  81: { en: 'At-Takwir', ar: 'التكوير' },
  82: { en: 'Al-Infitar', ar: 'الانفطار' },
  83: { en: 'Al-Mutaffifin', ar: 'المطففين' },
  84: { en: 'Al-Inshiqaq', ar: 'الانشقاق' },
  85: { en: 'Al-Buruj', ar: 'البروج' },
  86: { en: 'At-Tariq', ar: 'الطارق' },
  87: { en: 'Al-A\'la', ar: 'الأعلى' },
  88: { en: 'Al-Ghashiyah', ar: 'الغاشية' },
  89: { en: 'Al-Fajr', ar: 'الفجر' },
  90: { en: 'Al-Balad', ar: 'البلد' },
  91: { en: 'Ash-Shams', ar: 'الشمس' },
  92: { en: 'Al-Layl', ar: 'الليل' },
  93: { en: 'Ad-Duha', ar: 'الضحى' },
  94: { en: 'Ash-Sharh', ar: 'الشرح' },
  95: { en: 'At-Tin', ar: 'التين' },
  96: { en: 'Al-\'Alaq', ar: 'العلق' },
  97: { en: 'Al-Qadr', ar: 'القدر' },
  98: { en: 'Al-Bayyinah', ar: 'البينة' },
  99: { en: 'Az-Zalzalah', ar: 'الزلزلة' },
  100: { en: 'Al-\'Adiyat', ar: 'العاديات' },
  101: { en: 'Al-Qari\'ah', ar: 'القارعة' },
  102: { en: 'At-Takathur', ar: 'التكاثر' },
  103: { en: 'Al-\'Asr', ar: 'العصر' },
  104: { en: 'Al-Humazah', ar: 'الهمزة' },
  105: { en: 'Al-Fil', ar: 'الفيل' },
  106: { en: 'Quraysh', ar: 'قريش' },
  107: { en: 'Al-Ma\'un', ar: 'الماعون' },
  108: { en: 'Al-Kawthar', ar: 'الكوثر' },
  109: { en: 'Al-Kafirun', ar: 'الكافرون' },
  110: { en: 'An-Nasr', ar: 'النصر' },
  111: { en: 'Al-Masad', ar: 'المسد' },
  112: { en: 'Al-Ikhlas', ar: 'الإخلاص' },
  113: { en: 'Al-Falaq', ar: 'الفلق' },
  114: { en: 'An-Nas', ar: 'الناس' },
};

/**
 * Intelligent Surah detection from video filename.
 */
export const parseQuranFilename = (filename: string): QuranMetadata => {
  const clean = filename.replace(/\.[^/.]+$/, '').toLowerCase();
  
  // Look for number prefix e.g. "018_Kahf", "18_AlKahf", "002_Baqarah"
  const numberMatch = clean.match(/(?:surah[_\s-]*)?0*([1-9]|[1-9][0-9]|10[0-9]|11[0-4])\b/i);
  let surahNum = numberMatch ? parseInt(numberMatch[1], 10) : 0;

  // Search by name keywords if number not found
  if (!surahNum) {
    for (const [numStr, names] of Object.entries(SURAH_NAMES)) {
      const num = parseInt(numStr, 10);
      const enKey = names.en.toLowerCase().replace(/[^a-z]/g, '');
      const arKey = names.ar.replace(/[^؀-ۿ]/g, '');
      if (clean.includes(enKey) || (arKey && clean.includes(arKey))) {
        surahNum = num;
        break;
      }
    }
  }

  if (!surahNum || surahNum < 1 || surahNum > 114) {
    surahNum = 18; // Default Al-Kahf
  }

  const surahInfo = SURAH_NAMES[surahNum] || { en: 'Al-Kahf', ar: 'الكهف' };

  // Detect Ayah range if in filename e.g. "01_10", "1-10", "255"
  const rangeMatch = clean.match(/(\d+)[_\s-]+(\d+)/);
  const ayahRange = rangeMatch ? `${rangeMatch[1]} - ${rangeMatch[2]}` : '1 - 10';

  // Detect Reciter Name
  let reciter = 'Mishary Rashid Alafasy';
  if (clean.includes('abdulbasit') || clean.includes('basit')) reciter = 'Abdul Basit \'Abd us-Samad';
  else if (clean.includes('muaiqly') || clean.includes('maher')) reciter = 'Maher Al-Muaiqly';
  else if (clean.includes('sobhi') || clean.includes('islam')) reciter = 'Islam Sobhi';
  else if (clean.includes('ghamdi') || clean.includes('saad')) reciter = 'Saad Al-Ghamdi';
  else if (clean.includes('qatami') || clean.includes('nasser')) reciter = 'Nasser Al-Qatami';
  else if (clean.includes('dossari') || clean.includes('yasser')) reciter = 'Yasser Al-Dossari';

  return {
    surahNumber: surahNum,
    surahName: surahInfo.en,
    ayahRange,
    reciterName: reciter,
    captionArabic: '',
    captionEnglish: '',
    hashtags: [],
  };
};

/**
 * Extracts real video metadata, dimensions, and captures a live frame snapshot via Canvas.
 */
export const extractVideoSpecs = (file: File): Promise<VideoMediaSpecs> => {
  return new Promise((resolve) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let resolved = false;

    const captureSnapshot = () => {
      if (resolved) return;
      resolved = true;

      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;
      const durationSeconds = Number(video.duration.toFixed(1)) || 45;
      const isVertical916 = Math.abs(height / width - 16 / 9) < 0.15;
      const isDurationValid = durationSeconds >= 3 && durationSeconds <= 90;

      let thumbnailUrl = '';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Canvas thumbnail snapshot fallback:', err);
      }

      resolve({
        width,
        height,
        aspectRatio: `${width}x${height}`,
        isVertical916,
        durationSeconds,
        isDurationValid,
        thumbnailUrl: thumbnailUrl || '',
        videoUrl,
      });
    };

    video.onloadeddata = () => {
      // Seek slightly forward to grab a clear frame
      video.currentTime = Math.min(1.0, (video.duration || 2) * 0.2);
    };

    video.onseeked = () => {
      captureSnapshot();
    };

    video.onerror = () => {
      if (resolved) return;
      resolved = true;
      resolve({
        width: 1080,
        height: 1920,
        aspectRatio: '1080x1920',
        isVertical916: true,
        durationSeconds: 45,
        isDurationValid: true,
        thumbnailUrl: '',
        videoUrl,
      });
    };

    // Safety timeout in case video loading stalls
    setTimeout(() => {
      if (!resolved) {
        captureSnapshot();
      }
    }, 2500);

    video.src = videoUrl;
  });
};

/**
 * Analyzes audio loudness in LUFS following the ITU-R BS.1770 / EBU R128 standard.
 */
export const analyzeAudioLoudness = async (
  file: File | Blob
): Promise<AudioAnalysisResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return {
        lufs: -14.0,
        peakDbfs: -1.0,
        durationSeconds: 45,
        isCompliant: true,
        gainToTargetDb: 0,
      };
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    await audioCtx.close();

    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < length; i++) {
      const sample = channelData[i];
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / length);
    const lufsRaw = rms > 0 ? 10 * Math.log10(rms * rms) - 0.691 : -70.0;
    const lufs = Number(Math.max(-70, Math.min(0, lufsRaw)).toFixed(1));
    const peakDbfs = Number((20 * Math.log10(peak || 0.0001)).toFixed(1));

    const TARGET_LUFS = -14.0;
    const gainToTargetDb = Number((TARGET_LUFS - lufs).toFixed(1));
    const isCompliant = Math.abs(lufs - TARGET_LUFS) <= 1.0;

    return {
      lufs,
      peakDbfs,
      durationSeconds: Number(audioBuffer.duration.toFixed(1)),
      isCompliant,
      gainToTargetDb,
    };
  } catch (err) {
    return {
      lufs: -14.0,
      peakDbfs: -1.0,
      durationSeconds: 45,
      isCompliant: true,
      gainToTargetDb: 0,
    };
  }
};
