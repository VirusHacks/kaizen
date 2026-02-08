# Predictive Delivery Engine

AI-powered delivery predictions with 90%+ confidence for sales commitments. Converts engineering activity into business insights.

## Overview

The Predictive Delivery Engine uses Monte Carlo simulation, dependency chain analysis, and what-if scenario planning to provide data-driven delivery predictions. This enables sales teams to commit confidently to delivery dates and helps PMs proactively manage risks.

## Features

### 1. Monte Carlo Simulation
Probabilistic delivery date predictions using historical velocity data.

**Example Output:**
- **P50 (50% confidence):** March 15, 2025
- **P70 (70% confidence):** March 22, 2025  
- **P90 (90% confidence):** March 30, 2025

**How it works:**
1. Loads historical velocity from completed sprints
2. Samples from velocity distribution (10,000 iterations)
3. Adjusts for team capacity, burnout risk, dependencies
4. Returns percentile outcomes (P50, P70, P85, P90)

### 2. Dependency Impact Analysis
Analyzes how delays cascade through dependent tasks.

**Example:**
- Task A slips 3 days → cascades to delay Feature X by 8 days
- Identifies critical paths and bottlenecks
- Calculates risk scores (0-100)

**How it works:**
1. Builds dependency graph from Issue.parentId relationships
2. Calculates critical path (longest path through graph)
3. Simulates delay propagation with decay model
4. Generates recommendations (e.g., "🚨 Add resources immediately")

### 3. What-If Scenarios
Simulate different strategies to optimize delivery dates.

**Example Scenarios:**
- "Add 2 developers" → Delivery moves from April 15 → March 28 (-18 days)
- "Reduce scope 20%" → Delivery moves from April 15 → April 1 (-14 days)  
- "Remove 3 blockers" → Delivery moves from April 15 → March 30 (-16 days)

**How it works:**
1. Run baseline Monte Carlo simulation
2. Apply scenario changes (team size, complexity, dependencies)
3. Re-run Monte Carlo with modified parameters
4. Compare outcomes and calculate ROI

### 4. Commitment Tracker
Track sales promises vs. actual delivery.

**Metrics:**
- Delivery rate: 87%
- Average delivery: +2 days early
- Revenue at risk: $150K
- At-risk commitments: 3

## Database Schema

### DeliveryPrediction
Stores Monte Carlo simulation results.

```prisma
model DeliveryPrediction {
  id        String   @id
  projectId String
  targetId  String // Issue/Sprint ID
  targetType String // "ISSUE" | "SPRINT" | "MILESTONE"
  
  // Prediction results
  p50Date   DateTime
  p70Date   DateTime
  p85Date   DateTime
  p90Date   DateTime
  
  confidence PredictionConfidence // LOW | MEDIUM | HIGH | VERY_HIGH
  
  // Velocity assumptions
  historicalVelocity  Float
  currentTeamCapacity Float
  remainingComplexity Float
  
  // Risk factors
  dependencyCount     Int
  criticalPathLength  Int
  teamBurnoutRisk     Float
  
  validUntil DateTime // Predictions refresh daily
}
```

### DeliveryCommitment
Tracks commitments made to stakeholders.

```prisma
model DeliveryCommitment {
  id              String   @id
  projectId       String
  targetId        String
  targetTitle     String
  
  // Commitment details
  committedDate   DateTime // Promised date
  committedTo     String   // Customer name
  committedBy     String   // Sales rep
  
  // Tracking
  status          CommitmentStatus // PENDING | ON_TRACK | AT_RISK | DELIVERED | MISSED
  actualDelivery  DateTime?
  daysEarly       Int? // Positive if early, negative if late
  
  // Confidence tracking
  initialConfidence Float // At commitment time
  currentConfidence Float? // Updated daily
  
  // Financial impact
  revenueImpact    Float? // $ tied to commitment
  penaltyClause    Float? // $ penalty if missed
}
```

### DeliveryScenario
Stores what-if scenario results.

```prisma
model DeliveryScenario {
  id        String   @id
  projectId String
  name      String
  
  // Scenario parameters
  changes   Json // [{ type: "ADD_DEVELOPERS", value: 2 }]
  
  // Impact results
  originalP70Date  DateTime
  scenarioP70Date  DateTime
  daysSaved        Int
  
  confidenceChange Float
  costImpact       Float?
  
  isActive Boolean // True if scenario is being executed
}
```

### VelocitySnapshot
Historical velocity tracking for Monte Carlo input.

```prisma
model VelocitySnapshot {
  id        String   @id
  projectId String
  sprintId  String?
  
  weekStart       DateTime
  weekEnd         DateTime
  storyPoints     Float // Points completed
  tasksCompleted  Int
  
  // Team metrics
  teamSize        Int
  avgUtilization  Float
  avgBurnout      Float
}
```

## Usage

### 1. Predict Issue Delivery
```typescript
import { predictIssueDelivery } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/delivery-engine-actions';

const result = await predictIssueDelivery(projectId, issueId);

if (result.success) {
  console.log('P70 date:', result.prediction.p70Date);
  console.log('P90 date:', result.prediction.p90Date);
  console.log('Confidence:', result.prediction.confidence);
}
```

### 2. Analyze Dependency Impact
```typescript
import { analyzeDelayImpact } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/delivery-engine-actions';

const result = await analyzeDelayImpact(projectId, issueId, 3); // 3 days delay

if (result.success) {
  console.log('Total impact:', result.impact.totalImpact, 'days');
  console.log('Affected issues:', result.impact.affectedIssues.length);
  console.log('Risk score:', result.impact.riskScore);
  console.log('Recommendations:', result.impact.recommendations);
}
```

### 3. Run What-If Scenario
```typescript
import { runWhatIfAnalysis } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/delivery-engine-actions';

const result = await runWhatIfAnalysis(
  projectId,
  sprintId,
  'SPRINT',
  'Add 2 Developers',
  'What if we add 2 developers to the sprint?',
  [
    { type: 'ADD_DEVELOPERS', value: 2, description: 'Add 2 developers' }
  ]
);

if (result.success) {
  console.log('Days saved:', result.comparison.daysSaved);
  console.log('Cost impact:', result.comparison.costImpact);
  console.log('Is feasible:', result.comparison.isFeasible);
}
```

### 4. Create Commitment
```typescript
import { createDeliveryCommitment } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/delivery-engine-actions';

const result = await createDeliveryCommitment(
  projectId,
  issueId,
  'FEATURE',
  'Authentication System',
  new Date('2025-03-30'), // Committed date
  'Acme Corp', // Customer
  250000, // $250K revenue
  50000   // $50K penalty clause
);

if (result.success) {
  console.log('Commitment created:', result.commitment.id);
  console.log('Initial confidence:', result.commitment.initialConfidence);
}
```

## UI Components

### Delivery Engine Dashboard
Main UI at `/projects/[projectId]/project-manager/delivery-engine`

**Features:**
- **Predictions Tab:** View all delivery predictions with confidence intervals
- **Scenarios Tab:** Run what-if scenarios and compare outcomes
- **Commitments Tab:** Track all sales commitments and health metrics
- **Dependencies Tab:** Visualize dependency chains and critical paths

**Key Metrics:**
- Delivery rate
- Commitments at risk
- Average delivery time
- Revenue at risk

## Configuration

### Migration
The Predictive Delivery Engine requires new database tables. Run the migration:

```bash
npx prisma migrate dev --name add_predictive_delivery_models
```

**Note:** This will reset your development database. Make sure to backup any important data first.

### Velocity Snapshots
For accurate predictions, populate historical velocity data:

```typescript
// Create velocity snapshots weekly
await prisma.velocitySnapshot.create({
  data: {
    projectId,
    sprintId,
    weekStart: new Date('2025-01-06'),
    weekEnd: new Date('2025-01-12'),
    storyPoints: 24, // Points completed this week
    tasksCompleted: 12,
    teamSize: 5,
    avgUtilization: 0.75,
    avgBurnout: 0.2,
  }
});
```

## Algorithms

### Monte Carlo Simulation
1. **Load historical velocity:** Last 12 sprints/weeks
2. **Calculate distribution:** Mean, std deviation
3. **Sample velocity:** Box-Muller transform for normal distribution
4. **Adjust for capacity:** `velocity * (1 - burnout * 0.3) * utilization`
5. **Adjust for dependencies:** Each dependency adds 5-15% delay
6. **Repeat 10,000 times:** Build outcome distribution
7. **Calculate percentiles:** Sort and extract P50, P70, P85, P90

### Dependency Propagation
1. **Build graph:** Issue.parentId relationships
2. **BFS traversal:** Find all descendants of root task
3. **Delay decay:** 100% to children, decays 20% per level
   - Level 1: 100% of delay propagates
   - Level 2: 80% of delay propagates
   - Level 3: 64% of delay propagates
4. **Critical path:** Longest path through graph (DFS with memoization)

### What-If Scenarios
1. **Apply changes:**
   - `ADD_DEVELOPERS`: Each dev adds 80% velocity (ramp-up)
   - `REDUCE_SCOPE`: Direct reduction in complexity
   - `REMOVE_BLOCKERS`: Reduces dependency count
   - `EXTEND_HOURS`: 70% effective (burnout penalty)
2. **Re-run Monte Carlo:** With modified parameters
3. **Compare outcomes:** Calculate days saved, cost impact
4. **Assess feasibility:** Check for Brooks' Law, burnout risk

## Best Practices

### For Sales Teams
- ✅ Always use **P90 date** for customer commitments (90% confidence)
- ✅ Review **risk score** before committing to tight deadlines
- ✅ Run **what-if scenarios** before promising faster delivery
- ⚠️ P50/P70 dates are too optimistic for external commitments

### For PMs
- ✅ Use **P70 date** for internal planning
- ✅ Monitor **dependency chains** weekly
- ✅ Create **commitments** for all customer promises
- ✅ Run **what-if scenarios** when considering team changes
- ⚠️ Predictions refresh daily; check for staleness

### For Engineering
- ✅ Update **velocity snapshots** weekly
- ✅ Keep **issue dependencies** up-to-date
- ✅ Set realistic **estimated hours** on tasks
- ⚠️ Garbage in, garbage out - quality data is critical

## Limitations

1. **Cold Start Problem:** Requires 4+ weeks of historical velocity data for accurate predictions
2. **Team Changes:** Adding developers has initial productivity dip (Brooks' Law)
3. **External Dependencies:** Hard to model accurately (assumed 1-2 weeks each)
4. **Scope Creep:** Predictions assume fixed scope
5. **Context Switching:** Not modeled in current version

## Roadmap

- [ ] Integration with GitHub for automatic velocity tracking
- [ ] Slack alerts for at-risk commitments
- [ ] Roadmap visualization with confidence bands
- [ ] Team capacity forecasting
- [ ] Risk heatmaps
- [ ] Automated early warning system (2 weeks before miss)

## Support

For questions or issues, contact the development team or open an issue in the repository.
