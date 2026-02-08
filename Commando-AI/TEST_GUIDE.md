# Quick Test Guide - Predictive Delivery Engine & Agent Collaboration

## ✅ What's Been Completed

1. **Database Schema** - 5 new models added (DeliveryPrediction, DeliveryCommitment, DeliveryScenario, DependencyChain, VelocitySnapshot)
2. **Monte Carlo Engine** - 10,000-iteration simulation for delivery predictions
3. **Dependency Analyzer** - Cascade impact calculator with critical path detection
4. **What-If Scenarios** - ROI calculator for team changes
5. **Server Actions** - 14 functions for predictions, scenarios, commitments
6. **UI Dashboard** - Complete dashboard with 4 tabs (Predictions, Scenarios, Commitments, Dependencies)
7. **Dashboard Integration** - AI Features card added with buttons for both features

## 🚀 Testing Steps

### 1. Start the Development Server

```bash
cd /Users/vinay/vscode/hackathon/datathon-26/kaizen/Commando-AI
npm run dev
```

### 2. Access the Project Dashboard

Navigate to:
```
http://localhost:3000/projects/[your-project-id]/project-manager/dashboard
```

You should see a new **"AI-Powered Features"** section with two cards:
- **Agent Collaboration** - Multi-agent AI system 
- **Predictive Delivery Engine** - Monte Carlo predictions

### 3. Test Agent Collaboration

1. Click "Open Agent Dashboard" button
2. URL: `/projects/[projectId]/project-manager/agent-collaboration`
3. Click "Trigger Planning Cycle"  
4. Watch agents analyze workload and propose decisions
5. Review agent messages and recommendations

**Expected Output:**
- Optimizer analyzes team capacity
- Manager proposes workload balancing
- 5 Developers suggest task reassignments
- Decisions appear with confidence scores

### 4. Test Predictive Delivery Engine

1. Click "Open Delivery Engine" button
2. URL: `/projects/[projectId]/project-manager/delivery-engine`
3. View 4 tabs:
   - **Predictions**: Monte Carlo delivery predictions
   - **Scenarios**: What-if analysis
   - **Commitments**: Track sales promises
   - **Dependencies**: Critical path analysis

**Note:** For predictions to work, you need:
- Historical velocity data (seed with `npx tsx prisma/seed-velocity.ts`)
- Issues with proper schema fields
- Resource allocations

### 5. Seed Velocity Data (Optional)

If you want to test Monte Carlo predictions:

```bash
npx tsx prisma/seed-velocity.ts
```

This creates 8 weeks of historical velocity data for more accurate predictions.

## 📊 Dashboard Features

### AI Features Card

Located on the project dashboard (`/projects/[projectId]/project-manager/dashboard`):

**Features:**
- 2 feature cards with descriptions
- Quick stats (7 AI Agents, 10K Monte Carlo Runs, 90% Confidence)
- One-click navigation to both features
- Visual indicators (icons, badges)

**Design:**
- Gradient background
- Hover effects
- "New" badge
- Branded styling

### Agent Collaboration Dashboard

**Key Metrics:**
- Delivery confidence percentage
- Team burnout risk
- Unassigned critical tasks
- Gini coefficient (workload balance)

**Features:**
- Trigger planning cycle button
- View agent messages
- Review proposed decisions
- Real-time LLM analysis

### Predictive Delivery Engine Dashboard

**Key Metrics:**
- Delivery rate (%)
- At-risk commitments
- Average delivery time (days)
- Revenue at risk ($)

**Features:**
- Monte Carlo predictions for issues/sprints
- What-if scenario templates
- Commitment tracker
- Dependency chain analysis

## 🔧 Configuration

### Environment Variables (.env)

Required:
```
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-proj-..."  # For agents
CLERK_SECRET_KEY="sk_..."     # For auth
```

### Prisma Schema

Already applied via `npx prisma db push`

New tables:
- `DeliveryPrediction`
- `DeliveryCommitment` 
- `DeliveryScenario`
- `DependencyChain`
- `VelocitySnapshot`

## 🎯 Known Limitations

### Issue Model
The current `Issue` model doesn't have:
- `estimatedHours` field
- `storyPoints` field

**Workaround:** Dependency analyzer defaults all tasks to 8 hours (1 day)

### Velocity Data  
For accurate predictions, seed historical velocity:
```bash
npx tsx prisma/seed-velocity.ts
```

### Test Data
The automated test script (`test-delivery-engine.ts`) needs:
- Existing project
- Existing user
- Can be run after creating project in UI

## ✅ Verification Checklist

- [ ] Dev server running
- [ ] Can access project dashboard
- [ ] See "AI-Powered Features" section
- [ ] Can click "Open Agent Dashboard"
- [ ] Agent collaboration page loads
- [ ] Can trigger planning cycle
- [ ] Agents produce messages/decisions
- [ ] Can click "Open Delivery Engine"
- [ ] Delivery engine page loads
- [ ] See 4 tabs (Predictions, Scenarios, Commitments, Dependencies)
- [ ] Dashboard metrics display correctly

## 🐛 Troubleshooting

### "No velocity data"
Run: `npx tsx prisma/seed-velocity.ts`

### "Module not found" errors
Run: `npm install` 

### "Table does not exist" errors
Run: `npx prisma db push --accept-data-loss`

### Agent collaboration not working
Check `.env` has `OPENAI_API_KEY`

### Pages show blank
Check browser console for errors

## 📸 Screenshot Locations

1. **Dashboard**: `/projects/[projectId]/project-manager/dashboard`
   - Show AI Features card with 2 buttons

2. **Agent Collaboration**: `/projects/[projectId]/project-manager/agent-collaboration`
   - Show agent messages and decisions

3. **Delivery Engine**: `/projects/[projectId]/project-manager/delivery-engine`
   - Show 4 tabs with predictions

## 🎉 Success Criteria

✅ **Integration Complete** if you can:
1. See AI Features card on dashboard
2. Click both feature buttons
3. Navigate to agent collaboration
4. Navigate to delivery engine
5. View agent messages (with OPENAI_API_KEY)
6. View delivery engine tabs

The features are **fully integrated and ready for demo**!

## 📚 Documentation

- **Delivery Engine README**: `src/lib/delivery-engine/README.md`
- **Quick Start**: `DELIVERY_ENGINE_QUICKSTART.md`
- **This Guide**: `TEST_GUIDE.md`

## 💡 Demo Script

1. Show project dashboard
2. Point out new "AI-Powered Features" section
3. Click "Open Agent Dashboard"
4. Trigger planning cycle
5. Show agent analysis results
6. Go back to dashboard
7. Click "Open Delivery Engine"  
8. Show Monte Carlo predictions
9. Run what-if scenario
10. Show commitment tracker

**Total demo time: ~5 minutes**
