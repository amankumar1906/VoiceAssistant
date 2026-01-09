import React, { useState, useEffect, useRef } from 'react';
import { RealtimeVoiceClient } from '../services/realtimeVoice';
import { Message } from '../types';

interface VoiceInterfaceProps {
  conversationId: string;
  onMessageAdded: (message: Message) => void;
}

const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  conversationId,
  onMessageAdded
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAssistantText, setCurrentAssistantText] = useState('');
  const [lastSavedUserText, setLastSavedUserText] = useState('');
  const [lastSavedAssistantText, setLastSavedAssistantText] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const clientRef = useRef<RealtimeVoiceClient | null>(null);
  const userTranscriptBuffer = useRef('');
  const assistantTranscriptBuffer = useRef('');

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  // Session duration limit
  useEffect(() => {
    if (!isConnected || !sessionStartTime) return;

    const timeoutId = setTimeout(() => {
      alert('Session limit reached (10 minutes). Disconnecting to manage API costs.');
      handleDisconnect();
    }, MAX_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [isConnected, sessionStartTime]);

  const handleConnect = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get backend URL from environment
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

      const client = new RealtimeVoiceClient(
        {
          backendUrl,
          token
        },
        {
          onConnect: () => {
            console.log('Connected to voice session');
            setIsConnected(true);
            setSessionStartTime(Date.now());
          },
          onDisconnect: () => {
            console.log('Disconnected from voice session');
            setIsConnected(false);
            setIsRecording(false);
            setIsSpeaking(false);
          },
          onError: (err) => {
            console.error('Voice error:', err);
            setIsConnected(false);
          },
          onTranscriptUpdate: (text, role, isFinal) => {
            if (role === 'user') {
              // For user: display immediately
              setCurrentUserText(text);

              // Save user message only when final
              if (isFinal && text && text !== lastSavedUserText) {
                const finalText = text.trim();
                if (finalText) {
                  onMessageAdded({
                    id: Date.now().toString(),
                    conversation_id: conversationId,
                    role: 'user',
                    content: finalText,
                    created_at: new Date().toISOString()
                  });
                  setLastSavedUserText(finalText);
                }
              }
            } else {
              // For assistant: accumulate deltas for display, save only when final
              if (!isFinal) {
                // This is a delta, just accumulate
                assistantTranscriptBuffer.current += text;
                setCurrentAssistantText(assistantTranscriptBuffer.current);
              } else {
                // This is the complete transcript (from audio_transcript.done)
                setCurrentAssistantText(text);
                setIsSpeaking(false); // Response is complete

                // Save assistant message (only if not already saved)
                if (text !== lastSavedAssistantText) {
                  const finalText = text.trim();
                  if (finalText) {
                    onMessageAdded({
                      id: Date.now().toString(),
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: finalText,
                      created_at: new Date().toISOString()
                    });
                    setLastSavedAssistantText(finalText);
                  }
                }
              }
            }
          },
          onAudioReceived: () => {
            setIsSpeaking(true);
          },
          onFunctionCall: (name, args) => {
            console.log('Function called:', name, args);
            // In a real implementation, you'd handle function calls here
          }
        }
      );

      await client.connect();
      clientRef.current = client;

    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleToggleRecording = async () => {
    if (!clientRef.current || !isConnected) return;

    if (isRecording) {
      // Stop recording
      clientRef.current.stopRecording();
      setIsRecording(false);

      // Reset assistant transcript for next response
      assistantTranscriptBuffer.current = '';
      setCurrentAssistantText('');
    } else {
      // Start recording
      try {
        // Reset transcript buffers for new recording
        userTranscriptBuffer.current = '';
        setCurrentUserText('');

        await clientRef.current.startRecording();
        setIsRecording(true);
      } catch (err) {
        const error = err as Error;
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert('Failed to start recording. Please check your microphone settings.');
        }
        console.error('Failed to start recording:', err);
      }
    }
  };

  const handleDisconnect = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setCurrentUserText('');
    setCurrentAssistantText('');
    setSessionStartTime(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Voice Chat</h2>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Removed error display - errors are handled silently */}

      {/* Connection Status */}
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4 text-sm">
            Start a voice conversation with your Daily Companion
            <br />
            <span className="text-gray-500 text-xs">
              Note: First connection may take 10-30 seconds if the server was sleeping.
            </span>
          </p>
          <button
            onClick={handleConnect}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Connect to Voice Chat
          </button>
        </div>
      ) : (
        <>
          {/* Live Transcripts */}
          <div className="space-y-4 mb-6 min-h-[200px]">
            {currentUserText && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-xs text-blue-600 font-medium mb-1">You</div>
                <div className="text-gray-900">{currentUserText}</div>
              </div>
            )}

            {currentAssistantText && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-600 font-medium mb-1 flex items-center">
                  Daily Companion
                  {isSpeaking && (
                    <span className="ml-2 flex space-x-1">
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                <div className="text-gray-900">{currentAssistantText}</div>
              </div>
            )}

            {!currentUserText && !currentAssistantText && (
              <div className="text-center py-12 text-gray-400">
                Press and hold the button to talk
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleToggleRecording}
              disabled={isSpeaking}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <p className="text-sm text-gray-600">
              {isRecording ? (
                <span className="text-red-600 font-medium">Recording... Click to stop</span>
              ) : isSpeaking ? (
                <span className="text-indigo-600">Listening to response...</span>
              ) : (
                'Click to talk'
              )}
            </p>

            <button
              onClick={handleDisconnect}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              End Session
            </button>
          </div>
        </>
      )}
    </div>
  );
};
