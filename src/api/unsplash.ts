export interface CuratedMedia {
  id: string
  category: StockCategory
  title: string
  source: 'Unsplash' | 'Pexels' | 'Pixabay' | 'Wikimedia' | 'Coverr' | 'Mixkit'
  full: string
  thumb: string
  mediaType: 'image' | 'video'
}

export type CuratedImage = CuratedMedia

export const STOCK_CATEGORIES = [
  'Mosques & Holy Sites',
  'Mountains & Summits',
  'Oceans & Waterfalls',
  'Forests & Redwoods',
  'Deserts & Dunes',
  'Cosmos & Galaxies',
  'Sunsets & Golden Hour',
  'Rain & Atmospheric Fog',
] as const

export type StockCategory = (typeof STOCK_CATEGORIES)[number]

interface RawMedia {
  id: string
  title: string
  source: 'Unsplash' | 'Pexels' | 'Pixabay' | 'Wikimedia' | 'Coverr' | 'Mixkit'
  customFull?: string
  customThumb?: string
  mediaType?: 'image' | 'video'
}

const PHOTO_DATABASE: Record<StockCategory, RawMedia[]> = {
  'Mosques & Holy Sites': [
    { id: 'photo-1564769625905-50e93615e769', title: 'Grand Mosque Dome & Minarets', source: 'Unsplash' },
    { id: 'photo-1584551246679-0daf3d275d0f', title: 'Islamic Archway Light', source: 'Unsplash' },
    { id: 'photo-1542810634-71277d95dcbb', title: 'Majestic Mosque Courtyard', source: 'Unsplash' },
    { id: 'photo-1585036156171-384164a8c675', title: 'Ornate Mosque Architecture', source: 'Unsplash' },
    { id: 'photo-1591604129939-f1efa4d9f7fa', title: 'Minaret at Sunset', source: 'Unsplash' },
    { id: 'photo-1578895210405-907db486c111', title: 'Illuminated Mosque Night', source: 'Unsplash' },
    { id: 'photo-1589802829985-817e51171b92', title: 'Spiritual Mosque Interior', source: 'Unsplash' },
    { id: 'photo-1519817650390-64a93db51149', title: 'Blue Mosque Silhouette', source: 'Unsplash' },
    { id: 'photo-1548013146-72479768bada', title: 'Historic Marble Minarets', source: 'Unsplash' },
    { id: 'photo-1580418827493-f2b22c0a76cb', title: 'Golden Hour Mosque View', source: 'Unsplash' },
    { id: 'photo-1570535608479-ce04e548f060', title: 'Islamic Geometric Arches', source: 'Unsplash' },
    { id: 'photo-1590076215667-875d4ef2d7ee', title: 'Dome Ceiling Calligraphy', source: 'Unsplash' },
  ],
  'Mountains & Summits': [
    { id: 'photo-1464822759023-fed622ff2c3b', title: 'Misty Alpine Peaks', source: 'Unsplash' },
    { id: 'photo-1506744038136-46273834b3fb', title: 'Mountain Valley Horizon', source: 'Unsplash' },
    { id: 'photo-1486870591958-9b9d0d1dda99', title: 'Rugged Golden Ridge', source: 'Unsplash' },
    { id: 'photo-1454496522488-7a8e488e8606', title: 'Snowy Peak Vista', source: 'Unsplash' },
    { id: 'photo-1519681393784-d120267933ba', title: 'Starry Mountain Night', source: 'Unsplash' },
    { id: 'photo-1465056836041-7f43ac27dcb5', title: 'Sunlit Mountain Range', source: 'Unsplash' },
    { id: 'photo-1544198365-f5d60b6d8190', title: 'Dramatic Rocky Summit', source: 'Unsplash' },
    { id: 'photo-1483728642387-6c3bdd6c93e5', title: 'Alpine Sunset Glow', source: 'Unsplash' },
    { id: 'photo-1470770841072-f978cf4d019e', title: 'Serene Highland View', source: 'Unsplash' },
    { id: 'photo-1517824806704-9040b037703b', title: 'Mountain Lake Reflection', source: 'Unsplash' },
  ],
  'Oceans & Waterfalls': [
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Golden Sunset Coast', source: 'Unsplash' },
    { id: 'photo-1518837695005-2083093ee35b', title: 'Deep Blue Ocean Waves', source: 'Unsplash' },
    { id: 'photo-1505118380757-91f5f5632de0', title: 'Crystal Aqua Shore', source: 'Unsplash' },
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Coastal Serenity', source: 'Unsplash' },
    { id: 'photo-1439405326854-014607f694d7', title: 'Ocean Horizon Dusk', source: 'Unsplash' },
    { id: 'photo-1518709268805-4e9042af9f23', title: 'Calm Water Reflection', source: 'Unsplash' },
    { id: 'photo-1500375592092-40eb2168fd21', title: 'Ocean Mist & Foam', source: 'Unsplash' },
    { id: 'photo-1544551763-46a013bb70d5', title: 'Sunset Tide Waters', source: 'Unsplash' },
    { id: 'photo-1432405972618-c60b0225b8f9', title: 'Misty Waterfall Cascade', source: 'Unsplash' },
    { id: 'photo-1476673160081-cf065607f449', title: 'Turquoise Tropical Waves', source: 'Unsplash' },
  ],
  'Forests & Redwoods': [
    { id: 'photo-1448375240586-882707db888b', title: 'Misty Pine Forest', source: 'Unsplash' },
    { id: 'photo-1426604966848-d7adac402bff', title: 'Sunbeams Through Trees', source: 'Unsplash' },
    { id: 'photo-1473448912268-2022ce9509d8', title: 'Deep Evergreen Woods', source: 'Unsplash' },
    { id: 'photo-1441974231531-c6227db76b6e', title: 'Lush Forest Pathway', source: 'Unsplash' },
    { id: 'photo-1470071459604-3b5ec3a7fe05', title: 'Foggy Forest Canopy', source: 'Unsplash' },
    { id: 'photo-1502082553048-f009c37129b9', title: 'Peaceful Woodland Light', source: 'Unsplash' },
    { id: 'photo-1513836279014-a89f7a76ae86', title: 'Tall Redwood Forest', source: 'Unsplash' },
    { id: 'photo-1476820865390-c52aeebb9891', title: 'Golden Autumn Trees', source: 'Unsplash' },
    { id: 'photo-1511497584788-87676104235f', title: 'Emerald Canopy Rays', source: 'Unsplash' },
  ],
  'Deserts & Dunes': [
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Golden Sand Dunes', source: 'Unsplash' },
    { id: 'photo-1513553404607-988bf2703777', title: 'Sahara Sunset Horizon', source: 'Unsplash' },
    { id: 'photo-1547234935-80c7145ec969', title: 'Arabian Desert Dunes', source: 'Unsplash' },
    { id: 'photo-1473580044384-7ba9967a16a0', title: 'Wind Sculpted Sands', source: 'Unsplash' },
    { id: 'photo-1512453979798-5ea266f8880c', title: 'Desert Twilight', source: 'Unsplash' },
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Desert Oasis Warmth', source: 'Unsplash' },
  ],
  'Cosmos & Galaxies': [
    { id: 'photo-1506703719100-a0f3a48c0f86', title: 'Milky Way Galaxy', source: 'Unsplash' },
    { id: 'photo-1516339901601-2e1b62dc0c45', title: 'Starry Cosmic Night', source: 'Unsplash' },
    { id: 'photo-1538370965046-79c0d6907d47', title: 'Stellar Night Sky', source: 'Unsplash' },
    { id: 'photo-1451187580459-43490279c0fa', title: 'Cosmic Nebula Wonder', source: 'Unsplash' },
    { id: 'photo-1502134249126-9f3755a50d78', title: 'Deep Space Horizon', source: 'Unsplash' },
    { id: 'photo-1534447677768-be436bb09401', title: 'Cosmic Starburst', source: 'Unsplash' },
  ],
  'Sunsets & Golden Hour': [
    { id: 'photo-1495616811223-4d98c6e9c869', title: 'Warm Golden Horizon', source: 'Unsplash' },
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Twilight Sky Reflection', source: 'Unsplash' },
    { id: 'photo-1472214103451-9374bd1c798e', title: 'Sunlit Meadow Horizon', source: 'Unsplash' },
    { id: 'photo-1494548162494-384bba4ab999', title: 'Dawning Light Rays', source: 'Unsplash' },
    { id: 'photo-1518495973542-4542c06a5843', title: 'Golden Hour Sky', source: 'Unsplash' },
  ],
  'Rain & Atmospheric Fog': [
    { id: 'photo-1515694346937-94d85e41e6f0', title: 'Gentle Rain Drops', source: 'Unsplash' },
    { id: 'photo-1534274988757-a28bf1a57c17', title: 'Soothing Rain on Leaves', source: 'Unsplash' },
    { id: 'photo-1486016006115-74a41448aea2', title: 'Misty Atmospheric Fog', source: 'Unsplash' },
    { id: 'photo-1509114397022-ed747cca3f65', title: 'Storm Cloud Vista', source: 'Unsplash' },
    { id: 'photo-1519692933481-e162a57d6721', title: 'Raindrops on Window', source: 'Unsplash' },
  ],
}

export const STOCK_VIDEO_LOOPS: CuratedMedia[] = [
  {
    id: 'video-clouds-timelapse',
    category: 'Sunsets & Golden Hour',
    title: 'Majestic Clouds Timelapse',
    source: 'Mixkit',
    full: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=300&h=400&q=70',
    mediaType: 'video',
  },
  {
    id: 'video-stars-space',
    category: 'Cosmos & Galaxies',
    title: 'Starry Space Nebula Loop',
    source: 'Mixkit',
    full: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&h=400&q=70',
    mediaType: 'video',
  },
  {
    id: 'video-waterfall-stream',
    category: 'Oceans & Waterfalls',
    title: 'Mountain Waterfall Cascade',
    source: 'Mixkit',
    full: 'https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=300&h=400&q=70',
    mediaType: 'video',
  },
  {
    id: 'video-ocean-sunset',
    category: 'Sunsets & Golden Hour',
    title: 'Sunset Ocean Waves',
    source: 'Mixkit',
    full: 'https://assets.mixkit.co/videos/preview/mixkit-sunset-over-the-ocean-horizon-1189-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&h=400&q=70',
    mediaType: 'video',
  },
  {
    id: 'video-rain-nature',
    category: 'Rain & Atmospheric Fog',
    title: 'Rain on Leaves Loop',
    source: 'Mixkit',
    full: 'https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-drops-falling-on-leaves-42589-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=300&h=400&q=70',
    mediaType: 'video',
  },
]

function makeUnsplashUrl(photoId: string, width: number, height: number): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=85`
}

/**
 * Retrieve curated stock images and videos with dynamic seed shuffling support for refreshing.
 */
export function getImagesForCategory(
  category: StockCategory,
  shuffleSeed = 0,
  width = 1080,
  height = 1920,
): CuratedMedia[] {
  const items = [...(PHOTO_DATABASE[category] || PHOTO_DATABASE['Mosques & Holy Sites'])]

  // If shuffleSeed > 0, rotate items to provide fresh variety
  if (shuffleSeed > 0) {
    const shift = shuffleSeed % items.length
    const rotated = [...items.slice(shift), ...items.slice(0, shift)]
    items.length = 0
    items.push(...rotated)
  }

  return items.map((item) => ({
    id: item.id,
    category,
    title: item.title,
    source: item.source,
    full: item.customFull || makeUnsplashUrl(item.id, width, height),
    thumb: item.customThumb || makeUnsplashUrl(item.id, 240, 320),
    mediaType: item.mediaType || 'image',
  }))
}

/**
 * Filter images and videos by keyword across all categories.
 */
export function searchStockImages(query: string, width = 1080, height = 1920): CuratedMedia[] {
  const q = query.trim().toLowerCase()
  if (!q) return getImagesForCategory('Mosques & Holy Sites', 0, width, height)

  const all: CuratedMedia[] = []
  for (const cat of STOCK_CATEGORIES) {
    const images = getImagesForCategory(cat, 0, width, height)
    for (const img of images) {
      if (
        img.title.toLowerCase().includes(q) ||
        img.category.toLowerCase().includes(q)
      ) {
        all.push(img)
      }
    }
  }

  for (const v of STOCK_VIDEO_LOOPS) {
    if (v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)) {
      all.unshift(v)
    }
  }

  return all.length > 0 ? all : getImagesForCategory('Mosques & Holy Sites', 0, width, height)
}

/**
 * Select a random stock image across all available categories and photo sources.
 */
export function getRandomStockImage(width = 1080, height = 1920): CuratedMedia {
  const categories = STOCK_CATEGORIES
  const randomCat = categories[Math.floor(Math.random() * categories.length)]
  const images = getImagesForCategory(randomCat, Math.floor(Math.random() * 10), width, height)
  return images[Math.floor(Math.random() * images.length)]
}

export const DEFAULT_BACKGROUND_URL = makeUnsplashUrl(
  PHOTO_DATABASE['Mosques & Holy Sites'][0].id,
  1080,
  1920,
)
