import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import PagerView from 'react-native-pager-view';
import { imagesApi } from '../lib/api';
import { storage } from '../lib/storage';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

interface MenuItemProps {
  item: any;
  sectionIndex: number;
  itemIndex: number;
  onToggle: (expanded: boolean) => void;
}

const MenuItem = memo(({ item, sectionIndex, itemIndex, onToggle }: MenuItemProps) => {
  const itemName = item.name_translation || item.name;
  const [expanded, setExpanded] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageScrollPosition, setImageScrollPosition] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDishImages = useCallback(async (forceAll: boolean = false) => {
    if (!itemName) return;

    // Don't re-fetch if we already have all images
    if (images.length >= 5) return;

    // Only show loading spinner when fetching full set
    if (forceAll) {
      setImagesLoading(true);
    }

    try {
      // Try to get cached images first
      const cached = await storage.getDishImages(itemName);
      if (cached && cached.length > 0 && isMountedRef.current) {
        console.log(`[Image Cache] Loaded ${cached.length} cached images for "${itemName}"`);
        setImages(cached);
        if (forceAll && isMountedRef.current) {
          setImagesLoading(false);
        }
        return;
      }

      // Fetch from API (always 5 images)
      console.log(`[Image API] Fetching images for "${itemName}" (limit: 5)`);
      const apiImages = await imagesApi.fetchDishImages(itemName, 5);

      if (isMountedRef.current) {
        const imageUrls = apiImages.map((img: any) => img.url);
        console.log(`[Image API] Received ${imageUrls.length} images for "${itemName}"`);
        setImages(imageUrls);

        // Cache locally
        if (imageUrls.length > 0) {
          await storage.saveDishImages(itemName, imageUrls);
          console.log(`[Image Cache] Cached ${imageUrls.length} images for "${itemName}"`);
        }
      }
    } catch (error) {
      console.error(`Failed to load images for "${itemName}":`, error);
      if (isMountedRef.current) {
        setImages([]);
      }
    } finally {
      if (isMountedRef.current && forceAll) {
        setImagesLoading(false);
      }
    }
  }, [itemName, images.length]);

  // Fetch first image on mount for collapsed thumbnail
  useEffect(() => {
    if (itemName && images.length === 0) {
      fetchDishImages(false);
    }
  }, [itemName]);

  const handleToggle = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle(newExpanded);

    // Lazy load all images when expanding
    if (newExpanded && images.length < 5) {
      fetchDishImages(true);
    }
  }, [expanded, images.length, fetchDishImages, onToggle]);

  const firstImage = images?.[0];

  return (
    <View style={styles.menuItem}>
      {/* Header: Collapsed View */}
      <TouchableOpacity
        style={styles.menuItemCollapsedButton}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailContainer}>
          {imagesLoading ? (
            <ActivityIndicator size="small" color="#667eea" style={styles.dishImage} />
          ) : firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.dishImage} />
          ) : (
            <Image
              source={{ uri: 'https://via.placeholder.com/80' }}
              style={styles.dishImage}
            />
          )}
        </View>
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName} numberOfLines={expanded ? undefined : 1}>
            {item.name_translation || item.name}
          </Text>
          {item.price && <Text style={styles.menuItemPrice}>{item.price}</Text>}
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#667eea" />
        ) : (
          <ChevronDown size={20} color="#999" />
        )}
      </TouchableOpacity>

      {/* Expanded View: All Details */}
      {expanded && (
        <View style={styles.menuItemExpanded}>
          {/* Prominent Image Carousel */}
          {images && (images.length > 0 || imagesLoading) && (
            <View style={styles.imageSection}>
              {imagesLoading ? (
                <View style={styles.prominentImageContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <Text style={styles.loadingImageText}>Loading photos...</Text>
                </View>
              ) : (
                <>
                  <PagerView
                    style={styles.imageCarousel}
                    initialPage={0}
                    onPageSelected={(e) => {
                      setImageScrollPosition(e.nativeEvent.position);
                    }}
                  >
                    {images.map((imgUrl: string, idx: number) => (
                      <View key={idx} style={styles.pageContainer}>
                        <Image source={{ uri: imgUrl }} style={styles.prominentImage} />
                      </View>
                    ))}
                  </PagerView>

                  {/* Image Indicators */}
                  {images.length > 1 && (
                    <View style={styles.imageIndicators}>
                      {images.map((_, idx: number) => (
                        <View
                          key={idx}
                          style={[
                            styles.indicatorDot,
                            idx === imageScrollPosition
                              ? styles.indicatorDotActive
                              : styles.indicatorDotInactive,
                          ]}
                        />
                      ))}
                      <Text style={styles.imageCounter}>
                        {imageScrollPosition + 1} / {images.length}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {item.original_description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Original:</Text>
              <Text style={styles.detailText}>{item.original_description}</Text>
            </View>
          )}

          {item.description_translation && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailText}>{item.description_translation}</Text>
            </View>
          )}

          {item.characteristics?.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Characteristics:</Text>
              <View style={styles.tags}>
                {item.characteristics.map((char: string, i: number) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{char}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.possible_allergens?.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Possible Allergens:</Text>
              <Text style={styles.allergensText}>{item.possible_allergens.join(', ')}</Text>
            </View>
          )}

          {item.similar_dishes?.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Similar to:</Text>
              <Text style={styles.detailText}>{item.similar_dishes.join(', ')}</Text>
            </View>
          )}

          {item.raw_text && (
            <View style={styles.detailSection}>
              <Text style={styles.debugLabel}>Raw menu text:</Text>
              <Text style={styles.debugText}>{item.raw_text}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

MenuItem.displayName = 'MenuItem';

const styles = StyleSheet.create({
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItemCollapsedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  menuItemExpanded: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  imageSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
  imageCarousel: {
    width: '100%',
    height: 300,
  },
  pageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prominentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  prominentImageContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
  loadingImageText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
  },
  indicatorDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageCounter: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  detailSection: {
    marginTop: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '500',
  },
  allergensText: {
    fontSize: 12,
    color: '#991b1b',
  },
  debugLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
});

export default MenuItem;
