# Daily Companion - Voice AI Wellness App

A warm, caring voice assistant that remembers what makes you happy and provides personalized wellness support through natural conversation.

## Overview

Daily Companion is a voice-first wellness application that uses OpenAI's Realtime API to have natural conversations with users. Unlike generic chatbots, it remembers what makes each user happy and proactively suggests personalized activities based on their preferences, mood, and past conversations.

## Features

- **Real-time Voice Conversations**: Natural speech-to-speech conversations powered by OpenAI's Realtime API (GPT-4o-mini)
- **Context-Aware Responses**: The AI remembers your previous conversations and what makes you happy
- **Personalized Activity Suggestions**: Get tailored recommendations based on your mood, available time, and preferences
- **Conversation History**: View and manage all your past conversations
- **Function Calling**: Four intelligent functions that help the AI provide personalized support:
  - `getUserHappyMemories`: Retrieves things you've mentioned that make you happy
  - `saveConversationInsight`: Saves important insights about you for future conversations
  - `suggestActivity`: Suggests personalized activities based on your mood and time
  - `getRecentTopics`: Recalls what you've discussed recently for better context

## Tech Stack

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type safety and better developer experience
- **PostgreSQL** (via Supabase) - Database for users, conversations, messages, and insights
- **Custom JWT Authentication** - Secure, simple email/password auth without email verification
- **OpenAI Realtime API** - Voice-to-voice conversations with function calling
- **bcrypt** - Password hashing

### Frontend
- **React** - UI library
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **TypeScript** - Type safety

### Deployment
- **Railway** - Backend hosting (free tier)
- **Vercel** - Frontend hosting (free tier)

## Project Structure

```
stella-take-home/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (auth, openai, db)
│   │   ├── middleware/      # Express middleware (auth, errors)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Express app entry point
│   ├── database.sql         # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # React entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier)
- An OpenAI API key

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd stella-take-home
```

### 2. Set Up Supabase Database

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned
3. Go to the SQL Editor in your Supabase dashboard
4. Copy the contents of `backend/database.sql` and run it in the SQL Editor
5. Go to Project Settings > Database and copy your connection string
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

### 3. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - DATABASE_URL: Your Supabase PostgreSQL connection string
# - OPENAI_API_KEY: Your OpenAI API key
# - JWT_SECRET: Generate with: openssl rand -base64 32
# - FRONTEND_URL: http://localhost:5173 (for local development)
```

Example backend/.env:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres
OPENAI_API_KEY=sk-proj-xxxxx
JWT_SECRET=your-generated-secret-here
FRONTEND_URL=http://localhost:5173
```

### 4. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env
```

Example frontend/.env:
```
VITE_BACKEND_URL=http://localhost:3000
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Test the Application

1. Sign up with an email and password
2. Create a new conversation
3. Grant microphone access when prompted
4. Start talking to your Daily Companion!

**Note**: The voice interface requires the OpenAI Realtime API to be fully implemented. The current version has the foundation in place.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current user info (requires JWT)

### Conversations
- `GET /api/conversations` - List all user conversations
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `PATCH /api/conversations/:id` - Update conversation title
- `DELETE /api/conversations/:id` - Delete a conversation
- `POST /api/conversations/:id/messages` - Add a message to conversation

### Insights (Function Calling)
- `GET /api/insights` - Get all user insights
- `GET /api/insights/happy-memories` - Get user's happy memories
- `GET /api/insights/recent-topics` - Get recent conversation topics
- `GET /api/insights/activity-suggestion` - Get personalized activity suggestion
- `POST /api/insights` - Save a new insight

### Voice
- `POST /api/voice/session` - Create an OpenAI Realtime session

## Deployment

### Deploy Backend to Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Add environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL` (your Supabase connection string)
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Vercel URL, set after frontend deployment)
6. Railway will automatically deploy your backend

### Deploy Frontend to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and create a new project
3. Import your GitHub repository
4. Set the root directory to `frontend`
5. Add environment variable:
   - `VITE_BACKEND_URL` (your Railway backend URL)
6. Deploy!

### Update CORS

After deploying frontend, update the backend's `FRONTEND_URL` environment variable in Railway with your Vercel URL.

## Product Decisions

### Why Voice-First?
Voice creates a more natural, intimate experience for wellness conversations. It's easier to express feelings through speech than typing.

### Why Focus on "What Makes You Happy"?
Instead of trying to be a generic AI therapist, Daily Companion has a clear, specific purpose: helping users remember and engage with things that bring them joy. This makes it more useful and memorable.

### Why Function Calling?
The four function calls enable the AI to:
1. Access user's history of happy moments
2. Save new insights for future conversations
3. Provide genuinely personalized suggestions
4. Maintain conversation context over time

This transforms it from a stateless chatbot into a companion that actually remembers you.

### Why Custom JWT Instead of Supabase Auth?
- Simpler implementation for a 24-hour project
- No email verification required - users can sign up and start immediately
- Full control over the authentication flow
- Easier to debug and understand

### Why GPT-4o-mini?
Cost efficiency. At ~$0.01-0.04 per minute, it's the cheapest option for the Realtime API while still providing great conversational quality.

## Known Limitations

### Railway Free Tier
- Backend sleeps after 5 minutes of inactivity
- First request after sleep will have a ~10-30 second cold start delay
- Users will see a loading state during cold starts

### OpenAI Realtime API Costs
- Voice conversations incur per-minute costs
- Recommend implementing conversation timeouts in production (5-10 minutes)
- Current implementation doesn't have usage tracking

### Voice Interface
- Requires HTTPS in production for microphone access
- Browser compatibility: Works best in Chrome/Edge
- Requires stable internet connection

### Database
- Using Supabase free tier (500MB limit, 2GB bandwidth)
- No Row Level Security (RLS) since we're using custom JWT auth
- Backend handles all authorization logic

## Future Enhancements

Given more time, I would add:

1. **Complete Voice Interface**: Full WebSocket implementation with audio visualization
2. **Mobile App**: React Native version for better mobile experience
3. **Push Notifications**: Daily check-in reminders
4. **Mood Tracking**: Visual charts showing mood patterns over time
5. **More Function Calls**:
   - `scheduleReminder`: Set reminders for activities
   - `shareInsight`: Share insights with trusted contacts
   - `getWeatherBasedSuggestions`: Activity suggestions based on weather
6. **Voice Selection**: Let users choose their AI companion's voice
7. **Conversation Summaries**: AI-generated summaries of past conversations
8. **Export Data**: Download all conversations and insights
9. **Rate Limiting**: Prevent API abuse
10. **Usage Analytics**: Track conversation lengths and costs

## Development Notes

### Code Quality Decisions
- TypeScript throughout for type safety
- Clear separation of concerns (routes, services, middleware)
- Comprehensive error handling
- Environment variable validation
- RESTful API design
- Consistent naming conventions

### Architecture Trade-offs
- Chose monorepo structure for easier local development
- Kept frontend state management simple (custom hook vs Redux)
- Used PostgreSQL directly instead of an ORM (Prisma/TypeORM) for simplicity
- Implemented custom JWT instead of using Passport.js for lighter weight

## Questions & Support

If you have questions about the implementation or product decisions, please open an issue in the repository.

## License

MIT

---

Built with ❤️ for Stella's take-home assessment.
