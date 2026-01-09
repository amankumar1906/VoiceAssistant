import React from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Simple state management without zustand
class AuthStore {
  private listeners: Set<() => void> = new Set();
  private state: Omit<AuthState, 'login' | 'signup' | 'logout' | 'clearError'> = {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null
  };

  getState() {
    return this.state;
  }

  setState(partial: Partial<typeof this.state>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const authStore = new AuthStore();

export const useAuth = (): AuthState => {
  const [state, setState] = React.useState(authStore.getState());
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    return authStore.subscribe(() => {
      setState(authStore.getState());
    });
  }, []);

  // Auto-login on mount if token exists
  React.useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token && !authStore.getState().user) {
        try {
          authStore.setState({ isLoading: true });
          const response = await api.getCurrentUser();
          authStore.setState({
            user: response.user,
            token,
            isLoading: false
          });
        } catch (error) {
          console.error('Auto-login failed:', error);
          localStorage.removeItem('token');
          authStore.setState({
            token: null,
            user: null,
            isLoading: false
          });
        }
      }
      setIsInitialized(true);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    authStore.setState({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      localStorage.setItem('token', response.token);
      authStore.setState({
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error) {
      authStore.setState({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false
      });
      throw error;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    authStore.setState({ isLoading: true, error: null });
    try {
      const response = await api.signup(email, password, name);
      localStorage.setItem('token', response.token);
      authStore.setState({
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error) {
      authStore.setState({
        error: error instanceof Error ? error.message : 'Signup failed',
        isLoading: false
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    authStore.setState({
      user: null,
      token: null,
      error: null
    });
  };

  const clearError = () => {
    authStore.setState({ error: null });
  };

  return {
    ...state,
    login,
    signup,
    logout,
    clearError
  };
};
