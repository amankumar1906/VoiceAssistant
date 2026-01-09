import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createRealtimeSession } from '../services/openai';
import { functionDefinitions } from '../services/functionCalling';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create OpenAI Realtime session
router.post('/session', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.body;

    // TODO: Load user context (recent conversations, insights) to pass to OpenAI

    const session = await createRealtimeSession(req.user!.id);

    res.json({
      session: session,
      functions: functionDefinitions
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create voice session' });
  }
});

export default router;
