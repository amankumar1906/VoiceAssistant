import { Router, Response } from 'express';
import pool from '../services/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Input validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;

// All routes require authentication
router.use(authMiddleware);

// Get all conversations for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create new conversation
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const title = req.body.title?.trim();

    // Validate title
    if (!title || title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be 1-${MAX_TITLE_LENGTH} characters` });
    }

    const result = await pool.query(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user!.id, title || 'New Conversation']
    );

    res.status(201).json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation by ID with messages
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get conversation
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const messagesResult = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Update conversation title
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const result = await pool.query(
      'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [title, id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add message to conversation
router.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, audio_url } = req.body;
    const content = req.body.content?.trim();

    // Validate content
    if (!content || content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message must be 1-${MAX_MESSAGE_LENGTH} characters` });
    }

    // Validate role
    if (!role || !['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "user" or "assistant"' });
    }

    // Verify conversation belongs to user
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message
    const result = await pool.query(
      'INSERT INTO messages (conversation_id, role, content, audio_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, role, content, audio_url || null]
    );

    // Update conversation updated_at
    await pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;
