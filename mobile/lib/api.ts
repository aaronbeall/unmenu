import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    subscription_tier: string;
    scans_remaining: number;
  };
}

export interface ScanStatusResponse {
  scan_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  menu?: any;
  error?: string;
}

export const authApi = {
  register: async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/register', { email, password });
    await AsyncStorage.setItem('auth_token', data.token);
    return data;
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    await AsyncStorage.setItem('auth_token', data.token);
    return data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
  },
};

export const scanApi = {
  uploadImage: async (uri: string, userLanguage: string = 'en') => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'menu.jpg',
    } as any);
    formData.append('user_language', userLanguage);

    const { data } = await api.post('/scan/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getStatus: async (scanId: string) => {
    const { data } = await api.get<ScanStatusResponse>(`/scan/status/${scanId}`);
    return data;
  },
};

export const menuApi = {
  saveMenu: async (scanId: string) => {
    const { data } = await api.post('/menu/save', { scan_id: scanId });
    return data;
  },

  getSavedMenus: async () => {
    const { data } = await api.get('/menu/saved');
    return data;
  },

  deleteMenu: async (menuId: string) => {
    const { data } = await api.delete(`/menu/saved/${menuId}`);
    return data;
  },
};

export const userApi = {
  getProfile: async () => {
    const { data } = await api.get('/user/profile');
    return data;
  },

  upgrade: async () => {
    const { data } = await api.post('/user/upgrade');
    return data;
  },
};

export default api;
