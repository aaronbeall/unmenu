import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { menuApi, imagesApi } from '../lib/api';
import { storage } from '../lib/storage';
import { ArrowLeft, Trash2, Menu } from 'lucide-react-native';

export default function SavedMenus() {
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const response = await menuApi.getSavedMenus();
      setMenus(response.menus);
      // Load preview images for each menu
      response.menus.forEach((menu: any) => {
        loadPreviewImage(menu);
      });
    } catch (error) {
      const offlineMenus = await storage.getAllSavedMenus();
      setMenus(offlineMenus as any);
      (offlineMenus as any).forEach((menu: any) => {
        loadPreviewImage(menu);
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreviewImage = async (menu: any) => {
    try {
      // Get the first dish from the first section
      const firstDish = menu.menu_data?.sections?.[0]?.items?.[0];
      if (!firstDish) return;

      const dishName = firstDish.name_translation || firstDish.name;
      
      // Try to get cached images first
      const cached = await storage.getDishImages(dishName);
      if (cached && cached.length > 0) {
        setPreviewImages(prev => ({ ...prev, [menu.id]: cached[0] }));
        return;
      }

      // Fetch from API (fetch 5 for full carousel later, but show 1 for preview)
      const images = await imagesApi.fetchDishImages(dishName, 5);
      if (images && images.length > 0) {
        const imageUrls = images.map((img: any) => img.url);
        setPreviewImages(prev => ({ ...prev, [menu.id]: imageUrls[0] }));
        // Cache all 5 for when user expands
        await storage.saveDishImages(dishName, imageUrls);
      }
    } catch (error) {
      console.error('Failed to load preview image:', error);
    }
  };

  const deleteMenu = async (menuId: string) => {
    Alert.alert(
      'Delete Menu',
      'Are you sure you want to delete this saved menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuApi.deleteMenu(menuId);
              await storage.deleteMenu(menuId);
              loadMenus();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete menu');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Menus</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : menus.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Menu size={64} color="#ccc" />
            <Text style={styles.emptyText}>No saved menus yet</Text>
            <Text style={styles.emptySubtext}>
              Scan a menu to get started - all scans are automatically saved
            </Text>
          </View>
        ) : (
          menus.map((menu) => (
            <View key={menu.id} style={styles.menuCard}>
              {previewImages[menu.id] && (
                <Image
                  source={{ uri: previewImages[menu.id] }}
                  style={styles.previewImage}
                />
              )}
              <TouchableOpacity
                style={styles.menuContent}
                onPress={() => router.push(`/menu/${menu.scan_id || menu.id}`)}
              >
                <Text style={styles.menuTitle}>
                  {menu.menu_data?.restaurant_name_translation || menu.menu_data?.restaurant_name || 'Saved Menu'}
                </Text>
                <Text style={styles.menuDate}>
                  {new Date(menu.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.menuItems}>
                  {menu.menu_data?.sections?.reduce(
                    (acc: number, section: any) => acc + (section.items?.length || 0),
                    0
                  ) || 0}{' '}
                  items
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteMenu(menu.id)}
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  previewImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    backgroundColor: '#e5e5e5',
  },
  menuContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  menuItems: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
