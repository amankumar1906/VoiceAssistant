import React, { useEffect, useState } from 'react';
import { Message, Conversation } from '../types';
import * as api from '../services/api';
import { VoiceInterface } from './VoiceInterface';

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await api.getConversation(conversation.id);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageAdded = async (message: Message) => {
    // Optimistically add to UI
    setMessages(prev => [...prev, message]);

    // Save to backend
    try {
      await api.addMessage(conversation.id, message.role, message.content);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{conversation.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(conversation.created_at).toLocaleDateString()} at{' '}
              {new Date(conversation.created_at).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Messages History */}
          <div className="w-1/2 border-r overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation History</h3>

            {loading ? (
              <div className="text-center py-12 text-gray-600">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No messages yet. Start talking!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-50 ml-8'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        {message.role === 'user' ? 'You' : 'Daily Companion'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Interface */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <VoiceInterface
              conversationId={conversation.id}
              onMessageAdded={handleMessageAdded}
            />

            {/* Tips */}
            <div className="mt-6 bg-indigo-50 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-2 text-sm">Tips for better conversations:</h4>
              <ul className="text-xs text-indigo-800 space-y-1">
                <li>• Tell me what makes you happy</li>
                <li>• Ask for activity suggestions</li>
                <li>• Share how you're feeling today</li>
                <li>• I'll remember our conversations!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
