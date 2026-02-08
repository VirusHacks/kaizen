/**
 * Server Actions for Predictive Delivery Engine
 * 
 * Exposes delivery prediction, what-if analysis, and commitment tracking
 * to the Next.js frontend via server actions.
 */

'use server';

import { PrismaClient } from '@prisma/client';
import { runMonteCarloSimulation, getPrediction, savePrediction } from '@/lib/delivery-engine/monte-carlo';
import { analyzeDependencyImpact, findCriticalPaths, saveDependencyChain } from '@/lib/delivery-engine/dependency-analyzer';
import { runWhatIfScenario, saveScenario, scenarioTemplates, getScenarios, activateScenario } from '@/lib/delivery-engine/what-if';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

// ==========================================
// DELIVERY PREDICTIONS
// ==========================================

/**
 * Get or generate delivery prediction for an issue
 */
export async function predictIssueDelivery(
  projectId: string,
  issueId: string,
  forceRefresh = false
) {
  try {
    // Check for cached prediction first
    if (!forceRefresh) {
      const cached = await getPrediction(projectId, issueId, 'ISSUE');
      if (cached) {
        return { success: true, prediction: cached };
      }
    }

    // Get issue details
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        children: true, // Dependencies
      },
    });

    if (!issue) {
      return { success: false, error: 'Issue not found' };
    }

    // Calculate remaining complexity (default 8 hours = 1 day per task)
    const remainingComplexity = 8;
    const dependencyCount = issue.children?.length || 0;

    // Run Monte Carlo simulation
    const result = await runMonteCarloSimulation({
      projectId,
      targetId: issueId,
      targetType: 'ISSUE',
      remainingComplexity,
      dependencyCount,
      startDate: new Date(),
    });

    // Save prediction
    await savePrediction(
      {
        projectId,
        targetId: issueId,
        targetType: 'ISSUE',
        remainingComplexity,
        dependencyCount,
      },
      result
    );

    // Update prediction with actual title
    await prisma.deliveryPrediction.updateMany({
      where: { targetId: issueId, projectId },
      data: { targetTitle: issue.title },
    });

    return { success: true, prediction: result };
  } catch (error) {
    console.error('[predictIssueDelivery] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get or generate delivery prediction for a sprint
 */
export async function predictSprintDelivery(
  projectId: string,
  sprintId: string,
  forceRefresh = false
) {
  try {
    // Check for cached prediction
    if (!forceRefresh) {
      const cached = await getPrediction(projectId, sprintId, 'SPRINT');
      if (cached) {
        return { success: true, prediction: cached };
      }
    }

    // Get sprint details
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        issues: true,
      },
    });

    if (!sprint) {
      return { success: false, error: 'Sprint not found' };
    }

    // Calculate remaining complexity
    const remainingIssues = sprint.issues.filter(
      (i) => i.status !== 'DONE'
    );
    const remainingComplexity = remainingIssues.reduce(
      (sum, issue) => sum + 8, // Default 8 hours per task
      0
    );

    // Count dependencies
    const dependencyCount = remainingIssues.filter((i) => i.parentId !== null).length;

    // Run simulation
    const result = await runMonteCarloSimulation({
      projectId,
      targetId: sprintId,
      targetType: 'SPRINT',
      remainingComplexity,
      dependencyCount,
      startDate: sprint.startDate || new Date(),
    });

    // Save prediction
    await savePrediction(
      {
        projectId,
        targetId: sprintId,
        targetType: 'SPRINT',
        remainingComplexity,
        dependencyCount,
      },
      result
    );

    // Update with title
    await prisma.deliveryPrediction.updateMany({
      where: { targetId: sprintId, projectId },
      data: { targetTitle: sprint.name },
    });

    return { success: true, prediction: result };
  } catch (error) {
    console.error('[predictSprintDelivery] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ==========================================
// DEPENDENCY IMPACT ANALYSIS
// ==========================================

/**
 * Analyze the impact of a delay in an issue
 */
export async function analyzeDelayImpact(
  projectId: string,
  issueId: string,
  delayDays: number
) {
  try {
    const impact = await analyzeDependencyImpact(projectId, issueId, delayDays);
    
    // Save to database
    await saveDependencyChain(projectId, impact);

    return { success: true, impact };
  } catch (error) {
    console.error('[analyzeDelayImpact] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all critical paths in a project
 */
export async function getProjectCriticalPaths(projectId: string) {
  try {
    const paths = await findCriticalPaths(projectId);
    return { success: true, paths };
  } catch (error) {
    console.error('[getProjectCriticalPaths] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all dependency chains for a project
 */
export async function getProjectDependencyChains(projectId: string) {
  try {
    const chains = await prisma.dependencyChain.findMany({
      where: { projectId },
      orderBy: { riskScore: 'desc' },
      take: 20, // Top 20 riskiest chains
    });

    return { success: true, chains };
  } catch (error) {
    console.error('[getProjectDependencyChains] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ==========================================
// WHAT-IF SCENARIOS
// ==========================================

/**
 * Run a what-if scenario
 */
export async function runWhatIfAnalysis(
  projectId: string,
  targetId: string,
  targetType: 'ISSUE' | 'SPRINT' | 'MILESTONE' | 'FEATURE_GROUP',
  scenarioName: string,
  scenarioDescription: string,
  changes: any[]
) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get target complexity
    let baseComplexity = 0;
    let baseDependencies = 0;

    if (targetType === 'ISSUE') {
      const issue = await prisma.issue.findUnique({
        where: { id: targetId },
        include: { children: true },
      });
      baseComplexity = 8; // Default 8 hours per task
      baseDependencies = issue?.children?.length || 0;
    } else if (targetType === 'SPRINT') {
      const sprint = await prisma.sprint.findUnique({
        where: { id: targetId },
        include: { issues: true },
      });
      const remaining = sprint?.issues.filter((i) => i.status !== 'DONE') || [];
      baseComplexity = remaining.reduce((sum, i) => sum + 8, 0); // Default 8 hours per task
      baseDependencies = remaining.filter((i) => i.parentId).length;
    }

    // Run scenario
    const comparison = await runWhatIfScenario(
      projectId,
      targetId,
      targetType,
      baseComplexity,
      baseDependencies,
      {
        name: scenarioName,
        description: scenarioDescription,
        changes,
      }
    );

    // Save scenario
    const scenarioId = await saveScenario(
      projectId,
      comparison,
      {
        name: scenarioName,
        description: scenarioDescription,
        changes,
      },
      user.id
    );

    return { success: true, comparison, scenarioId };
  } catch (error) {
    console.error('[runWhatIfAnalysis] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get pre-built scenario templates
 */
export async function getScenarioTemplates() {
  return {
    success: true,
    templates: {
      addDevelopers: (count: number) => scenarioTemplates.addDevelopers(count),
      reduceScope: (percent: number) => scenarioTemplates.reduceScope(percent),
      removeBlockers: (count: number) => scenarioTemplates.removeBlockers(count),
      extendHours: (percent: number) => scenarioTemplates.extendHours(percent),
      combined: (devs: number, scope: number) => scenarioTemplates.combined(devs, scope),
    },
  };
}

/**
 * Get saved scenarios for a project
 */
export async function getProjectScenarios(projectId: string) {
  try {
    const scenarios = await getScenarios(projectId);
    return { success: true, scenarios };
  } catch (error) {
    console.error('[getProjectScenarios] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Activate a scenario
 */
export async function activateProjectScenario(scenarioId: string) {
  try {
    await activateScenario(scenarioId);
    return { success: true };
  } catch (error) {
    console.error('[activateProjectScenario] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ==========================================
// COMMITMENT TRACKING
// ==========================================

/**
 * Create a delivery commitment
 */
export async function createDeliveryCommitment(
  projectId: string,
  targetId: string,
  targetType: string,
  targetTitle: string,
  committedDate: Date,
  committedTo: string,
  revenueImpact?: number,
  penaltyClause?: number
) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get prediction for initial confidence
    let initialConfidence = 0.5;
    const prediction = await getPrediction(projectId, targetId, targetType as any);
    if (prediction) {
      const confidenceMap = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, VERY_HIGH: 0.9 };
      initialConfidence = confidenceMap[prediction.confidence] || 0.5;
    }

    // Create commitment
    const commitment = await prisma.deliveryCommitment.create({
      data: {
        projectId,
        commitmentType: targetType,
        targetId,
        targetTitle,
        committedDate,
        committedTo,
        committedBy: user.id,
        initialConfidence,
        currentConfidence: initialConfidence,
        revenueImpact,
        penaltyClause,
        status: 'PENDING',
        riskLevel: initialConfidence > 0.7 ? 'LOW' : initialConfidence > 0.5 ? 'MEDIUM' : 'HIGH',
      },
    });

    return { success: true, commitment };
  } catch (error) {
    console.error('[createDeliveryCommitment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all commitments for a project
 */
export async function getProjectCommitments(projectId: string) {
  try {
    const commitments = await prisma.deliveryCommitment.findMany({
      where: { projectId },
      orderBy: { committedDate: 'asc' },
    });

    return { success: true, commitments };
  } catch (error) {
    console.error('[getProjectCommitments] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update commitment status
 */
export async function updateCommitmentStatus(
  commitmentId: string,
  status: 'PENDING' | 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'DELIVERED' | 'MISSED',
  actualDelivery?: Date
) {
  try {
    const commitment = await prisma.deliveryCommitment.findUnique({
      where: { id: commitmentId },
    });

    if (!commitment) {
      return { success: false, error: 'Commitment not found' };
    }

    let daysEarly: number | undefined;
    if (actualDelivery) {
      const diffMs = actualDelivery.getTime() - commitment.committedDate.getTime();
      daysEarly = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    await prisma.deliveryCommitment.update({
      where: { id: commitmentId },
      data: {
        status,
        actualDelivery,
        daysEarly,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[updateCommitmentStatus] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get commitment health dashboard data
 */
export async function getCommitmentHealthDashboard(projectId: string) {
  try {
    const commitments = await prisma.deliveryCommitment.findMany({
      where: { projectId },
    });

    const total = commitments.length;
    const delivered = commitments.filter((c) => c.status === 'DELIVERED').length;
    const missed = commitments.filter((c) => c.status === 'MISSED').length;
    const atRisk = commitments.filter((c) => c.status === 'AT_RISK' || c.status === 'DELAYED').length;
    const pending = commitments.filter((c) => c.status === 'PENDING' || c.status === 'ON_TRACK').length;

    const totalRevenue = commitments.reduce((sum, c) => sum + (c.revenueImpact || 0), 0);
    const atRiskRevenue = commitments
      .filter((c) => c.status === 'AT_RISK' || c.status === 'DELAYED')
      .reduce((sum, c) => sum + (c.revenueImpact || 0), 0);

    const avgDaysEarly = commitments
      .filter((c) => c.daysEarly !== null)
      .reduce((sum, c) => sum + (c.daysEarly || 0), 0) / delivered || 0;

    return {
      success: true,
      dashboard: {
        total,
        delivered,
        missed,
        atRisk,
        pending,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        missRate: total > 0 ? (missed / total) * 100 : 0,
        totalRevenue,
        atRiskRevenue,
        avgDaysEarly: Math.round(avgDaysEarly),
      },
    };
  } catch (error) {
    console.error('[getCommitmentHealthDashboard] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all predictions for a project
 */
export async function getProjectPredictions(projectId: string) {
  try {
    const predictions = await prisma.deliveryPrediction.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, predictions };
  } catch (error) {
    console.error('[getProjectPredictions] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate predictions for all active issues in a project
 */
export async function generateAllPredictions(projectId: string) {
  try {
    // Get all active issues
    const issues = await prisma.issue.findMany({
      where: {
        projectId,
        status: { notIn: ['DONE'] },
      },
    });

    if (issues.length === 0) {
      return { success: false, error: 'No active issues found in project' };
    }

    const predictions = [];

    // Generate predictions for each issue
    for (const issue of issues) {
      const remainingComplexity = 8; // Default 1 day per task
      // Count dependencies (issues that have this issue as parent)
      const childrenCount = await prisma.issue.count({
        where: { parentId: issue.id },
      });
      const dependencyCount = childrenCount;

      const result = await runMonteCarloSimulation({
        projectId,
        targetId: issue.id,
        targetType: 'ISSUE',
        remainingComplexity,
        dependencyCount,
        startDate: new Date(),
      });

      // Save prediction
      await savePrediction(
        {
          projectId,
          targetId: issue.id,
          targetType: 'ISSUE',
          remainingComplexity,
          dependencyCount,
        },
        result
      );

      // Update with title
      await prisma.deliveryPrediction.updateMany({
        where: { targetId: issue.id, projectId },
        data: { targetTitle: issue.title },
      });

      predictions.push({
        issueId: issue.id,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        ...result,
      });
    }

    // Also generate sprint prediction if there's an active sprint
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
      include: { issues: true },
    });

    if (activeSprint) {
      const sprintResult = await predictSprintDelivery(projectId, activeSprint.id, true);
      if (sprintResult.success) {
        predictions.push({
          sprintId: activeSprint.id,
          title: activeSprint.name,
          type: 'SPRINT',
          ...sprintResult.prediction,
        });
      }
    }

    return { success: true, predictions, count: predictions.length };
  } catch (error) {
    console.error('[generateAllPredictions] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
