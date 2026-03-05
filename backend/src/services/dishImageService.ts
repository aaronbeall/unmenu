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
    console.warn('PEXELS_API_KEY not configured, returning empty array');
    return [];
  }

  const cacheKey = `dish_images:${dishName.toLowerCase()}:${limit}`;

  try {
    // Check cache first
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

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

    // Cache the results
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(images));

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

  // Fetch images in parallel but don't wait for them
  Promise.all(
    dishNames.map(name => fetchDishImages(name, 3))
  ).catch(err => console.error('Error preloading menu images:', err));
}
