# Commando AI

> **Project management that learns, predicts, and works where you code.**

<div align="center">

### 🎬 Watch the Demo

<a href="https://youtu.be/2j6ZlTjrUX4">
  <img src="https://img.youtube.com/vi/2j6ZlTjrUX4/hqdefault.jpg" alt="Commando AI Demo" width="600"/>
</a>

▶️ **[Click to watch the full demo on YouTube](https://youtu.be/2j6ZlTjrUX4)**

</div>

---

## 🎯 What Makes Commando AI Different

### 1. **AI That Actually Learns From YOUR Team** 
Most AI tools give the same suggestions to everyone. Ours learns what works for YOUR specific team and gets smarter with every decision you make. It uses advanced reinforcement learning (Thompson Sampling) to figure out which recommendations you actually like.

**Simple example:** If your team prefers reassigning tasks over delaying them, the AI notices and adapts in real-time.

---

### 2. **Predictions You Can Actually Trust**
Stop guessing delivery dates. Get **probability-based forecasts** instead of random estimates. Our system runs 10,000 simulations of your project's future to tell you: *"90% chance we'll finish by March 15"* — not just *"March 1 maybe?"*

**Simple example:** Like a weather forecast for your project — we show you the chances, not false promises.

---

### 3. **Works Right Inside Your Code Editor**
Forget switching between ten browser tabs. Ask questions about your project **directly in VS Code, Cursor, or any IDE** using our MCP Server. Your AI coding assistant (GitHub Copilot, Claude) now knows your project status.

**Simple example:** Type *"What's blocking my current task?"* in your editor — get instant answers without leaving your code.

---

### 4. **Multiple AI Agents That Debate & Collaborate**
Instead of one AI assistant, you get a team of specialist agents (Developer, Manager, Optimizer) that discuss plans, challenge each other's ideas, and vote on decisions — just like a real team.

**Simple example:** Developer agent says "this needs 5 days," Manager agent counters "we have 3 days," Optimizer agent finds a middle ground — you get the best solution.

---

## 💡 Core Platform Features

**Commando AI** is a complete AI-powered project management platform with six role-based dashboards, workflow automation, video meetings with live transcription, full CRM, and predictive delivery intelligence.

---

## ⚡ Key Features Overview

| What It Does | Why It Matters |
|--------------|----------------|
| **6 Role-Based Dashboards** | Every team member sees exactly what they need — developers see tasks, managers see plans, executives see strategy |
| **AI Task Generator** | Describe your feature in plain English → Get organized tasks, assignees, and timelines automatically |
| **Intelligent Delivery Predictions** | Know when you'll actually finish (with confidence levels) using Monte Carlo simulations |
| **Smart Resource Allocation** | AI learns which team members excel at which tasks and suggests optimal assignments |
| **Visual Workflow Builder** | Build automations by dragging boxes — no coding needed (Slack, Notion, Google Drive, Discord) |
| **Live Meeting Transcription** | HD video calls with real-time AI transcription — never miss important details |
| **Full Sales CRM** | Track customers, forecast revenue, analyze trends with AI-generated charts |
| **MCP Server for IDEs** | Ask your coding assistant about projects, tasks, sprints — without leaving your editor |
| **Multi-Agent Collaboration** | AI agents that debate, vote, and coordinate like a real team |

---

## 👥 Who Commando AI is Built For

Different roles see different dashboards — everyone gets exactly what they need:

### 💼 For Project Managers
Your command center for team success:
- Create and assign tasks with AI suggestions
- Drag-and-drop Kanban boards
- See delivery predictions with confidence scores (e.g., "90% sure by Feb 15")
- Get resource recommendations ("Move Sarah to backend — she's 40% faster there")
- Chat with your AI PM assistant using voice or text
- Plan sprints automatically with AI

### 👨‍💻 For Developers  
Focus on code, not admin:
- See only YOUR tasks in a clean view
- GitHub issues and commits right in the dashboard
- Ask project questions in your IDE (via MCP Server)
- Get suggested branch names and commit messages
- Track your velocity and contributions

### 📊 For Executives
High-level insights without the noise:
- Delivery health across all projects
- Risk indicators and team utilization
- Strategic resource allocation
- What-if scenario planning

### 💰 For Finance & HR
Keep budgets and teams healthy:
- Cost tracking per project and team member
- Burnout risk indicators
- Resource utilization heatmaps
- Budget vs actual analysis

### 📈 For Sales Teams
Complete CRM with AI intelligence:
- Revenue forecasting with confidence intervals
- Customer analytics and RFM segmentation
- AI-generated charts from natural language ("Show Q1 revenue by product")
- WhatsApp integration for customer outreach
- Deal pipeline tracking

### 🧪 For QA Testers
*(Coming Soon — Placeholder Dashboard)*

---

## 🤖 How Our AI Actually Works

### Smart Task Generation
**What you do:** Describe a feature in plain English
**What AI does:** Creates organized tasks, suggests who should do them, estimates timelines

### Learning Over Time
**What you do:** Accept or reject AI suggestions  
**What AI does:** Remembers what works for YOUR team and stops suggesting things you don't like

### Predicting the Future
**What you do:** Ask "when will this be done?"  
**What AI does:** Runs 10,000 simulations of possible futures and tells you probabilities (like weather forecasts)

### Multi-Agent Teamwork
**What you do:** Ask for a decision  
**What AI does:** Three specialist agents (Developer, Manager, Optimizer) debate the options and vote on the best path

### Natural Language to Action
**What you do:** Say "create a task for authentication" or "show me this quarter's revenue"  
**What AI does:** Understands intent and executes — creates tasks, generates charts, plans sprints

---

## 🎯 Why Our Predictions Work

### The Problem with Traditional Planning
Most project management tools show one date: *"Expected: March 1"*  
Reality: You finish March 22 and everyone's upset.

### Our Solution: Show Probabilities, Not Promises
Instead of guessing one date, we run **10,000 simulations** of your project with different scenarios:
- What if Sarah takes longer on that API?
- What if the dependency gets delayed?
- What if someone takes a vacation?

**You get:** *"50% chance by Feb 28, 90% chance by March 7"*  
**Just like:** Weather forecasts — helpful uncertainty instead of false confidence

### Smart Resource Recommendations
The AI learns which team members work best on which tasks and suggests:
- "Move this to James — he's 35% faster at backend work"
- "Delay this task — Sam is overloaded and at burnout risk"
- "Split this into two tasks for better parallelization"

Every time you accept or reject a suggestion, the AI gets smarter for YOUR specific team.

---

## 📊 Predictive Analysis & Business Intelligence — Under the Hood

### How Monte Carlo Simulation Powers Delivery Predictions

Traditional tools give you one date. We give you a **probability curve** built from real math:

```
Your Project Data (velocity, task sizes, team availability)
        ↓
Run 10,000 Simulated Project Timelines
        ↓
Each simulation randomly varies: task durations, blocker chances, team capacity
        ↓
Sort all 10,000 outcomes → Get probability distribution
        ↓
Output: P50 (median), P70 (likely), P85 (safe), P90 (high confidence)
```

**What we factor into each simulation:**
- **Historical velocity** — How fast has this team actually moved in past sprints?
- **Task estimation uncertainty** — Developer estimates are usually off by 20-30%. We model that.
- **Dependency chains** — Task B can't start until Task A finishes. We simulate delays cascading.
- **Team availability** — PTO, holidays, context-switching. All modeled.
- **Burnout risk** — Overworked team members slow down. We account for that too.

**Business value:**
- Managers make commitments to clients with actual confidence levels
- Executives see revenue-at-risk when deadlines slip
- Finance teams budget based on realistic timelines, not wishful thinking

### What-If Scenario Planning
Before making a big decision, simulate it first:
- *"What happens if we add 2 developers?"* → See cost vs. timeline tradeoff
- *"What if we cut 30% of scope?"* → See the new delivery curve
- *"What if we remove this blocker?"* → See how much time we save

Each scenario runs its own 10,000 simulations. You compare them side by side.

---

### How Thompson Sampling Powers Smart Recommendations

This is the AI that **gets smarter over time**. Here's how it works in plain English:

**The Problem:** You have 6 possible actions when a project hits trouble:
1. **Reassign the task** to someone better suited
2. **Delay the task** to a less busy sprint
3. **Split the task** into smaller pieces
4. **Add a reviewer** for quality assurance
5. **Suggest external help** (contractor, another team)
6. **Rebalance the workload** across the team

Which one should the AI suggest? It depends on YOUR team's preferences and history.

**The Solution — Learning by Doing:**

```
Step 1: Start with no assumptions (equal chance for all 6 actions)
Step 2: Suggest an action based on current knowledge
Step 3: Manager accepts or rejects the suggestion
Step 4: AI updates its understanding:
        ✅ Accepted → "This action works for this team" (boost confidence)
        ❌ Rejected → "This team doesn't like this" (lower confidence)
Step 5: Next suggestion is smarter. Repeat forever.
```

**Why Thompson Sampling specifically?**
- **No tuning required** — It just works. Other algorithms need manual configuration.
- **Handles uncertainty** — Early on, it explores different options. Once confident, it sticks with winners.
- **Adapts to change** — Team dynamics shift? It adjusts automatically.
- **Works with small data** — Only needs ~20-30 decisions to get good. Most ML needs thousands.

**Context-Aware:** The AI doesn't just learn globally — it learns PER CONTEXT:
- Small teams need different strategies than large teams
- Early sprint recommendations differ from late sprint ones
- Overloaded teams get different suggestions than underutilized teams

**Delayed Reward Learning:**
Sometimes you don't know if a recommendation was good until weeks later (did the task succeed?). We handle this with two-phase learning:
1. **Immediate feedback:** Manager accepts/rejects (fast signal)
2. **Outcome tracking:** Did the task actually finish on time? (delayed signal, updates the model retroactively)

---

### Sales Forecasting & Revenue Intelligence

For sales teams, we combine multiple prediction engines:

**Revenue Forecasting:**
- Prophet time-series model trained on your sales history
- Predicts revenue, average order value, and order volume
- Shows confidence intervals (not just one number)
- Handles seasonality automatically (holiday spikes, summer dips)

**Customer Analytics:**
- **RFM Segmentation** — Groups customers by Recency, Frequency, and Monetary value
- Identifies your best customers, at-risk customers, and re-engagement targets
- Visual analytics: bar charts, radar charts, radial charts

**AI-Generated Charts:**
Ask in plain English → Get a chart:
- *"Show me revenue by month for Q1"*
- *"Compare top 10 customers by lifetime value"*
- *"What's the sales trend by day of week?"*

The AI generates the right chart type, colors, and labels automatically.

**Business Impact:**
- Sales teams forecast pipeline with mathematical confidence
- Finance plans budgets based on predicted revenue curves
- Executives see at-a-glance health metrics across business units

---

## 🔄 Workflow Automation (No Code Required)

### Build Automations Like LEGOs
Drag and drop blocks to create powerful automations:
- **When** a file changes in Google Drive → **Send** a Slack message
- **When** someone emails you → **Create** a Notion task
- **On schedule** every Monday → **Generate** a weekly report

### Supports Your Favorite Tools
✅ Google Drive, Gmail, Calendar  
✅ Slack, Discord, Notion  
✅ Webhooks, scheduled triggers  
✅ AI processing nodes  

### Or Just Describe It
Too lazy to drag boxes? Tell AI: *"Send me a Slack message every time someone updates the shared folder"* — AI builds the workflow for you.

---

## 🎥 Video Meetings with Live AI Transcription

Hold meetings right inside the platform:
- HD video with screen sharing
- AI transcribes everything in real-time (like Zoom live captions)
- Meeting chat built-in
- Recordings and meeting history
- Instant meetings or scheduled calls

No more scrambling to take notes — just review the transcript later.

---

## 💻 MCP Server: Your IDE Knows Your Project

### What is MCP?
Model Context Protocol — it lets your AI coding assistant (GitHub Copilot, Claude, Cursor) talk directly to Commando AI.

### What You Can Do
Ask questions in your code editor:
- *"What tasks are blocking me?"*
- *"Generate a standup update"*
- *"What's the ideal branch name for this feature?"*
- *"Show me the next high-priority task"*
- *"Get implementation plan for authentication"*

26 tools available — from task management to AI-powered planning.

### Setup is Simple
```bash
cd mcp-server
npm install && npm run build
```
Then configure your IDE to point to the built server. Done.

---

## 🏠 Unified Dashboard

Your home base connects everything:
- **Calendar** — Google Calendar integration with AI insights
- **Email** — Gmail inbox with AI-powered email analysis
- **Drive** — Google Drive file browser
- **Workflows** — See automation status at a glance
- **Activity Feed** — Recent project updates
- **Quick Actions** — One-click common tasks
- **Metrics** — Key stats overview

---

## 🔐 Security & Access

### Multi-Layer Protection
- Industry-standard OAuth authentication (Clerk)
- Data encrypted at rest and in transit
- Role-based access control (Owner, Admin, Member, Viewer)
- Department-specific permissions
- Super user system for admins

### Your Data Stays Yours
- All project data in YOUR PostgreSQL database
- AI models don't train on your data
- MCP server runs locally (code never leaves your machine)
- Self-hosted option available for enterprises

---

## 🚀 Getting Started

### What You Need
- Node.js 18 or higher
- A PostgreSQL database
- API keys (we'll tell you which ones)

### Installation (5 Minutes)

**1. Clone the project**
```bash
git clone https://github.com/VirusHacks/CommandoAI
cd CommandoAI
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment**
```bash
cp .env.example .env
# Open .env and add your API keys
```

**4. Set up database**
```bash
npx prisma db push
npx prisma generate
```

**5. Start the app**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're ready!

---

## 🔑 Required API Keys

You'll need accounts (most have free tiers):

| Service | What It's For | Get It From |
|---------|---------------|-------------|
| **Clerk** | User authentication | [clerk.com](https://clerk.com) |
| **Google Gemini** | AI intelligence | [ai.google.dev](https://ai.google.dev) |
| **Stream.io** | Video meetings | [getstream.io](https://getstream.io) |
| **OpenAI** | Transcription | [platform.openai.com](https://platform.openai.com) |

Optional integrations (add later if needed):
- Google OAuth (Drive, Gmail, Calendar)
- Slack, Discord, Notion (for workflow automations)
- GitHub App (for developer dashboard)
- Stripe (for billing features)

---

## 🛠️ Tech Stack (For the Technical Folks)

**Built with modern, battle-tested tools:**

- **Frontend:** Next.js 14, React 18, TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Google Gemini 2.5 Flash, OpenAI Whisper
- **Auth:** Clerk with OAuth
- **UI:** Tailwind CSS, shadcn/ui (Radix primitives)
- **Video:** Stream.io SDK
- **Workflow:** ReactFlow visual editor
- **Charts:** Recharts

---

## 📝 Useful Commands

Once you're set up:

```bash
npm run dev          # Start development (localhost:3000)
npm run build        # Build for production
npm run start        # Run production build
npx prisma studio    # Open database GUI (super useful!)
npx prisma db push   # Update database schema
```

---

## 📖 Learn More

Want to dive deeper?

- **QA_PREPARATION.md** — Deep technical explanations of algorithms
- **QUICK_REFERENCE_CARD.md** — Cheat sheet for core features  
- **Demo Recordings** — Check `/transcriptions` for meeting examples

---

## 💬 Questions or Issues?

- Open an issue on GitHub
- Check existing documentation in the repo
- Review the code — it's well-commented!

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Built With

Thanks to these amazing tools that made Commando AI possible:
- [Next.js](https://nextjs.org/) — React framework
- [Clerk](https://clerk.com/) — Authentication  
- [Google Gemini](https://ai.google.dev/) — AI engine
- [Stream.io](https://getstream.io/) — Video infrastructure
- [Prisma](https://www.prisma.io/) — Database magic
- [shadcn/ui](https://ui.shadcn.com/) — Beautiful components

---

**Built with ❤️ for teams that want to ship faster without burning out.**
