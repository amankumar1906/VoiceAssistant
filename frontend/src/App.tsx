import React, { useEffect, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { ConversationView } from './components/ConversationView';
import { useAuth } from './hooks/useAuth';
import * as api from './services/api';
import { Conversation } from './types';

const App: React.FC = () => {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await api.getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const timestamp = new Date().toLocaleString();
      const { conversation } = await api.createConversation(`Conversation - ${timestamp}`);
      setConversations([conversation, ...conversations]);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await api.deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  if (!user || !token) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Daily Companion
            </h1>
            <p className="text-xs text-gray-500 mt-1">Your voice wellness buddy</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Conversations</h2>
            <p className="text-sm text-gray-500 mt-1">Start a voice chat or continue an existing one</p>
          </div>
          <button
            onClick={handleCreateConversation}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Conversation
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 mt-4">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Daily Companion!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start your first conversation and I'll help you feel happier by remembering what matters to you.
            </p>
            <button
              onClick={handleCreateConversation}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
            >
              Start Your First Conversation
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer border border-gray-100 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="text-gray-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{conv.title}</h3>
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(conv.updated_at).toLocaleDateString()} at {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">1.</span>
                  <span>Click "New Conversation" to start a voice chat</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">2.</span>
                  <span>Hold the microphone button and tell me what makes you happy</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">3.</span>
                  <span>I'll remember our conversations and suggest personalized activities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">4.</span>
                  <span>All your conversations are saved and can be reviewed anytime</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Conversation Modal */}
      {selectedConversation && (
        <ConversationView
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  );
};

export default App;
