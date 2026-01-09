import { UserInsight, ActivitySuggestion } from '../types';

const defaultActivities = [
  {
    activity: 'Take a short walk outside',
    description: 'Get some fresh air and move your body',
    duration: '10-15 minutes',
    mood: ['low', 'neutral']
  },
  {
    activity: 'Listen to uplifting music',
    description: 'Put on your favorite feel-good playlist',
    duration: '5-10 minutes',
    mood: ['low', 'neutral', 'good']
  },
  {
    activity: 'Practice gratitude',
    description: 'Write down 3 things you\'re grateful for today',
    duration: '5 minutes',
    mood: ['neutral', 'good']
  },
  {
    activity: 'Do some stretching',
    description: 'Release tension with gentle stretches',
    duration: '10 minutes',
    mood: ['low', 'neutral']
  },
  {
    activity: 'Call a friend or loved one',
    description: 'Connect with someone who makes you smile',
    duration: '15-30 minutes',
    mood: ['low', 'neutral', 'good']
  },
  {
    activity: 'Watch a funny video',
    description: 'Take a laughter break',
    duration: '5-10 minutes',
    mood: ['low', 'neutral']
  },
  {
    activity: 'Try a breathing exercise',
    description: 'Take 10 deep breaths to center yourself',
    duration: '2-5 minutes',
    mood: ['low', 'stressed']
  },
  {
    activity: 'Make your favorite snack',
    description: 'Treat yourself to something delicious',
    duration: '10-15 minutes',
    mood: ['neutral', 'good']
  }
];

export const generateActivitySuggestion = (
  mood?: string,
  duration?: string,
  insights: UserInsight[] = []
): ActivitySuggestion => {
  // Extract happy memories and preferences from insights
  const happyThings = insights
    .filter(i => i.category === 'happy_memory' || i.category === 'preference')
    .map(i => i.content);

  // If user has mentioned specific activities they love, prioritize those
  const personalizedActivity = generatePersonalizedActivity(happyThings, mood);
  if (personalizedActivity) {
    return personalizedActivity;
  }

  // Otherwise, pick from default activities based on mood
  const moodLower = (mood || 'neutral').toLowerCase();
  const matchingActivities = defaultActivities.filter(a =>
    a.mood.includes(moodLower) || a.mood.includes('neutral')
  );

  const selected = matchingActivities[Math.floor(Math.random() * matchingActivities.length)];

  return {
    activity: selected.activity,
    description: selected.description,
    duration: duration || selected.duration,
    reason: 'This activity might help lift your spirits'
  };
};

const generatePersonalizedActivity = (
  happyThings: string[],
  mood?: string
): ActivitySuggestion | null => {
  if (happyThings.length === 0) return null;

  // Simple keyword matching for common activities
  const keywords = ['music', 'walk', 'hik', 'read', 'cook', 'art', 'paint', 'draw',
                    'game', 'exercise', 'yoga', 'meditat', 'pet', 'dog', 'cat'];

  for (const thing of happyThings) {
    const lowerThing = thing.toLowerCase();

    if (lowerThing.includes('music') || lowerThing.includes('song')) {
      return {
        activity: 'Listen to your favorite music',
        description: 'You mentioned music makes you happy',
        duration: '10-15 minutes',
        reason: 'Based on what you\'ve shared about loving music'
      };
    }

    if (lowerThing.includes('walk') || lowerThing.includes('hik')) {
      return {
        activity: 'Go for a walk',
        description: 'You mentioned enjoying walks',
        duration: '15-20 minutes',
        reason: 'You said walking makes you happy'
      };
    }

    if (lowerThing.includes('read')) {
      return {
        activity: 'Read something you enjoy',
        description: 'Pick up that book you\'ve been reading',
        duration: '20-30 minutes',
        reason: 'You mentioned enjoying reading'
      };
    }

    if (lowerThing.includes('pet') || lowerThing.includes('dog') || lowerThing.includes('cat')) {
      return {
        activity: 'Spend time with your pet',
        description: 'Give them some extra cuddles',
        duration: '10-15 minutes',
        reason: 'You mentioned your pet brings you joy'
      };
    }
  }

  // If no specific keywords matched, create a generic personalized suggestion
  const randomHappyThing = happyThings[0];
  return {
    activity: 'Do something that makes you happy',
    description: `Maybe something related to: ${randomHappyThing}`,
    duration: '15-20 minutes',
    reason: 'Based on what you\'ve shared with me'
  };
};
