import pool from './supabase';
import { generateActivitySuggestion } from '../utils/activitySuggestions';

export const functionDefinitions = [
  {
    name: 'getUserHappyMemories',
    description: 'Retrieve things the user has mentioned that make them happy in past conversations',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of memories to retrieve (default 5)'
        }
      }
    }
  },
  {
    name: 'saveConversationInsight',
    description: 'Save an important insight about the user for future conversations',
    parameters: {
      type: 'object',
      properties: {
        insight: {
          type: 'string',
          description: 'The insight to save'
        },
        category: {
          type: 'string',
          enum: ['happy_memory', 'preference', 'goal', 'activity'],
          description: 'Category of the insight'
        }
      },
      required: ['insight', 'category']
    }
  },
  {
    name: 'suggestActivity',
    description: 'Suggest a personalized activity based on user\'s preferences and time of day',
    parameters: {
      type: 'object',
      properties: {
        mood: {
          type: 'string',
          description: 'Current mood or energy level'
        },
        duration: {
          type: 'string',
          description: 'Available time (e.g., "5 minutes", "30 minutes")'
        }
      }
    }
  },
  {
    name: 'getRecentTopics',
    description: 'Get topics the user has discussed recently to provide context-aware responses',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default 7)'
        }
      }
    }
  },
  {
    name: 'getTimeContext',
    description: 'Get current time context (morning, afternoon, evening, late night) to provide time-appropriate suggestions',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

interface FunctionCallArgs {
  [key: string]: any;
}

export const executeFunctionCall = async (
  functionName: string,
  args: FunctionCallArgs,
  userId: string
): Promise<any> => {
  console.log(`Executing function: ${functionName}`, args);

  switch (functionName) {
    case 'getUserHappyMemories':
      return await getUserHappyMemories(userId, args.limit || 5);

    case 'saveConversationInsight':
      return await saveConversationInsight(userId, args.insight, args.category);

    case 'suggestActivity':
      return await suggestActivity(userId, args.mood, args.duration);

    case 'getRecentTopics':
      return await getRecentTopics(userId, args.days || 7);

    case 'getTimeContext':
      return getTimeContext();

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
};

const getUserHappyMemories = async (userId: string, limit: number) => {
  const result = await pool.query(
    'SELECT content, created_at FROM user_insights WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC LIMIT $3',
    [userId, 'happy_memory', limit]
  );

  return {
    memories: result.rows.map(r => r.content),
    count: result.rows.length
  };
};

const saveConversationInsight = async (userId: string, insight: string, category: string) => {
  const result = await pool.query(
    'INSERT INTO user_insights (user_id, category, content) VALUES ($1, $2, $3) RETURNING *',
    [userId, category, insight]
  );

  return {
    success: true,
    insight: result.rows[0]
  };
};

const suggestActivity = async (userId: string, mood?: string, duration?: string) => {
  // Get user insights for personalization
  const insightsResult = await pool.query(
    'SELECT * FROM user_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [userId]
  );

  const suggestion = generateActivitySuggestion(mood, duration, insightsResult.rows);

  return suggestion;
};

const getRecentTopics = async (userId: string, days: number) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await pool.query(
    `SELECT DISTINCT m.content, m.created_at
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.user_id = $1 AND m.role = 'user' AND m.created_at > $2
     ORDER BY m.created_at DESC
     LIMIT 10`,
    [userId, cutoffDate]
  );

  return {
    topics: result.rows.map(r => r.content),
    count: result.rows.length
  };
};

const getTimeContext = () => {
  const now = new Date();
  const hour = now.getHours();

  let timeOfDay: string;
  let greeting: string;
  let energyLevel: string;
  let suggestions: string[];

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
    greeting = 'Good morning';
    energyLevel = 'fresh and energized';
    suggestions = [
      'Go for a morning walk or run',
      'Do some stretching or yoga',
      'Enjoy a healthy breakfast',
      'Set intentions for the day',
      'Listen to uplifting music'
    ];
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    greeting = 'Good afternoon';
    energyLevel = 'active and productive';
    suggestions = [
      'Take a short walk outside',
      'Have a healthy snack',
      'Do a quick workout',
      'Connect with a friend',
      'Work on a creative project'
    ];
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = 'evening';
    greeting = 'Good evening';
    energyLevel = 'winding down';
    suggestions = [
      'Cook a favorite meal',
      'Read something enjoyable',
      'Practice gratitude journaling',
      'Take a relaxing bath',
      'Call a loved one'
    ];
  } else {
    timeOfDay = 'late night';
    greeting = 'Hello';
    energyLevel = 'relaxed and calm';
    suggestions = [
      'Practice deep breathing',
      'Listen to calming music',
      'Do some gentle stretching',
      'Write in a journal',
      'Prepare for restful sleep'
    ];
  }

  return {
    timeOfDay,
    hour,
    greeting,
    energyLevel,
    suggestions,
    timestamp: now.toISOString()
  };
};
