export interface User {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: Date;
}

export interface UserPayload {
  id: string;
  email: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  created_at: Date;
}

export interface UserInsight {
  id: string;
  user_id: string;
  category: 'happy_memory' | 'preference' | 'goal' | 'activity';
  content: string;
  created_at: Date;
}

export interface ActivitySuggestion {
  activity: string;
  description: string;
  duration: string;
  reason: string;
}
