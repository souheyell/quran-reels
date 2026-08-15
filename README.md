# Islamic Reels Creator (Studio) 🎬📖

A high-performance browser studio for generating short-form video reels for **Instagram Reels, TikTok, and YouTube Shorts**. Overlays Quranic verses (Arabic calligraphy + translation) over high-definition nature & mosque landscapes with smooth Ken Burns motion, synchronized audio recitations by renowned Qaris, custom branding watermarks, and fast hardware-accelerated **H.264 MP4** video export.

---

## ✨ Features

- 📖 **Verse & Multi-Ayah Support**:
  - Load individual verses or continuous ayah ranges across all 114 Surahs.
  - Quick picks for beloved passages (*Ayat al-Kursi*, *Surah Al-Fatiha*, *Ar-Rahman*, *Ash-Sharh*, *Al-Ikhlas*, *Ya-Sin*).
  - 🎲 One-click safe random verse discovery.
  - Translations in English (*Saheeh International*, *Pickthall*, *Muhammad Asad*), Urdu, Bengali, Hindi, and French.

- 🎙️ **15+ Renowned Quran Reciters (Qaris)**:
  - **Mishary Rashid Alafasy**
  - **Ali Jaber (علي جابر)**
  - **Mohamed Ayoub (محمد أيوب)**
  - **AbdulBaset AbdulSamad**
  - **Maher Al-Muaiqly**
  - **Abdurrahmaan As-Sudais**
  - **Yasser Al-Dosari**
  - **Saad Al-Ghamdi**
  - **Nasser Al-Qatami**
  - **Abu Bakr Ash-Shaatree**
  - **Ahmed ibn Ali al-Ajamy**
  - **Mahmoud Khalil Al-Husary** & **Al-Husary (Mujawwad)**
  - **Ali Al-Hudhaify**, **Saood Ash-Shuraym**, **Hani Ar-Rifai**, **Muhammad Jibreel**, **Abdullah Basfar**, **Ibrahim Akhdar**.

- 🖼️ **Curated Nature & Mosque Stock Library**:
  - 🏔️ **Mountains**: Misty alpine peaks, golden summits, and mountain vistas.
  - 🌊 **Oceans**: Sunset coastlines, deep ocean waves, and crystal shores.
  - 🌲 **Forests**: Evergreen pine forests, woodland paths, and sunlit canopies.
  - 🕌 **Mosques**: Grand illuminated domes, minarets at dusk, and spiritual archways.

- 🏷️ **Footer & Social Branding / Watermark**:
  - Customizable footer watermark for creators (*Instagram @handle*, *TikTok @handle*, *YouTube ▶ channel*, *© Copyright notice*, or plain text).
  - Full control over opacity, font size, and drop shadow glow for maximum legibility.

- 🎥 **Hardware-Accelerated MP4 Video Export**:
  - **H.264 (AVC Level 5.1)** video encoding powered by browser WebCodecs and `mp4-muxer` (10–20x faster than ffmpeg.wasm).
  - **AAC-LC Stereo Audio (44.1kHz)** muxed directly into the MP4 file in exact sync with recitation.
  - Supports 9:16 (Vertical Reels 1440×2560), 1:1 (Square 1440×1440), and 16:9 (Landscape 2560×1440).
  - Instant PNG still frame download.

- 🎨 **Deep Visual Customization**:
  - Arabic calligraphy font selection (*Scheherazade New*, *Amiri*, *Lateef*, *Reem Kufi*, *Noto Naskh Arabic*).
  - Translation font styling and proportional font sizing.
  - Text position: Center or Lower-Third.
  - Ken Burns motion effects (Zoom, Pan, Static) with per-verse cycle timers.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Rendering Engine**: HTML5 Canvas 2D with proportional responsive scaling & RTL Arabic typography layout
- **Audio & Video Encoding**: WebCodecs `VideoEncoder` + `AudioEncoder`, Web Audio API, `mp4-muxer`
- **APIs**: [Al-Quran Cloud API](https://alquran.cloud/api), [EveryAyah CDN](https://everyayah.com), [Unsplash](https://unsplash.com)
- **Testing & Quality**: Vitest, Oxlint, TypeScript strict mode

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (or Node.js 20+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/quran-reels.git
cd quran-reels

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with audio proxy |
| `npm run typecheck` | Run TypeScript strict compiler checks (`tsc -b`) |
| `npm test` | Run test suite with Vitest |
| `npm run lint` | Fast linter with Oxlint |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Preview production build locally |

---

## 🌐 Netlify Deployment

This project includes a pre-configured `netlify.toml` with:
- **COOP / COEP Headers**: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` for WebCodecs hardware acceleration.
- **Audio Proxy Redirects**: `/quran-audio/*` proxying to `cdn.islamic.network` with CORS support.
- **SPA Fallback**: Single-page application routing rewrite rules.

Deploy directly on Netlify by connecting your GitHub repository.

---

## 📄 License

Open-source under the [MIT License](LICENSE). Built for Quran Dawah, reflection, and educational purposes.
