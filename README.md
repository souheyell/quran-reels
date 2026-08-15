# Islamic Reels Creator (Studio) 🎬📖✨

A high-performance, studio-grade browser application for creating breathtaking Quran verse video reels for **Instagram Reels, TikTok, YouTube Shorts, and WhatsApp Status**. 

Overlays sacred Quranic verses with authentic **Thuluth script vector calligraphy**, customizable Arabic typography, multi-lingual translations, 6 cinematic camera motions, synchronized high-fidelity audio from **25 classical and modern master Qaris**, and fast hardware-accelerated **1080p MP4** video export.

---

## 🌟 Key Features

### 📜 Authentic Thuluth Vector Calligraphy & Basmalah Centerpiece
- **114 Classical Surah Title Emblems**: Vector glyphs rendered in traditional Thuluth script with high-DPI canvas caching.
- **Sacred Thuluth Basmalah Emblem (`﷽`)**: Majestic centerpiece opening banner for Ayah 1 of any Surah with automatic text cleansing.
- **Surah Title Header Continuity**: Elegant top header displays the Surah emblem with Ayah number positioned underneath.

---

### 🎙️ 25 Golden-Age & Contemporary Master Reciters (Qaris)
High-speed, sample-accurate audio recitations directly from the EveryAyah CDN:

#### 👑 Golden Age Classical Masters (كبار قراء العصر الذهبي)
- **Mahmoud Khalil Al-Husary** (Murattal & Mujawwad) — الشيخ محمود خليل الحصري
- **Abdulbasit Abdussamad** (Murattal & Mujawwad) — الشيخ عبد الباسط عبد الصمد
- **Mohamed Siddiq Al-Minshawi** (Murattal & Mujawwad) — الشيخ محمد صديق المنشاوي
- **Mustafa Ismail** — الشيخ مصطفى إسماعيل
- **Mohammad Mahmoud Al-Tablawi** — الشيخ محمد محمود الطبلاوي
- **Mahmoud Ali Al-Banna** — الشيخ محمود علي البنا
- **Ali Hajjaj Al-Suwaisi** — الشيخ علي حجاج السويسي
- **Ali Jaber (Former Imam of Masjid Al-Haram)** — الشيخ علي جابر
- **Muhammad Ayyub (Former Imam of Masjid An-Nabawi)** — الشيخ محمد أيوب
- **Ali Al-Hudhaify (Madinah Imam)** — الشيخ علي الحذيفي
- **Ibrahim Al-Akhdar** — الشيخ إبراهيم الأخضر

#### ✨ Contemporary Masters & Haram Imams (أئمة الحرمين والقراء المعاصرون)
- **Mishary Rashid Alafasy** — الشيخ مشاري راشد العفاسي
- **Abdul Rahman Al-Sudais** — الشيخ عبد الرحمن السديس
- **Saud Al-Shuraim** — الشيخ سعود الشريم
- **Yasser Al-Dosari** — الشيخ ياسر الدوسري
- **Maher Al-Muaiqly** — الشيخ ماهر المعيقلي
- **Nasser Al-Qatami** — الشيخ ناصر القطامي
- **Abu Bakr Al-Shatri** — الشيخ أبو بكر الشاطري
- **Saad Al-Ghamdi** — الشيخ سعد الغامدي
- **Fares Abbad** — الشيخ فارس عباد
- **Hani Ar-Rifai** — الشيخ هاني الرفاعي
- **Salah Al-Budair** — الشيخ صلاح البدير

---

### 🖼️ 6 Themed Footage Categories with Live Refresh
- 🕌 **Mosques & Architecture**: Grand illuminated domes, historic minarets, marble arches, courtyards.
- 🏔️ **Mountains & Summits**: Misty alpine peaks, golden sunset ridges, snowy vistas.
- 🌊 **Oceans & Shores**: Deep blue horizons, sunset coasts, crystal turquoise waters.
- 🌲 **Forests & Redwoods**: Sunlit forest canopies, misty evergreens, woodland pathways.
- 🏜️ **Deserts & Dunes**: Golden Arabian sand dunes, Sahara sunset, twilight sands.
- 🌌 **Cosmos & Night Sky**: Milky Way galaxy, starry constellations, deep space horizons.
- **🔄 1-Click Live Refresh**: Shuffle and rotate the stock library to discover new images dynamically.

---

### 🎥 7 Cinematic Camera Motion Techniques
Continuous unbroken motion across the entire video reel (never resets between ayahs):
1. **🔍 Ken Burns Zoom In**: Slow push-in (`1.08x` → `1.22x`).
2. **🔎 Ken Burns Zoom Out (Reveal)**: Starts tight and gracefully pulls back (`1.22x` → `1.08x`).
3. **↔️ Horizontal Pan Drift**: Smooth horizontal tracking across horizons.
4. **⬆️ Ascending Tilt**: Vertical tilt glide designed for minarets, mountains, and tall redwoods.
5. **↗️ Diagonal Cinematic Glide**: Smooth diagonal travel with depth zoom.
6. **🌊 Contemplative Pulse**: Subtle, meditative breathing wave motion.
7. **⏹️ Still Canvas**: Static image with zero camera movement.

---

### 🎬 In-Editor Video Controls & Audio Timing Fix
- **Interactive Scrubber Bar**: Seek anywhere in the video timeline with ayah tick markers.
- **Transport Controls**: Play/Pause, Previous/Next Ayah, Restart, and Volume slider.
- **Sample-Accurate Multi-Ayah Timing**: Each ayah finishes 100% before the pause and next ayah start.
- **Zero-Flicker Dissolve Transitions**: Smooth cubic easing (`smoothStep`) fade-in and contemplation fade-out.
- **Configurable Ayah Pause Delay Slider**: Set silence between ayahs from `0.0s` to `5.0s` (default `1.6s`).

---

### 🖋️ 9 Classical Quranic & Contemporary Arabic Typefaces
- **📜 Classical Quranic & Naskh**: *Scheherazade New* (Traditional Mushaf), *Amiri Quran* (Bulaq Heritage), *Noto Naskh Arabic* (Digital Crisp).
- **✒️ Calligraphic & Artistic Scripts**: *Reem Kufi* (Majestic Kufic), *Aref Ruqaa* (Ottoman Calligraphy).
- **📱 Modern Social Video Typography**: *Cairo* (Reels Display), *Tajawal* (Contemporary Sans), *Noto Sans Arabic* (Clean Minimalist), *Almarai* (Modern Geometric).

---

### 💾 Automatic Continuous Settings Persistence
- All selections (fonts, sizes, colors, overlay opacity, pause delay, Basmalah toggle, motion style, footer branding, and verse loader locks) are automatically saved to `localStorage` in real time.

---

### ⚡ Memory-Bounded 1080p MP4 Video Export
- **Universal Hardware Acceleration**: Powered by WebCodecs `VideoEncoder` + `AudioEncoder` with `mp4-muxer`.
- **Memory-Bounded Backpressure Control**: Caps encoder queue to <50MB RAM, completely preventing tab lag or flushing errors.
- **Standard Full HD Export Sizes**:
  - `9:16`: Vertical Reels (`1080 × 1920`)
  - `1:1`: Square Post (`1080 × 1080`)
  - `16:9`: Landscape Video (`1920 × 1080`)
- **AAC-LC Stereo Audio (44.1kHz)** muxed directly in exact synchronization with the recitation.

---

## 🛠️ Technology Stack

- **Framework**: React 19, TypeScript, Vite
- **Rendering Engine**: HTML5 Canvas 2D with RTL Arabic typography & high-DPI scaling
- **Media Pipeline**: WebCodecs `VideoEncoder` / `AudioEncoder`, Web Audio API, `mp4-muxer`
- **APIs & Data**: [Al-Quran Cloud API](https://alquran.cloud/api), [EveryAyah CDN](https://everyayah.com), [Unsplash](https://unsplash.com)
- **Quality & Testing**: Vitest (31/31 unit tests passing), Oxlint (0 warnings), TypeScript Strict Mode

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/quran-reels.git
cd quran-reels

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with audio proxy |
| `npm run typecheck` | Run TypeScript strict compiler checks (`tsc -b`) |
| `npm test` | Run test suite with Vitest (31 unit tests) |
| `npm run lint` | Fast linter with Oxlint (0 warnings) |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Preview production build locally |

---

## 🌐 Netlify Deployment

This repository includes a production-ready `netlify.toml` with:
- **COOP / COEP Headers**: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` for hardware WebCodecs.
- **Audio Proxy Redirects**: Proxying audio with complete CORS headers.
- **SPA Fallback**: Single-page application client routing rules.

---

## 📄 License

Open-source under the [MIT License](LICENSE). Built for Quran Dawah, reflection, and educational purposes.
