import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for uploads
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('API Request:', {
    url: `${API_URL}${config.url}`,
    method: config.method,
    hasToken: !!token,
  });
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

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
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const formData = new FormData();
      
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'menu.jpg',
      } as any);
      formData.append('user_language', userLanguage);

      console.log('Uploading image from URI:', uri);

      const uploadUrl = `${API_URL}/scan/upload`;
      console.log('Upload URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Upload error response:', { status: response.status, data });
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }
      
      console.log('Upload response:', data);
      return data;
    } catch (error: any) {
      console.error('Upload error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  getStatus: async (scanId: string) => {
    const { data } = await api.get<ScanStatusResponse>(`/scan/status/${scanId}`);
    return data;
  },

  cancel: async (scanId: string) => {
    const { data } = await api.post(`/scan/cancel/${scanId}`);
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
