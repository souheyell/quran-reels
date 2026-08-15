export interface CuratedImage {
  id: string
  category: StockCategory
  title: string
  source: 'Unsplash' | 'Picsum' | 'Wikimedia'
  full: string
  thumb: string
}

export const STOCK_CATEGORIES = [
  'Mosques',
  'Mountains',
  'Oceans',
  'Forests',
  'Deserts',
  'Cosmos',
] as const

export type StockCategory = (typeof STOCK_CATEGORIES)[number]

interface RawPhoto {
  id: string
  title: string
  source: 'Unsplash' | 'Picsum' | 'Wikimedia'
  customFull?: string
  customThumb?: string
}

const PHOTO_DATABASE: Record<StockCategory, RawPhoto[]> = {
  Mosques: [
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
  ],
  Mountains: [
    { id: 'photo-1464822759023-fed622ff2c3b', title: 'Misty Alpine Peaks', source: 'Unsplash' },
    { id: 'photo-1506744038136-46273834b3fb', title: 'Mountain Valley Horizon', source: 'Unsplash' },
    { id: 'photo-1486870591958-9b9d0d1dda99', title: 'Rugged Golden Ridge', source: 'Unsplash' },
    { id: 'photo-1454496522488-7a8e488e8606', title: 'Snowy Peak Vista', source: 'Unsplash' },
    { id: 'photo-1519681393784-d120267933ba', title: 'Starry Mountain Night', source: 'Unsplash' },
    { id: 'photo-1465056836041-7f43ac27dcb5', title: 'Sunlit Mountain Range', source: 'Unsplash' },
    { id: 'photo-1544198365-f5d60b6d8190', title: 'Dramatic Rocky Summit', source: 'Unsplash' },
    { id: 'photo-1483728642387-6c3bdd6c93e5', title: 'Alpine Sunset Glow', source: 'Unsplash' },
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Highland Serenity', source: 'Unsplash' },
  ],
  Oceans: [
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Golden Sunset Coast', source: 'Unsplash' },
    { id: 'photo-1518837695005-2083093ee35b', title: 'Deep Blue Ocean Waves', source: 'Unsplash' },
    { id: 'photo-1505118380757-91f5f5632de0', title: 'Crystal Aqua Shore', source: 'Unsplash' },
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Coastal Serenity', source: 'Unsplash' },
    { id: 'photo-1439405326854-014607f694d7', title: 'Ocean Horizon Dusk', source: 'Unsplash' },
    { id: 'photo-1518709268805-4e9042af9f23', title: 'Calm Water Reflection', source: 'Unsplash' },
    { id: 'photo-1500375592092-40eb2168fd21', title: 'Ocean Mist & Foam', source: 'Unsplash' },
    { id: 'photo-1544551763-46a013bb70d5', title: 'Sunset Tide Waters', source: 'Unsplash' },
  ],
  Forests: [
    { id: 'photo-1448375240586-882707db888b', title: 'Misty Pine Forest', source: 'Unsplash' },
    { id: 'photo-1426604966848-d7adac402bff', title: 'Sunbeams Through Trees', source: 'Unsplash' },
    { id: 'photo-1473448912268-2022ce9509d8', title: 'Deep Evergreen Woods', source: 'Unsplash' },
    { id: 'photo-1441974231531-c6227db76b6e', title: 'Lush Forest Pathway', source: 'Unsplash' },
    { id: 'photo-1470071459604-3b5ec3a7fe05', title: 'Foggy Forest Canopy', source: 'Unsplash' },
    { id: 'photo-1502082553048-f009c37129b9', title: 'Peaceful Woodland Light', source: 'Unsplash' },
    { id: 'photo-1513836279014-a89f7a76ae86', title: 'Tall Redwood Forest', source: 'Unsplash' },
    { id: 'photo-1476820865390-c52aeebb9891', title: 'Golden Autumn Trees', source: 'Unsplash' },
  ],
  Deserts: [
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Golden Sand Dunes', source: 'Unsplash' },
    { id: 'photo-1513553404607-988bf2703777', title: 'Sahara Sunset Horizon', source: 'Unsplash' },
    { id: 'photo-1547234935-80c7145ec969', title: 'Arabian Desert Dunes', source: 'Unsplash' },
    { id: 'photo-1473580044384-7ba9967a16a0', title: 'Wind Sculpted Sands', source: 'Unsplash' },
    { id: 'photo-1512453979798-5ea266f8880c', title: 'Desert Twilight', source: 'Unsplash' },
  ],
  Cosmos: [
    { id: 'photo-1506703719100-a0f3a48c0f86', title: 'Milky Way Galaxy', source: 'Unsplash' },
    { id: 'photo-1516339901601-2e1b62dc0c45', title: 'Starry Cosmic Night', source: 'Unsplash' },
    { id: 'photo-1538370965046-79c0d6907d47', title: 'Stellar Night Sky', source: 'Unsplash' },
    { id: 'photo-1451187580459-43490279c0fa', title: 'Cosmic Nebula Wonder', source: 'Unsplash' },
    { id: 'photo-1502134249126-9f3755a50d78', title: 'Deep Space Horizon', source: 'Unsplash' },
  ],
}

function makeUnsplashUrl(photoId: string, width: number, height: number): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=85`
}

/**
 * Retrieve curated stock images with dynamic seed shuffling support for refreshing.
 */
export function getImagesForCategory(
  category: StockCategory,
  shuffleSeed = 0,
  width = 1080,
  height = 1920,
): CuratedImage[] {
  const items = [...(PHOTO_DATABASE[category] || PHOTO_DATABASE.Mosques)]

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
    thumb: item.customThumb || makeUnsplashUrl(item.id, 450, 800),
  }))
}

/**
 * Select a random stock image across all available categories and photo sources.
 */
export function getRandomStockImage(width = 1080, height = 1920): CuratedImage {
  const categories = STOCK_CATEGORIES
  const randomCat = categories[Math.floor(Math.random() * categories.length)]
  const images = getImagesForCategory(randomCat, Math.floor(Math.random() * 10), width, height)
  return images[Math.floor(Math.random() * images.length)]
}

export const DEFAULT_BACKGROUND_URL = makeUnsplashUrl(
  PHOTO_DATABASE.Mosques[0].id,
  1080,
  1920,
)
