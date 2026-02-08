# Predictive Delivery Engine - Quick Start Guide

## What You Get

A complete **AI-Driven Enterprise Delivery & Workforce Intelligence** system that enables:
- 🎯 **90%+ confidence delivery predictions** for sales commitments
- 🔮 **Monte Carlo simulation** (10,000 iterations) for probabilistic outcomes
- 🔗 **Dependency chain analysis** showing cascade effects
- 💡 **What-if scenarios** to optimize delivery dates
- 📊 **Commitment tracking** to monitor promises vs. actuals

## Step 1: Run Database Migration

⚠️ **IMPORTANT:** This will reset your development database to add new tables.

```bash
cd /Users/vinay/vscode/hackathon/datathon-26/kaizen/Commando-AI

# Confirm and run migration
npx prisma migrate dev --name add_predictive_delivery_models
# Press 'y' when prompted to reset database

# Generate Prisma client with new models
npx prisma generate
```

**New Tables Added:**
- `DeliveryPrediction` - Monte Carlo results
- `DeliveryCommitment` - Sales promises tracker  
- `DeliveryScenario` - What-if analysis results
- `DependencyChain` - Critical path analysis
- `VelocitySnapshot` - Historical velocity data

## Step 2: Seed Historical Velocity Data

For accurate predictions, you need 4+ weeks of velocity history. Run this script:

```typescript
// prisma/seed-velocity.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedVelocity() {
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log('No project found');
    return;
  }

  // Seed last 8 weeks of velocity data
  const weeks = [
    { points: 22, tasks: 11, utilization: 0.75, burnout: 0.2 },
    { points: 24, tasks: 12, utilization: 0.80, burnout: 0.3 },
    { points: 18, tasks: 9, utilization: 0.70, burnout: 0.15 },
    { points: 26, tasks: 13, utilization: 0.85, burnout: 0.35 },
    { points: 20, tasks: 10, utilization: 0.75, burnout: 0.25 },
    { points: 23, tasks: 11, utilization: 0.78, burnout: 0.22 },
    { points: 25, tasks: 12, utilization: 0.82, burnout: 0.28 },
    { points: 21, tasks: 10, utilization: 0.74, burnout: 0.20 },
  ];

  for (let i = 0; i < weeks.length; i++) {
    const weekData = weeks[i];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (8 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    await prisma.velocitySnapshot.create({
      data: {
        projectId: project.id,
        weekStart,
        weekEnd,
        storyPoints: weekData.points,
        tasksCompleted: weekData.tasks,
        teamSize: 5,
        avgUtilization: weekData.utilization,
        avgBurnout: weekData.burnout,
      },
    });
  }

  console.log('✅ Seeded 8 weeks of velocity data');
}

seedVelocity();
```

Run it:
```bash
npx tsx prisma/seed-velocity.ts
```

## Step 3: Access the Dashboard

Navigate to:
```
http://localhost:3000/projects/[projectId]/project-manager/delivery-engine
```

You'll see 4 tabs:
1. **Predictions** - View Monte Carlo delivery predictions
2. **Scenarios** - Run what-if analysis
3. **Commitments** - Track sales promises
4. **Dependencies** - Analyze critical paths

## Step 4: Test the Features

### Test 1: Predict Issue Delivery

```typescript
// In browser console or test file
const result = await predictIssueDelivery(projectId, issueId);

// Expected output:
{
  success: true,
  prediction: {
    p50Date: "2025-03-15T00:00:00.000Z",
    p70Date: "2025-03-22T00:00:00.000Z",
    p90Date: "2025-03-30T00:00:00.000Z",
    confidence: "HIGH",
    historicalVelocity: 22.5,
    currentTeamCapacity: 200
  }
}
```

### Test 2: Analyze Dependency Impact

```typescript
const result = await analyzeDelayImpact(projectId, issueId, 3);

// Expected output:
{
  success: true,
  impact: {
    rootDelay: 3,
    totalImpact: 8, // 3 days cascaded to 8 days total
    affectedIssues: [
      { issueId: "...", delayDays: 3 },
      { issueId: "...", delayDays: 2.4 },
    ],
    riskScore: 65,
    recommendations: [
      "⚠️ This task is on the critical path",
      "💡 Consider parallelizing independent tasks"
    ]
  }
}
```

### Test 3: Run What-If Scenario

```typescript
const result = await runWhatIfAnalysis(
  projectId,
  sprintId,
  'SPRINT',
  'Add 2 Developers',
  'What if we add 2 developers?',
  [{ type: 'ADD_DEVELOPERS', value: 2, description: 'Add 2 devs' }]
);

// Expected output:
{
  success: true,
  comparison: {
    currentP70: "2025-04-15T00:00:00.000Z",
    scenarioP70: "2025-03-28T00:00:00.000Z",
    daysSaved: 18,
    confidenceChange: 10,
    costImpact: 60000, // $60K for 2 devs for 3 months
    isFeasible: true,
    feasibilityNotes: ["✅ Scenario appears feasible"]
  }
}
```

### Test 4: Create Commitment

```typescript
const result = await createDeliveryCommitment(
  projectId,
  issueId,
  'FEATURE',
  'Authentication System',
  new Date('2025-03-30'),
  'Acme Corp',
  250000, // $250K revenue
  50000   // $50K penalty
);

// Expected output:
{
  success: true,
  commitment: {
    id: "...",
    status: "PENDING",
    initialConfidence: 0.75,
    riskLevel: "LOW"
  }
}
```

## Step 5: Understanding the Output

### Confidence Levels
- **VERY_HIGH (>85%)**: Green badge, extremely reliable
- **HIGH (70-85%)**: Blue badge, reliable for planning
- **MEDIUM (50-70%)**: Yellow badge, some uncertainty
- **LOW (<50%)**: Red badge, high risk

### Percentile Dates
- **P50 (Median)**: 50% chance of delivery by this date
- **P70**: 70% chance - good for internal planning
- **P90**: 90% chance - **use this for customer commitments**

### Risk Scores (0-100)
- **0-30**: Low risk (green)
- **31-60**: Medium risk (yellow)
- **61-100**: High risk (red)

## Common Use Cases

### For Sales: "Can we commit to March 30?"
1. Go to Predictions tab
2. Find your feature
3. Check P90 date (90% confidence)
4. If P90 is before March 30 → Safe to commit
5. Create commitment to track it

### For PM: "What if we add 2 developers?"
1. Go to Scenarios tab
2. Click "Add Developers"
3. Enter "2"
4. View impact: days saved, cost, feasibility
5. Save scenario if planning to execute

### For Engineering: "How much does this delay hurt?"
1. Go to Dependencies tab
2. Find your task
3. Click "Analyze Impact"
4. Enter delay days
5. See cascade effect and recommendations

## Troubleshooting

### "Not enough historical data"
Need at least 4 weeks of velocity snapshots. Run the seed script above.

### "Prediction looks wrong"
Check:
- Are issue estimates realistic?
- Is team capacity updated?
- Are dependencies accurate?

### "Monte Carlo takes too long"
Default 10,000 runs. For faster results during testing:
```typescript
// In monte-carlo.ts, reduce runs
const result = await runMonteCarloSimulation(input, 1000); // 1K instead of 10K
```

### "Migration requires database reset"
This is normal for adding enum types. Your data will be cleared in dev. In production, you'd write a custom migration.

## Next Steps

1. ✅ Run migration
2. ✅ Seed velocity data
3. ✅ Test predictions
4. ✅ Test what-if scenarios
5. ✅ Create commitments
6. 🚀 Integrate with your workflow

## Advanced: Automatic Velocity Tracking

To avoid manual velocity snapshots, set up a weekly cron:

```typescript
// app/api/cron/velocity/route.ts
export async function GET() {
  const projects = await prisma.project.findMany();
  
  for (const project of projects) {
    const lastWeek = await getLastWeekStats(project.id);
    
    await prisma.velocitySnapshot.create({
      data: {
        projectId: project.id,
        weekStart: lastWeek.start,
        weekEnd: lastWeek.end,
        storyPoints: lastWeek.pointsCompleted,
        tasksCompleted: lastWeek.tasksCompleted,
        teamSize: lastWeek.teamSize,
        avgUtilization: lastWeek.avgUtilization,
        avgBurnout: lastWeek.avgBurnout,
      }
    });
  }
  
  return Response.json({ success: true });
}
```

Deploy to Vercel Cron or use Inngest for weekly velocity tracking.

## Support

Questions? Check:
- [README.md](./README.md) - Full documentation
- [monte-carlo.ts](./monte-carlo.ts) - Algorithm details
- [delivery-engine-actions.ts](../../_actions/delivery-engine-actions.ts) - API reference

Built with ❤️ for confident delivery commitments.
