import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth';
import conversationsRoutes from './routes/conversations';
import insightsRoutes from './routes/insights';
import voiceRoutes from './routes/voice';
import { errorHandler } from './middleware/errorHandler';
import { handleVoiceWebSocket, startHeartbeat } from './services/voiceWebSocket';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for voice
const wss = new WebSocketServer({
  server,
  path: '/api/voice/ws'
});

console.log('WebSocket server created at /api/voice/ws');

// Handle WebSocket connections
wss.on('connection', handleVoiceWebSocket);

// Start heartbeat for keeping connections alive
startHeartbeat(wss);

// Start server
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ HTTP API: http://localhost:${PORT}`);
  console.log(`✓ WebSocket: ws://localhost:${PORT}/api/voice/ws`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
