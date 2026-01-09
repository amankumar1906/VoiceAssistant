import { Router, Response } from 'express';
import pool from '../services/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateActivitySuggestion } from '../utils/activitySuggestions';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get happy memories
router.get('/happy-memories', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const result = await pool.query(
      'SELECT * FROM user_insights WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC LIMIT $3',
      [req.user!.id, 'happy_memory', limit]
    );

    res.json({ memories: result.rows });
  } catch (error) {
    console.error('Get happy memories error:', error);
    res.status(500).json({ error: 'Failed to get happy memories' });
  }
});

// Get recent topics
router.get('/recent-topics', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get recent messages from user's conversations
    const result = await pool.query(
      `SELECT DISTINCT m.content, m.created_at
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND m.role = 'user' AND m.created_at > $2
       ORDER BY m.created_at DESC
       LIMIT 10`,
      [req.user!.id, cutoffDate]
    );

    res.json({ topics: result.rows });
  } catch (error) {
    console.error('Get recent topics error:', error);
    res.status(500).json({ error: 'Failed to get recent topics' });
  }
});

// Get activity suggestion
router.get('/activity-suggestion', async (req: AuthRequest, res: Response) => {
  try {
    const { mood, duration } = req.query;

    // Get user's preferences and happy memories
    const insightsResult = await pool.query(
      'SELECT * FROM user_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.user!.id]
    );

    const insights = insightsResult.rows;
    const suggestion = generateActivitySuggestion(
      mood as string,
      duration as string,
      insights
    );

    res.json({ suggestion });
  } catch (error) {
    console.error('Get activity suggestion error:', error);
    res.status(500).json({ error: 'Failed to get activity suggestion' });
  }
});

// Save new insight
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category, content } = req.body;

    if (!category || !content) {
      return res.status(400).json({ error: 'Category and content are required' });
    }

    const validCategories = ['happy_memory', 'preference', 'goal', 'activity'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const result = await pool.query(
      'INSERT INTO user_insights (user_id, category, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user!.id, category, content]
    );

    res.status(201).json({ insight: result.rows[0] });
  } catch (error) {
    console.error('Save insight error:', error);
    res.status(500).json({ error: 'Failed to save insight' });
  }
});

// Get all insights
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_insights WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    res.json({ insights: result.rows });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

export default router;
