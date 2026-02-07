# Commando AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-1.5_Pro-4285F4.svg)](https://deepmind.google/technologies/gemini/)

---

## Overview

**Commando AI** is an advanced workflow automation platform with real-time video meeting capabilities and AI-powered project management. Built with Next.js 14, it enables users to create visual workflow automations through a drag-and-drop interface, integrating multiple services like Slack, Discord, Notion, Google Drive, Gmail, and Google Calendar. The platform features a comprehensive **AI Layer powered by Gemini-2.5-flash** for intelligent task generation, assignee suggestions, sprint planning, timeline optimization, and project summaries—all with human-in-the-loop confirmation before any changes are applied.

---

## ✨ Features

### 🔄 Visual Workflow Builder
- **Drag-and-Drop Editor** – Build complex automations visually using ReactFlow
- **AI Workflow Generation** – Describe your workflow in natural language and let Gemini AI generate it
- **Real-time Workflow Execution** – Execute workflows with proper data passing between nodes
- **Topological Sort Execution** – Smart node execution order with dependency resolution
- **Template Variables** – Dynamic data passing with `{{triggerData}}`, `{{previousOutput}}`, `{{fileName}}` support

### 🔗 Integrations & Connections
| Service | Trigger | Action |
|---------|---------|--------|
| **Google Drive** | ✅ Watch for file changes | - |
| **Google Calendar** | - | ✅ Create calendar events |
| **Gmail** | ✅ Read emails (filters, labels) | ✅ Send emails, create drafts |
| **Slack** | - | ✅ Post messages to channels |
| **Discord** | - | ✅ Post messages via webhooks |
| **Notion** | - | ✅ Create database entries |
| **Custom Webhooks** | ✅ Receive webhook triggers | ✅ Send HTTP requests |

### 🧩 Workflow Node Types
- **Triggers:** Google Drive, Gmail Read, Schedule Trigger, Custom Webhook, Generic Trigger
- **Actions:** Slack, Discord, Notion, Gmail Send, Google Calendar, Email, HTTP Request
- **Logic & Utilities:** Condition (branching), AI (Gemini-powered processing), Wait (delays), Text Formatter, Data Filter, Code (custom logic)

### 🎥 Real-Time Video Meetings
- **Stream.io Integration** – HD video conferencing powered by Stream Video SDK
- **Live Transcription** – Real-time audio transcription using OpenAI Whisper API
- **Meeting Types:**
  - Instant meetings
  - Scheduled meetings with calendar integration
  - Join via link or code
  - Personal meeting rooms
- **Call History** – View upcoming, previous, and recorded meetings

### 🤖 AI-Powered Features
- **Popup AI Assistant** – Voice and text-enabled assistant for queries and commands
- **Workflow Generation** – Natural language to workflow automation
- **AI Processing Node** – Use Gemini AI for summarization, analysis, and content generation
- **Speech Synthesis** – Text-to-speech for assistant responses

### 🧠 AI Project Management Layer (Gemini-2.5-flash)
A comprehensive AI layer that assists with project management tasks while keeping humans in control:

| Feature | Description | Location |
|---------|-------------|----------|
| **AI Task Generation** | Generate relevant tasks from project context, existing issues, and team capacity | Project Dashboard |
| **AI Assignee Suggestion** | Smart assignee recommendations based on skills, workload, and issue requirements | Issue Detail Page |
| **AI Sprint Planner** | Intelligent sprint planning with capacity analysis and priority recommendations | Backlog Page |
| **AI Timeline Suggestions** | Suggest optimal start/due dates based on dependencies and team availability | Timeline View |
| **AI Project Summary** | Generate executive summaries with metrics, risks, blockers, and recommendations | Project Dashboard |

**Key Principles:**
- 🔒 **Human-in-the-Loop** – All AI suggestions require user review and confirmation before applying
- 🎯 **Context-Aware** – AI analyzes project data, team workload, and historical patterns
- ✅ **Validated Outputs** – All AI responses are validated with Zod schemas
- 📊 **Transparent Reasoning** – AI explains its suggestions with clear reasoning

### 🔐 Authentication & User Management
- **Clerk Authentication** – Secure sign-in/sign-up with OAuth support
- **User Tiers** – Free and paid tier support with credit system
- **Profile Management** – User settings and profile customization

### 💳 Billing & Subscriptions
- **Stripe Integration** – Payment processing for premium features
- **Credit System** – Usage-based credits for workflow executions

---

## 🏗️ Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | Clerk |
| **UI** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **State** | Zustand + React Context |
| **Video** | Stream.io SDK |
| **AI** | OpenAI (Whisper), Google Gemini |
| **Workflow** | ReactFlow |
| **Payments** | Stripe |

### Project Structure
```
src/
├── app/
│   ├── (auth)/                 # Sign-in/sign-up pages
│   ├── (main)/(pages)/         # Protected dashboard pages
│   │   ├── dashboard/          # Main dashboard + meetings
│   │   │   └── (meeting)/      # Video conferencing pages
│   │   ├── projects/           # Project management
│   │   │   └── [projectId]/    # Project-specific pages
│   │   │       ├── dashboard/  # Project dashboard + AI insights
│   │   │       ├── backlog/    # Sprint planning + AI planner
│   │   │       ├── board/      # Kanban board
│   │   │       ├── issues/     # Issue management + AI assignee
│   │   │       └── timeline/   # Timeline view
│   │   ├── workflows/          # Visual workflow editor
│   │   ├── connections/        # Third-party integrations
│   │   ├── billing/            # Subscription management
│   │   └── settings/           # User settings
│   └── api/                    # API routes
│       ├── transcribe/         # OpenAI Whisper transcription
│       ├── generate-workflow/  # AI workflow generation
│       ├── gmail/              # Gmail integration
│       ├── calendar/           # Google Calendar
│       └── ...
├── components/                 # Reusable UI components
│   └── ai/                     # AI-specific UI components
│       ├── ai-task-generator-modal.tsx
│       ├── ai-assignee-suggestion-modal.tsx
│       ├── ai-sprint-planner-modal.tsx
│       ├── ai-project-summary-modal.tsx
│       └── ai-buttons.tsx      # AI-branded buttons & badges
├── providers/                  # Context providers
├── lib/                        # Utilities & types
│   ├── ai/                     # AI Layer (Gemini-2.5-flash)
│   │   ├── ai.types.ts         # Zod schemas & TypeScript types
│   │   ├── gemini.client.ts    # Isolated Gemini API client
│   │   ├── prompt.builder.ts   # Prompt templates for all AI features
│   │   ├── ai.actions.ts       # Server actions with auth
│   │   └── index.ts            # Centralized exports
│   ├── workflow-executor.ts    # Workflow execution engine
│   ├── types.ts                # TypeScript definitions
│   └── db.ts                   # Prisma client
└── hooks/                      # Custom React hooks
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/VirusHacks/CommandoAI
   cd CommandoAI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Fill in the required environment variables (see below).

4. **Set Up Database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Stream.io (Video)
NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET_KEY=...

# OpenAI (Transcription)
OPENAI_API_KEY=sk-...

# Google Gemini (AI)
GEMINI_API_KEY=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Slack OAuth
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Discord
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Notion
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

---

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run dev:https    # Start with HTTPS (experimental)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma database GUI
npx prisma db push   # Sync schema to database
```

---

## 🔧 Key Features Deep Dive

### Workflow Execution Engine
The workflow executor (`src/lib/workflow-executor.ts`) handles:
- **Topological sorting** for proper execution order
- **Template resolution** for dynamic data passing
- **Node-specific execution** for each integration type
- **Error handling** with detailed execution logs
- **Test mode** for workflow validation

### Node Configuration
Each workflow node supports:
- Custom titles and descriptions
- Type-specific metadata configuration
- Template variables for dynamic content
- Connection to previous node outputs

### Meeting Transcription
- Real-time audio capture from browser
- Chunked audio processing for efficiency
- OpenAI Whisper API integration
- Live subtitle display during meetings

### AI Layer Architecture
The AI layer (`src/lib/ai/`) provides intelligent project management assistance:

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                          │
│  (Modals, Buttons, Preview Cards with human confirmation)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Server Actions                            │
│  (Auth check, project access, Zod validation, logging)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Prompt Builder                             │
│  (Context-aware prompts for each AI capability)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Gemini Client                              │
│  (API calls, retry logic, JSON extraction, error handling)  │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Isolated Service Layer** – AI code is completely separated from business logic
- **No Auto-writes** – AI never writes to the database without user confirmation
- **Validated Responses** – All AI outputs are validated with Zod schemas before use
- **Retry Logic** – 2 automatic retries on transient failures
- **Error Handling** – Specific error types for rate limits, auth failures, and context overflow

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React Framework
- [Clerk](https://clerk.com/) - Authentication
- [Stream.io](https://getstream.io/) - Video SDK
- [ReactFlow](https://reactflow.dev/) - Visual Workflow Editor
- [shadcn/ui](https://ui.shadcn.com/) - UI Components
- [OpenAI](https://openai.com/) - Whisper Transcription
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI Generation
