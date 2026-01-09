import OpenAI from 'openai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set in environment variables');
  console.error('Please check your backend/.env file');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export const createRealtimeSession = async (userId: string) => {
  // Create an ephemeral key for the client to use
  const response = await openai.beta.realtime.sessions.create({
    model: 'gpt-4o-realtime-preview-2024-12-17',
    voice: 'alloy'
  });

  return response;
};

export default openai;
