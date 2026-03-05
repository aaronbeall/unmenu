import Redis from 'ioredis';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redisClient;
}

export interface DishImage {
  id: string;
  url: string;
  photographer: string;
  photographer_url: string;
  source: 'pexels';
}

/**
 * Fetch dish images from Pexels API and cache them
 * Returns up to 5 images for the dish that can be swiped through
 */
export async function fetchDishImages(dishName: string, limit: number = 5): Promise<DishImage[]> {
  if (!PEXELS_API_KEY) {
    console.warn('[Dish Images] PEXELS_API_KEY not configured, returning empty array');
    return [];
  }

  const cacheKey = `dish_images:${dishName.toLowerCase()}:${limit}`;

  try {
    // Check cache first
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const images = JSON.parse(cached);
      console.log(`[Dish Images] Cache HIT for "${dishName}" - ${images.length} images`);
      return images;
    }
    
    console.log(`[Dish Images] Cache MISS for "${dishName}" - Calling Pexels API`);

    // Search Pexels for food images
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', `${dishName} food dish`);
    url.searchParams.set('per_page', limit.toString());
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json() as { photos: any[] };

    const images: DishImage[] = data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      source: 'pexels' as const,
    }));

    console.log(`[Dish Images] Pexels API returned ${images.length} images for "${dishName}"`);

    // Cache the results
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(images));
    console.log(`[Dish Images] Cached ${images.length} images for "${dishName}" (TTL: 30 days)`);

    return images;
  } catch (error) {
    console.error('Error fetching dish images:', error);
    return [];
  }
}

/**
 * Preload images for all dishes in a menu (background job)
 */
export async function preloadMenuImages(menu: any): Promise<void> {
  if (!menu?.sections) return;

  const dishNames: string[] = [];
  for (const section of menu.sections) {
    for (const item of section.items) {
      // Use the translated name for better image search results
      dishNames.push(item.name_translation || item.name);
    }
  }

  console.log(`[Dish Images] Preloading images for ${dishNames.length} dishes`);

  // Fetch images in parallel but don't wait for them
  Promise.all(
    dishNames.map(name => fetchDishImages(name, 3))
  ).then(results => {
    const totalImages = results.reduce((sum, imgs) => sum + imgs.length, 0);
    console.log(`[Dish Images] Preload complete - ${totalImages} total images cached`);
  }).catch(err => console.error('[Dish Images] Error preloading menu images:', err));
}
