export interface CuratedImage {
  id: string
  category: 'Mountains' | 'Oceans' | 'Forests' | 'Mosques'
  title: string
  full: string
  thumb: string
}

export const STOCK_CATEGORIES = ['Mountains', 'Oceans', 'Forests', 'Mosques'] as const
export type StockCategory = (typeof STOCK_CATEGORIES)[number]

const PHOTO_DATABASE: Record<StockCategory, { id: string; title: string }[]> = {
  Mountains: [
    { id: 'photo-1464822759023-fed622ff2c3b', title: 'Misty Alpine Peaks' },
    { id: 'photo-1506744038136-46273834b3fb', title: 'Mountain Valley Horizon' },
    { id: 'photo-1486870591958-9b9d0d1dda99', title: 'Rugged Golden Ridge' },
    { id: 'photo-1454496522488-7a8e488e8606', title: 'Snowy Peak Vista' },
    { id: 'photo-1519681393784-d120267933ba', title: 'Starry Mountain Night' },
    { id: 'photo-1465056836041-7f43ac27dcb5', title: 'Sunlit Mountain Range' },
    { id: 'photo-1544198365-f5d60b6d8190', title: 'Dramatic Rocky Summit' },
  ],
  Oceans: [
    { id: 'photo-1507525428034-b723cf961d3e', title: 'Golden Sunset Coast' },
    { id: 'photo-1518837695005-2083093ee35b', title: 'Deep Blue Ocean Waves' },
    { id: 'photo-1505118380757-91f5f5632de0', title: 'Crystal Aqua Shore' },
    { id: 'photo-1509316975850-ff9c5deb0cd9', title: 'Coastal Serenity' },
    { id: 'photo-1439405326854-014607f694d7', title: 'Ocean Horizon Dusk' },
    { id: 'photo-1518709268805-4e9042af9f23', title: 'Calm Water Reflection' },
  ],
  Forests: [
    { id: 'photo-1448375240586-882707db888b', title: 'Misty Pine Forest' },
    { id: 'photo-1426604966848-d7adac402bff', title: 'Sunbeams Through Trees' },
    { id: 'photo-1473448912268-2022ce9509d8', title: 'Deep Evergreen Woods' },
    { id: 'photo-1441974231531-c6227db76b6e', title: 'Lush Forest Pathway' },
    { id: 'photo-1470071459604-3b5ec3a7fe05', title: 'Foggy Forest Canopy' },
    { id: 'photo-1502082553048-f009c37129b9', title: 'Peaceful Woodland Light' },
    { id: 'photo-1513836279014-a89f7a76ae86', title: 'Tall Redwood Forest' },
  ],
  Mosques: [
    { id: 'photo-1564769625905-50e93615e769', title: 'Grand Mosque Dome & Minarets' },
    { id: 'photo-1584551246679-0daf3d275d0f', title: 'Islamic Archway Light' },
    { id: 'photo-1542810634-71277d95dcbb', title: 'Majestic Mosque Courtyard' },
    { id: 'photo-1585036156171-384164a8c675', title: 'Ornate Mosque Architecture' },
    { id: 'photo-1591604129939-f1efa4d9f7fa', title: 'Minaret at Sunset' },
    { id: 'photo-1578895210405-907db486c111', title: 'Illuminated Mosque Night' },
    { id: 'photo-1589802829985-817e51171b92', title: 'Spiritual Mosque Interior' },
  ],
}

function makeUnsplashUrl(photoId: string, width: number, height: number): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=85`
}

export function getImagesForCategory(
  category: StockCategory,
  width = 1440,
  height = 2560,
): CuratedImage[] {
  const items = PHOTO_DATABASE[category] || PHOTO_DATABASE.Mountains
  return items.map((item) => ({
    id: item.id,
    category,
    title: item.title,
    full: makeUnsplashUrl(item.id, width, height),
    thumb: makeUnsplashUrl(item.id, 450, 800),
  }))
}

export function getRandomStockImage(width = 1440, height = 2560): CuratedImage {
  const categories = STOCK_CATEGORIES
  const randomCat = categories[Math.floor(Math.random() * categories.length)]
  const images = getImagesForCategory(randomCat, width, height)
  return images[Math.floor(Math.random() * images.length)]
}

export const DEFAULT_BACKGROUND_URL = makeUnsplashUrl(
  PHOTO_DATABASE.Mountains[0].id,
  1440,
  2560,
)
