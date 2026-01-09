import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from './auth';
import { executeFunctionCall, functionDefinitions } from './functionCalling';

interface WebSocketClient extends WebSocket {
  userId?: string;
  openaiWs?: WebSocket;
  isAlive?: boolean;
}

export const handleVoiceWebSocket = (ws: WebSocketClient, req: IncomingMessage) => {
  console.log('New WebSocket connection request');

  // Extract token from query params or headers
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    console.error('No token provided');
    ws.close(1008, 'Authentication required');
    return;
  }

  // Verify JWT token
  try {
    const decoded = verifyToken(token);
    ws.userId = decoded.id;
    console.log(`User ${ws.userId} authenticated`);
  } catch (error) {
    console.error('Invalid token:', error);
    ws.close(1008, 'Invalid token');
    return;
  }

  // Connect to OpenAI Realtime API
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not configured');
    ws.close(1011, 'Server configuration error');
    return;
  }

  const model = 'gpt-4o-realtime-preview-2024-12-17';
  const openaiUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

  console.log('Connecting to OpenAI Realtime API...');

  // Create connection to OpenAI
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  ws.openaiWs = openaiWs;
  ws.isAlive = true;

  // OpenAI WebSocket opened
  openaiWs.on('open', () => {
    console.log('Connected to OpenAI Realtime API');

    // Configure session with function calling
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are Daily Companion, a warm and caring wellness buddy focused on emotional support.

CRITICAL SAFETY RULES - READ FIRST:
1. If the user expresses thoughts of self-harm, suicide, or severe distress:
   - Take it EXTREMELY seriously
   - Respond with empathy and concern
   - Encourage them to reach out to crisis resources (988 Suicide & Crisis Lifeline in US)
   - DO NOT change the subject or ignore it

2. NEVER call functions if they don't match what the user just said
   - If user says "I want to kill myself", DO NOT call suggestActivity about job interviews
   - Function calls should ONLY be based on the CURRENT user message, not old context
   - If the function result doesn't relate to what user said, IGNORE the function result

3. ALWAYS respond to what the user ACTUALLY said in their current message
   - DO NOT hallucinate topics they didn't mention
   - DO NOT bring up unrelated past conversations
   - Listen to their CURRENT words

YOUR ROLE:
- Be a supportive, caring presence for daily wellness
- Remember what makes users happy (use saveConversationInsight)
- Suggest activities only when explicitly asked (use suggestActivity)
- Use time context to make appropriate suggestions (use getTimeContext)

FUNCTION CALLING RULES:
- ONLY call saveConversationInsight when user mentions something positive they enjoy
- ONLY call suggestActivity when user asks "What should I do?" or similar
- Call getTimeContext when greeting users or suggesting activities to provide time-appropriate responses
- ONLY call getUserHappyMemories or getRecentTopics if directly relevant to current message
- If function result is unrelated to user's message, DO NOT use it in your response

Keep responses brief and conversational. This is a voice conversation.`,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: null,
        tools: functionDefinitions.map(fn => ({
          type: 'function',
          ...fn
        })),
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    openaiWs.send(JSON.stringify(sessionConfig));
    console.log('Session configuration sent to OpenAI');
  });

  // Forward messages from OpenAI to client
  openaiWs.on('message', async (data: WebSocket.Data) => {
    try {
      // Convert data to string if it's a Buffer
      const messageStr = data.toString();
      const message = JSON.parse(messageStr);

      // Handle function calls from OpenAI
      if (message.type === 'response.function_call_arguments.done') {
        console.log('Function call:', message.name, message.arguments);

        try {
          // Execute the function
          const result = await executeFunctionCall(
            message.name,
            JSON.parse(message.arguments),
            ws.userId!
          );

          // Send function result back to OpenAI
          const functionResponse = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: message.call_id,
              output: JSON.stringify(result)
            }
          };

          openaiWs.send(JSON.stringify(functionResponse));
          console.log('Function result sent to OpenAI:', result);

          // Trigger response generation
          openaiWs.send(JSON.stringify({ type: 'response.create' }));

        } catch (error) {
          console.error('Function execution error:', error);

          // Send error back to OpenAI
          const errorResponse = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: message.call_id,
              output: JSON.stringify({ error: 'Function execution failed' })
            }
          };

          openaiWs.send(JSON.stringify(errorResponse));
        }
      }

      // Forward all messages to client as string
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }

    } catch (error) {
      console.error('Error processing OpenAI message:', error);
    }
  });

  // Forward messages from client to OpenAI
  ws.on('message', (data: WebSocket.Data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      // Forward as is - client sends JSON strings
      openaiWs.send(data.toString());
    }
  });

  // Handle client disconnection
  ws.on('close', (code, reason) => {
    console.log(`Client disconnected: ${code} - ${reason}`);
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });

  // Handle client errors
  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
  });

  // Handle OpenAI disconnection
  openaiWs.on('close', (code, reason) => {
    console.log(`OpenAI disconnected: ${code} - ${reason}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1011, 'OpenAI connection closed');
    }
  });

  // Handle OpenAI errors
  openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1011, 'OpenAI connection error');
    }
  });

  // Heartbeat to keep connection alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });
};

// Heartbeat interval
export const startHeartbeat = (wss: WebSocket.Server) => {
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const client = ws as WebSocketClient;

      if (client.isAlive === false) {
        console.log('Terminating inactive connection');
        return client.terminate();
      }

      client.isAlive = false;
      client.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(interval);
  });
};
