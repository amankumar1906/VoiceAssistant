import { AuthResponse, Conversation, Message, UserInsight, VoiceSession } from '../types';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Auth endpoints
export const signup = async (email: string, password: string, name?: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  return response.json();
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error('Failed to get user');
  }

  return response.json();
};

// Conversation endpoints
export const getConversations = async (): Promise<{ conversations: Conversation[] }> => {
  const response = await fetch(`${API_URL}/api/conversations`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error('Failed to get conversations');
  }

  return response.json();
};

export const createConversation = async (title?: string): Promise<{ conversation: Conversation }> => {
  const response = await fetch(`${API_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ title })
  });

  if (!response.ok) {
    throw new Error('Failed to create conversation');
  }

  return response.json();
};

export const getConversation = async (id: string): Promise<{ conversation: Conversation; messages: Message[] }> => {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error('Failed to get conversation');
  }

  return response.json();
};

export const deleteConversation = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
};

export const addMessage = async (conversationId: string, role: 'user' | 'assistant', content: string): Promise<{ message: Message }> => {
  const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ role, content })
  });

  if (!response.ok) {
    throw new Error('Failed to add message');
  }

  return response.json();
};

// Voice endpoints
export const createVoiceSession = async (conversationId: string): Promise<VoiceSession> => {
  const response = await fetch(`${API_URL}/api/voice/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ conversationId })
  });

  if (!response.ok) {
    throw new Error('Failed to create voice session');
  }

  return response.json();
};

// Insights endpoints
export const getInsights = async (): Promise<{ insights: UserInsight[] }> => {
  const response = await fetch(`${API_URL}/api/insights`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    throw new Error('Failed to get insights');
  }

  return response.json();
};
