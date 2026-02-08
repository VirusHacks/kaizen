# Commando AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4.svg)](https://deepmind.google/technologies/gemini/)

---

## Overview

**Commando AI** is a full-stack AI-powered project management and workflow automation platform built with Next.js 14. It combines visual workflow automations, real-time video meetings with live transcription, a complete CRM, predictive delivery intelligence, multi-agent collaboration, and an MCP server for IDE integration — all driven by **Gemini 2.5-flash** with human-in-the-loop safeguards.

The platform provides **six role-based dashboards** (Developer, Project Manager, Executive, Finance & HR, Sales, QA Tester), each tailored with role-specific tools, analytics, and AI capabilities.

---

## ✨ Features at a Glance

| Category | Highlights |
|----------|------------|
| **Role-Based Dashboards** | 6 department views with tailored tools and analytics |
| **AI Engine (Gemini 2.5-flash)** | Task generation, assignee suggestion, sprint planning, timeline, summaries |
| **Multi-Agent System** | Developer, Manager, Optimizer agents with autonomous coordination |
| **Predictive Delivery Engine** | Monte Carlo simulations, dependency analysis, what-if scenarios |
| **Resource Allocation** | Thompson Sampling, burnout modeling, Pareto-optimal scoring |
| **Visual Workflow Builder** | Drag-and-drop ReactFlow editor with 15+ node types |
| **Sales CRM** | Revenue analytics, forecasting, RFM segmentation, AI chart generation |
| **Video Meetings** | Stream.io HD video with live Whisper transcription |
| **GitHub Integration** | GitHub App with OAuth, webhooks, issues/commits in developer view |
| **MCP Server** | 26 tools for VS Code / Copilot / Claude / Cursor integration |
| **Service Integrations** | Google Drive, Gmail, Calendar, Slack, Discord, Notion |
| **Super User System** | Admin role override for cross-project access with role selection |

---

## 👥 Role-Based Project Dashboards

Each project member is assigned a department role that determines their dashboard experience:

### Project Manager
Full project control with AI-assisted planning:
- **Issues CRUD** — Create, assign, track issues with AI assignee suggestions
- **Kanban Board** — Drag-and-drop board with DnD Kit
- **Backlog & Sprint Planning** — AI-powered sprint population
- **Timeline (Gantt)** — Visual timeline with AI date suggestions
- **Workflow Editor** — Custom status transitions per project
- **Team Management** — Member roles and permissions
- **Resource Planning** — Utilization heatmaps, delivery confidence, risk analysis, recommendations
- **Delivery Engine** — Monte Carlo predictions, what-if scenarios, commitment tracking
- **Agent Collaboration** — Multi-agent autonomous team dashboard
- **PM Assistant Chat** — Gemini-powered conversational PM with function calling and voice I/O

### Developer
Focused task execution with GitHub integration:
- **My Tasks** — Filtered view of assigned issues with Kanban or list layout
- **Task Detail Panel** — Inline issue detail with status updates
- **GitHub Issues** — Live GitHub issues with state filter (open/closed/all), labels, assignees
- **GitHub Commits** — Commits grouped by date with author info, SHA copy, external links

### Executive
Strategic oversight dashboards:
- **Delivery Intelligence** — High-level project health and delivery predictions
- **Resource Insights** — Team utilization and capacity overview

### Finance & HR
Cost and team health monitoring:
- **Cost Efficiency** — Budget tracking and resource cost analysis
- **Burnout Risk** — Team workload and burnout risk indicators

### Sales (Full CRM)
Complete sales intelligence suite:
- **Analysis Dashboard** — 11 chart types: monthly sales, AOV trend, RFM (bar/radar/radial), revenue by day/hour, top countries/products/customers
- **Prediction Dashboard** — Revenue/AOV/Orders forecasts with confidence radial
- **Generative Chart Chatbot** — Natural language to charts ("Show me revenue by month")
- **Revenue, Customers, Orders** — Detailed CRUD pages with Customer360 view
- **New Leads** — Lead generation page
- **AI Sales Assistant** — Tavus video AI chatbot for sales coaching
- **WhatsApp Integration** — Message customers directly

### QA Tester
- Coming soon — placeholder with "Coming Soon" badge

---

## 🤖 AI Engine (Gemini 2.5-flash)

### Core AI Capabilities

| Feature | Description |
|---------|-------------|
| **Task Generation** | Generate epics, stories, and tasks from project context |
| **Assignee Suggestion** | Skill-based recommendations with confidence scores |
| **Sprint Planner** | Automatic sprint population with capacity analysis |
| **Timeline Suggestions** | Optimal start/due dates based on dependencies |
| **Project Summary** | Executive summaries with metrics, risks, and recommendations |
| **Chart Generation** | Natural language → chart configs for sales analytics |
| **PM Assistant** | Conversational PM with Gemini function calling (create issues, plan sprints, get stats) |

### AI Architecture
```
UI Components (Modals, Previews, Human Confirmation)
        ↓
Server Actions (Auth, Zod Validation, Logging)
        ↓
Prompt Builder (Context-aware prompts per capability)
        ↓
Gemini Client (API calls, retry logic, JSON extraction)
```

**Principles:** Human-in-the-loop confirmation, Zod-validated outputs, context-aware prompts, 2x automatic retries, isolated service layer.

### Multi-Agent Collaboration System
Three autonomous AI agent types coordinating project work:

| Agent | Role |
|-------|------|
| **Developer Agent** | Code-focused task execution and technical decisions |
| **Manager Agent** | Planning, coordination, and priority management |
| **Optimizer Agent** | Performance optimization and process improvement |

Features: inter-agent message bus, decision proposals & reviews, mood tracking (focused/stressed/idle/collaborative/blocked), configurable autonomy levels, orchestrated planning cycles.

---

## 📊 Predictive Delivery Engine

Monte Carlo-powered delivery intelligence system:

- **Monte Carlo Simulations** — 10,000-iteration probabilistic delivery predictions (P50/P70/P85/P90 confidence levels)
- **Dependency Analyzer** — Dependency graph traversal, critical path identification, delay cascade analysis, bottleneck detection
- **What-If Scenarios** — Simulate adding developers, reducing scope, removing blockers; compare cost and schedule impact
- **Commitment Tracker** — Track promises to customers vs. actual delivery with revenue-at-risk calculations

---

## ⚖️ Resource Allocation Engine

Intelligent resource optimization using machine learning techniques:

- **Thompson Sampling** — Contextual bandit algorithm for optimal task assignment
- **Historical Learning** — Learns from past allocation outcomes
- **Skill-Task Matching** — Scores based on skill compatibility
- **Burnout Modeling** — Exponential burnout risk calculation
- **Multi-Objective Pareto Scoring** — Balances speed, quality, and team health
- **Delivery Confidence** — Real-time confidence scores for sprint completion

---

## 🔄 Visual Workflow Builder

Build complex automations through a drag-and-drop ReactFlow editor:

- **15+ Node Types** — Triggers, actions, logic, and AI nodes
- **AI Workflow Generation** — Describe workflows in natural language
- **Topological Sort Execution** — Smart dependency-based execution order
- **Template Variables** — Dynamic data passing (`{{triggerData}}`, `{{previousOutput}}`)

### Supported Integrations

| Service | Trigger | Action |
|---------|---------|--------|
| **Google Drive** | ✅ File changes | — |
| **Google Calendar** | — | ✅ Create events |
| **Gmail** | ✅ Read emails | ✅ Send / draft |
| **Slack** | — | ✅ Post messages |
| **Discord** | — | ✅ Webhook messages |
| **Notion** | — | ✅ Create entries |
| **Webhooks** | ✅ Receive | ✅ Send HTTP |

### Node Categories
- **Triggers:** Google Drive, Gmail Read, Schedule, Webhook, Generic
- **Actions:** Slack, Discord, Notion, Gmail Send, Calendar, Email, HTTP
- **Logic:** Condition (branching), AI Processing, Wait, Text Formatter, Data Filter, Code

---

## 🎥 Real-Time Video Meetings

Stream.io-powered video conferencing with live AI transcription:

- **HD Video** — Stream Video SDK with full conferencing features
- **Live Transcription** — Real-time OpenAI Whisper transcription with subtitle display
- **Meeting Types** — Instant, scheduled, join via link/code, personal rooms
- **Meeting Chat** — In-call messaging
- **Text-to-Speech** — AI-generated voice responses
- **Call History** — Upcoming, previous, and recorded meetings

---

## 🔗 GitHub Integration

Full GitHub App integration for seamless development workflow:

- **GitHub App** — JWT-authenticated with installation tokens, dual-mode (App + OAuth)
- **Webhook Processing** — Real-time event handling for push, issues, pull requests
- **Developer View** — GitHub issues list with state filter, labels, assignees; commits grouped by date with SHA copy
- **Repository Management** — Link repos to projects, browse installations

---

## 🛠️ MCP Server (26 Tools)

A standalone Model Context Protocol server enabling AI coding assistants to interact with project data directly from your IDE.

**Compatible with:** VS Code / GitHub Copilot, Claude Desktop, Claude Code CLI, Cursor

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Project Context** | 4 | `list_projects`, `get_project_context`, `get_coding_standards`, `get_team_members` |
| **Task Management** | 8 | `get_my_tasks`, `get_task_details`, `find_task_by_key`, `update_task_status`, `update_task_description`, `search_tasks`, `create_task`, `get_all_tasks` |
| **Sprint Management** | 3 | `get_sprints`, `get_active_sprint`, `get_backlog` |
| **Workflow** | 2 | `get_allowed_transitions`, `get_workflow` |
| **AI-Powered** | 4 | `generate_implementation_plan`, `ask_project_question`, `generate_test_cases`, `check_acceptance_criteria` |
| **Productivity** | 5 | `get_my_stats`, `generate_standup`, `get_branch_name`, `get_commit_message`, `get_next_task` |

### MCP Setup
```bash
cd mcp-server
npm install
npm run build
```
Configure in your IDE's MCP settings to point to the built server.

---

## 🏠 Dashboard & Widgets

The main dashboard provides a unified view with 14 widget components:

| Widget | Description |
|--------|-------------|
| **Calendar Widget** | Google Calendar integration with weekly view |
| **Calendar AI Modal** | AI-powered calendar insights |
| **Drive Widget** | Google Drive file browser |
| **Drive AI Modal** | AI-powered Drive analysis |
| **Gmail Widget** | Gmail inbox integration |
| **Gmail AI Modal** | AI-powered email insights |
| **Notion Widget** | Notion workspace integration |
| **Workflows Widget** | Workflow automation status |
| **Activity Feed** | Recent activity stream |
| **Quick Actions** | One-click common actions |
| **Stats Bar** | Key metrics overview |
| **File Types Chart** | File distribution visualization |

---

## 🔐 Authentication & Access Control

### Clerk Authentication
- OAuth sign-in/sign-up with Google and other providers
- Route protection via `clerkMiddleware`
- User sync via Clerk webhooks

### Role System
- **Project Roles:** Owner, Admin, Member, Viewer
- **Department Roles:** Developer, QA Tester, Finance, Sales, Executive, Project Manager
- **Super User System:** Designated admins can override role assignment when accessing any project, selecting from all department roles via a dropdown

### Billing
- Stripe integration for premium features
- Credit-based usage system (Free / Pro / Unlimited tiers)

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Prisma ORM (33 models) |
| **Auth** | Clerk |
| **UI** | Tailwind CSS + shadcn/ui (Radix) |
| **State** | Zustand + React Context (7 providers) |
| **Video** | Stream.io SDK |
| **AI** | Google Gemini 2.5-flash, OpenAI Whisper |
| **Workflow** | ReactFlow / XYFlow |
| **Charts** | Recharts |
| **DnD** | @dnd-kit |
| **Payments** | Stripe |
| **Background Jobs** | Inngest |
| **GitHub** | Octokit + GitHub App |

### Project Structure
```
src/
├── app/
│   ├── (auth)/                    # Sign-in / sign-up
│   ├── (main)/(pages)/            # Protected pages
│   │   ├── dashboard/             # Home dashboard + widgets
│   │   │   └── (meeting)/         # Video conferencing
│   │   ├── projects/              # Project listing
│   │   │   └── [projectId]/       # Role-based project views
│   │   │       ├── project-manager/  # PM dashboard (10+ sub-pages)
│   │   │       ├── developer/        # Dev tasks + GitHub
│   │   │       ├── executives/       # Executive insights
│   │   │       ├── finance/          # Finance & HR
│   │   │       ├── sales/            # Full CRM (8 sub-pages)
│   │   │       └── qa-tester/        # QA (coming soon)
│   │   ├── workflows/             # Visual workflow editor
│   │   ├── connections/           # Service integrations
│   │   ├── billing/               # Subscription management
│   │   └── settings/              # User settings
│   └── api/                       # 22 API route groups
├── components/
│   ├── ai/                        # AI modals & buttons
│   ├── dashboard/                 # 14 dashboard widgets
│   ├── ui/                        # shadcn/ui components
│   └── ...                        # Meeting, sidebar, forms
├── lib/
│   ├── ai/                        # Gemini client, prompts, actions, types
│   ├── agents/                    # Multi-agent system (3 agent types)
│   ├── delivery-engine/           # Monte Carlo, dependencies, what-if
│   ├── resource-allocation/       # Thompson Sampling engine
│   ├── charts/                    # Chart config schemas
│   └── ...                        # DB, types, utils, workflow executor
├── providers/                     # 7 context providers
└── hooks/                         # Custom React hooks

mcp-server/                        # Standalone MCP server (26 tools)
├── src/tools/                     # Tool implementations
├── prisma/                        # Shared schema
└── package.json
```

### Database Schema (33 Prisma Models)
**Core:** User, Project, ProjectSetup, ProjectMember, Sprint, Issue
**Workflow:** Workflows, ProjectWorkflow, WorkflowStatus, WorkflowTransition
**Integrations:** LocalGoogleCredential, DiscordWebhook, Slack, Notion, GitHub, Connections
**AI Agents:** AgentProfile, AgentMessage, AgentDecision
**Delivery:** DeliveryPrediction, DeliveryCommitment, DeliveryScenario, DependencyChain, VelocitySnapshot
**Resources:** ResourceAllocation, ResourceConfig, ResourceAuditLog, PlanningCycleSnapshot, Recommendation, RecommendationOutcome
**Analytics:** DashboardAnalytics, ForecastAnalytics

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

```bash
# 1. Clone
git clone https://github.com/VirusHacks/CommandoAI
cd CommandoAI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env    # Fill in API keys (see below)

# 4. Set up database
npx prisma db push
npx prisma generate

# 5. (Optional) Set up MCP server
cd mcp-server && npm install && npm run build && cd ..

# 6. Start development server
npm run dev
```

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

# GitHub App
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

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
npm run build        # Production build (runs prisma generate)
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open database GUI
npx prisma db push   # Sync schema to database
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — React Framework
- [Clerk](https://clerk.com/) — Authentication
- [Stream.io](https://getstream.io/) — Video SDK
- [ReactFlow](https://reactflow.dev/) — Visual Workflow Editor
- [shadcn/ui](https://ui.shadcn.com/) — UI Components
- [OpenAI](https://openai.com/) — Whisper Transcription
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI Engine
- [Prisma](https://www.prisma.io/) — Database ORM
- [Recharts](https://recharts.org/) — Charts & Visualization
- [Octokit](https://github.com/octokit) — GitHub API
- [Inngest](https://www.inngest.com/) — Background Jobs
- [DnD Kit](https://dndkit.com/) — Drag and Drop
