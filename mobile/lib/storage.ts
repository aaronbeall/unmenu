import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  saveMenu: async (menuId: string, menuData: any) => {
    const key = `menu_${menuId}`;
    await AsyncStorage.setItem(key, JSON.stringify(menuData));
  },

  getMenu: async (menuId: string) => {
    const key = `menu_${menuId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  getAllSavedMenus: async () => {
    const keys = await AsyncStorage.getAllKeys();
    const menuKeys = keys.filter(key => key.startsWith('menu_'));
    const menus = await AsyncStorage.multiGet(menuKeys);
    return menus.map(([key, value]) => ({
      id: key.replace('menu_', ''),
      data: value ? JSON.parse(value) : null,
    }));
  },

  deleteMenu: async (menuId: string) => {
    const key = `menu_${menuId}`;
    await AsyncStorage.removeItem(key);
  },

  saveDishImages: async (dishName: string, imageUrls: string[]) => {
    const key = `images_${dishName.toLowerCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      urls: imageUrls,
      cachedAt: Date.now(),
    }));
  },

  getDishImages: async (dishName: string) => {
    const key = `images_${dishName.toLowerCase()}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Cache for 30 days
    if (Date.now() - parsed.cachedAt > 30 * 24 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed.urls;
  },
};
