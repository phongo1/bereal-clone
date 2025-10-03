import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

const asyncStorageAvailable = () => {
  try {
    return typeof AsyncStorage?.setItem === 'function';
  } catch (error) {
    console.warn('AsyncStorage unavailable, falling back to in-memory auth store');
    return false;
  }
};

const inMemoryStore = {
  token: null,
  user: null,
};

const storage = {
  async getToken() {
    if (!asyncStorageAvailable()) {
      return inMemoryStore.token;
    }
    return AsyncStorage.getItem('token');
  },
  async getUser() {
    if (!asyncStorageAvailable()) {
      return inMemoryStore.user ? JSON.stringify(inMemoryStore.user) : null;
    }
    return AsyncStorage.getItem('user');
  },
  async setToken(value) {
    if (!asyncStorageAvailable()) {
      inMemoryStore.token = value;
      return;
    }
    await AsyncStorage.setItem('token', value);
  },
  async setUser(value) {
    if (!asyncStorageAvailable()) {
      inMemoryStore.user = value ? JSON.parse(value) : null;
      return;
    }
    await AsyncStorage.setItem('user', value);
  },
  async clear() {
    if (!asyncStorageAvailable()) {
      inMemoryStore.token = null;
      inMemoryStore.user = null;
      return;
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data;
      
      // Store auth data
      await storage.setToken(newToken);
      await storage.setUser(JSON.stringify(userData));
      
      // Set state
      setToken(newToken);
      setUser(userData);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (email, username, displayName, password, phone) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        username,
        display_name: displayName,
        password,
        phone,
      });

      const { token: newToken, user: userData } = response.data;
      
      // Store auth data
      await storage.setToken(newToken);
      await storage.setUser(JSON.stringify(userData));
      
      // Set state
      setToken(newToken);
      setUser(userData);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await storage.clear();
      
      setToken(null);
      setUser(null);
      
      // Remove axios default header
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (displayName, avatarUrl) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/users/profile`, {
        display_name: displayName,
        avatar_url: avatarUrl,
      });

      // Update stored user data
      const updatedUser = { ...user, display_name: displayName, avatar_url: avatarUrl };
      await storage.setUser(JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
