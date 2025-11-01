# Prep Routine - Project Context

## Overview
A study/preparation tracking web app with iOS-style glassmorphism design. The app helps users track their preparation progress with goals, subjects, topics, and study sessions.

## Tech Stack Decision
- **Next.js 16** (App Router) - Chosen for built-in API routes and future mobile app support
- **TypeScript** - For type safety
- **Tailwind CSS 4** - For styling
- **iOS-style glassmorphism** - Design aesthetic with backdrop blur effects

## Architecture Decision
- Next.js backend (API routes in `/app/api/`) will serve:
  - Web frontend (React)
  - Future iOS app (React Native)
  - Future Android app (React Native)
- All platforms will call the same Next.js API endpoints
- Types will be shared across all platforms

## Current Progress

### ✅ Completed
1. Next.js project initialized with TypeScript and Tailwind
2. Data structure/types defined (`types/index.ts`)
3. iOS-style glassmorphism CSS classes added
4. Basic homepage with goal creation UI
5. **Database setup with Prisma and SQLite**
6. **API routes for goals (GET /api/goals, POST /api/goals, GET /api/goals/[id])**
7. **Frontend integrated with API (persistent data storage)**
8. **Goal detail page with subjects and topics display**
9. **API routes for subjects and topics (POST /api/goals/[id]/subjects, POST /api/subjects/[id]/topics)**
10. **UI for creating subjects and topics**
11. **Study timer component with start/stop functionality**
12. **API routes for study sessions (POST /api/sessions, GET /api/sessions)**
13. **Automatic study time tracking and updates**

### 📋 Data Structure
```
Goal
├── id: string
├── name: string
├── createdAt: string
├── totalStudyTime: number (minutes)
└── Related: Subject[]

Subject
├── id: string
├── name: string
├── goalId: string
├── studyTime: number (minutes)
└── Related: Topic[]

Topic
├── id: string
├── name: string
├── subjectId: string
└── studyTime: number (minutes)

StudySession
├── id: string
├── goalId: string
├── subjectId?: string
├── topicId?: string
├── startTime: string
├── endTime?: string
├── duration: number (minutes)
└── date: string (YYYY-MM-DD)
```

## TODO - Next Steps
1. **Backend API Routes** (`/app/api/`)
   - ✅ `POST /api/goals` - Create goal
   - ✅ `GET /api/goals` - List all goals
   - ✅ `GET /api/goals/[id]` - Get goal details
   - ✅ `POST /api/goals/[id]/subjects` - Add subject to goal
   - ✅ `POST /api/subjects/[id]/topics` - Add topic to subject
   - ✅ `POST /api/sessions` - Start/stop study session
   - ✅ `GET /api/sessions` - Get study sessions
   - `GET /api/summary/weekly` - Get weekly summaries

2. **Database Setup**
   - ✅ Choose database (SQLite for local, PostgreSQL for production)
   - ✅ Set up schema/migrations
   - ✅ Add ORM (Prisma)

3. **UI Features**
   - ✅ Goal detail page with subjects/topics
   - ✅ Add subjects and topics UI
   - ✅ Study timer component
   - Progress tracking dashboard
   - Weekly summary view

4. **Persistence**
   - Replace React state with API calls
   - Add data persistence via database

## Current File Structure
```
prep-routine-next/
├── app/
│   ├── page.tsx          # Main homepage with goal creation (API integrated)
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles + glassmorphism classes
│   ├── goals/
│   │   └── [id]/
│   │       └── page.tsx  # Goal detail page with subjects/topics
│   ├── components/
│   │   └── StudyTimer.tsx  # Study timer component
│   └── api/
│       ├── goals/
│       │   ├── route.ts  # GET/POST /api/goals
│       │   └── [id]/
│       │       ├── route.ts  # GET /api/goals/[id]
│       │       └── subjects/
│       │           └── route.ts  # POST /api/goals/[id]/subjects
│       ├── subjects/
│       │   └── [id]/
│       │       └── topics/
│       │           └── route.ts  # POST /api/subjects/[id]/topics
│       └── sessions/
│           └── route.ts  # GET/POST /api/sessions
├── lib/
│   └── prisma.ts         # Prisma client instance
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── types/
│   └── index.ts          # TypeScript interfaces
└── package.json
```

## Design Notes
- Background: Gradient (`from-blue-400 via-purple-400 to-pink-400`)
- Glass cards: `.glass` class with `backdrop-filter: blur(10px)`
- Rounded corners: `rounded-3xl` (large) and `rounded-2xl` (medium)
- Colors: White text on gradient, gray-800 for text on glass

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Notes for Future Development
- ✅ Backend API integrated - goals are now persisted to SQLite database
- ✅ Data persists across page refreshes
- ✅ Goal detail pages with navigation (Next.js dynamic routes)
- ✅ Subjects and topics can be added through UI
- ✅ Study timer with start/stop functionality
- ✅ Study sessions are tracked and automatically update study time
- ✅ Subjects and topics can be selected for focused study tracking
- Need to add weekly summary calculations
- Database file: `dev.db` (SQLite) in project root

