export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  created_at: string;
}

export interface UserInsight {
  id: string;
  user_id: string;
  category: 'happy_memory' | 'preference' | 'goal' | 'activity';
  content: string;
  created_at: string;
}

export interface VoiceSession {
  sessionId: string;
  clientSecret: {
    value: string;
    expires_at: number;
  };
  expiresAt: number;
  functions: any[];
}

export interface ActivitySuggestion {
  activity: string;
  description: string;
  duration: string;
  reason: string;
}
