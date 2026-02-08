/**
 * What-If Scenario Calculator
 * 
 * Enables "what-if" analysis for project planning:
 * - What if we add 2 more developers?
 * - What if we reduce scope by 20%?
 * - What if we remove certain blockers?
 * 
 * Runs Monte Carlo simulation with modified parameters and compares outcomes.
 */

import { PrismaClient } from '@prisma/client';
import { runMonteCarloSimulation } from './monte-carlo';

const prisma = new PrismaClient();

export interface ScenarioChange {
  type: 'ADD_DEVELOPERS' | 'REDUCE_SCOPE' | 'INCREASE_VELOCITY' | 'REMOVE_BLOCKERS' | 'EXTEND_HOURS' | 'REMOVE_DEPENDENCY';
  value: number | string; // Number for adds/reductions, string for specific items
  description: string;
}

export interface WhatIfScenario {
  name: string;
  description: string;
  changes: ScenarioChange[];
}

export interface ScenarioComparison {
  scenarioId?: string;
  scenarioName: string;
  
  // Current state (baseline)
  currentP50: Date;
  currentP70: Date;
  currentP90: Date;
  
  // Scenario outcome
  scenarioP50: Date;
  scenarioP70: Date;
  scenarioP90: Date;
  
  // Impact analysis
  daysSaved: number; // Positive = faster, negative = slower
  confidenceChange: number; // Change in confidence percentage
  costImpact?: number; // $ cost increase/decrease
  riskImpact: string[];
  
  // Feasibility
  isFeasible: boolean;
  feasibilityNotes: string[];
}

/**
 * Apply scenario changes to base parameters
 */
function applyScenarioChanges(
  baseComplexity: number,
  baseDependencies: number,
  baseTeamSize: number,
  changes: ScenarioChange[]
): {
  complexity: number;
  dependencies: number;
  teamSize: number;
  velocityMultiplier: number;
} {
  let complexity = baseComplexity;
  let dependencies = baseDependencies;
  let teamSize = baseTeamSize;
  let velocityMultiplier = 1.0;

  changes.forEach((change) => {
    switch (change.type) {
      case 'ADD_DEVELOPERS':
        // Adding developers increases team size but with diminishing returns
        const newDevs = Number(change.value);
        teamSize += newDevs;
        // Each new dev contributes 80% velocity initially (ramp-up time)
        velocityMultiplier += newDevs * 0.8;
        break;

      case 'REDUCE_SCOPE':
        // Reduce remaining complexity by percentage
        const reductionPercent = Number(change.value) / 100;
        complexity *= (1 - reductionPercent);
        break;

      case 'INCREASE_VELOCITY':
        // Direct velocity boost (e.g., better tools, processes)
        const velocityBoost = Number(change.value) / 100;
        velocityMultiplier *= (1 + velocityBoost);
        break;

      case 'REMOVE_BLOCKERS':
        // Removing blockers reduces dependencies
        const blockersRemoved = Number(change.value);
        dependencies = Math.max(0, dependencies - blockersRemoved);
        break;

      case 'EXTEND_HOURS':
        // Extending work hours (overtime) - but with burnout penalty
        const hoursIncrease = Number(change.value) / 100;
        velocityMultiplier *= (1 + hoursIncrease * 0.7); // Only 70% effective due to burnout
        break;

      case 'REMOVE_DEPENDENCY':
        // Remove a specific dependency
        dependencies = Math.max(0, dependencies - 1);
        break;
    }
  });

  return {
    complexity,
    dependencies,
    teamSize,
    velocityMultiplier,
  };
}

/**
 * Calculate cost impact of scenario changes
 */
function calculateCostImpact(
  changes: ScenarioChange[],
  avgDeveloperCost = 10000 // $ per developer per month
): number {
  let costDelta = 0;

  changes.forEach((change) => {
    switch (change.type) {
      case 'ADD_DEVELOPERS':
        // Assume they work for 3 months (average)
        costDelta += Number(change.value) * avgDeveloperCost * 3;
        break;

      case 'EXTEND_HOURS':
        // Overtime costs ~1.5x regular hours
        const overtimePercent = Number(change.value) / 100;
        costDelta += overtimePercent * avgDeveloperCost * 1.5 * 3;
        break;

      case 'REDUCE_SCOPE':
        // Reducing scope might save money (less QA, less deployment)
        const scopeReduction = Number(change.value) / 100;
        costDelta -= scopeReduction * avgDeveloperCost * 2;
        break;
    }
  });

  return Math.round(costDelta);
}

/**
 * Assess feasibility of scenario
 */
function assessFeasibility(
  changes: ScenarioChange[],
  currentTeamSize: number
): { isFeasible: boolean; notes: string[] } {
  const notes: string[] = [];
  let isFeasible = true;

  changes.forEach((change) => {
    switch (change.type) {
      case 'ADD_DEVELOPERS':
        const newDevs = Number(change.value);
        if (newDevs > currentTeamSize) {
          notes.push(
            `⚠️ Adding ${newDevs} developers doubles team size. Consider ramp-up time (2-4 weeks).`
          );
        }
        if (newDevs > 5) {
          notes.push('⚠️ Adding many developers may slow down initially (Brooks\' Law).');
          isFeasible = false;
        }
        break;

      case 'REDUCE_SCOPE':
        const reduction = Number(change.value);
        if (reduction > 30) {
          notes.push(
            `⚠️ ${reduction}% scope reduction is significant. Ensure stakeholder alignment.`
          );
        }
        break;

      case 'EXTEND_HOURS':
        const hoursIncrease = Number(change.value);
        if (hoursIncrease > 20) {
          notes.push(
            '⚠️ Extended hours >20% significantly increases burnout risk. Not sustainable.'
          );
          isFeasible = false;
        }
        break;
    }
  });

  if (notes.length === 0) {
    notes.push('✅ Scenario appears feasible with current constraints.');
  }

  return { isFeasible, notes };
}

/**
 * Run what-if scenario analysis
 */
export async function runWhatIfScenario(
  projectId: string,
  targetId: string,
  targetType: 'ISSUE' | 'SPRINT' | 'MILESTONE' | 'FEATURE_GROUP',
  baseComplexity: number,
  baseDependencies: number,
  scenario: WhatIfScenario
): Promise<ScenarioComparison> {
  // Get current team size
  const allocations = await prisma.resourceAllocation.findMany({
    where: { projectId },
  });
  const currentTeamSize = allocations.length || 5; // Default 5 if no allocations

  // Run baseline simulation (current state)
  const baseline = await runMonteCarloSimulation({
    projectId,
    targetId,
    targetType,
    remainingComplexity: baseComplexity,
    dependencyCount: baseDependencies,
  });

  // Apply scenario changes
  const { complexity, dependencies, teamSize, velocityMultiplier } = applyScenarioChanges(
    baseComplexity,
    baseDependencies,
    currentTeamSize,
    scenario.changes
  );

  // Run scenario simulation
  // Note: We'd need to modify runMonteCarloSimulation to accept velocity multiplier
  // For now, we adjust complexity inversely
  const adjustedComplexity = complexity / velocityMultiplier;

  const scenarioResult = await runMonteCarloSimulation({
    projectId,
    targetId,
    targetType,
    remainingComplexity: adjustedComplexity,
    dependencyCount: dependencies,
  });

  // Calculate differences
  const daysSaved = Math.round(
    (baseline.p70Date.getTime() - scenarioResult.p70Date.getTime()) / (1000 * 60 * 60 * 24)
  );

  const confidenceChange = calculateConfidenceChange(baseline.confidence, scenarioResult.confidence);

  // Cost impact
  const costImpact = calculateCostImpact(scenario.changes);

  // Risk impact
  const riskImpact = assessRiskImpact(scenario.changes);

  // Feasibility
  const feasibility = assessFeasibility(scenario.changes, currentTeamSize);

  return {
    scenarioName: scenario.name,
    
    currentP50: baseline.p50Date,
    currentP70: baseline.p70Date,
    currentP90: baseline.p90Date,
    
    scenarioP50: scenarioResult.p50Date,
    scenarioP70: scenarioResult.p70Date,
    scenarioP90: scenarioResult.p90Date,
    
    daysSaved,
    confidenceChange,
    costImpact,
    riskImpact,
    
    isFeasible: feasibility.isFeasible,
    feasibilityNotes: feasibility.notes,
  };
}

/**
 * Calculate confidence change
 */
function calculateConfidenceChange(
  baseConfidence: string,
  scenarioConfidence: string
): number {
  const confidenceMap = { LOW: 25, MEDIUM: 50, HIGH: 75, VERY_HIGH: 90 };
  const basePct = confidenceMap[baseConfidence as keyof typeof confidenceMap] || 50;
  const scenarioPct = confidenceMap[scenarioConfidence as keyof typeof confidenceMap] || 50;
  return scenarioPct - basePct;
}

/**
 * Assess risk impact of changes
 */
function assessRiskImpact(changes: ScenarioChange[]): string[] {
  const risks: string[] = [];

  changes.forEach((change) => {
    switch (change.type) {
      case 'ADD_DEVELOPERS':
        risks.push('Increased coordination overhead and onboarding time');
        break;
      case 'EXTEND_HOURS':
        risks.push('Burnout risk increases with extended hours');
        break;
      case 'REDUCE_SCOPE':
        risks.push('Stakeholder expectations may not align with reduced scope');
        break;
      case 'REMOVE_BLOCKERS':
        risks.push('May require external dependencies or additional resources');
        break;
    }
  });

  return risks;
}

/**
 * Save scenario to database
 */
export async function saveScenario(
  projectId: string,
  comparison: ScenarioComparison,
  scenario: WhatIfScenario,
  createdBy: string
): Promise<string> {
  const saved = await prisma.deliveryScenario.create({
    data: {
      projectId,
      name: scenario.name,
      description: scenario.description,
      changes: scenario.changes,
      
      originalP70Date: comparison.currentP70,
      scenarioP70Date: comparison.scenarioP70,
      daysSaved: comparison.daysSaved,
      
      confidenceChange: comparison.confidenceChange,
      costImpact: comparison.costImpact,
      riskImpact: comparison.riskImpact.join('; '),
      
      createdBy,
      isActive: false,
    },
  });

  return saved.id;
}

/**
 * Common scenario templates
 */
export const scenarioTemplates = {
  addDevelopers: (count: number): WhatIfScenario => ({
    name: `Add ${count} Developer${count > 1 ? 's' : ''}`,
    description: `What if we add ${count} developer${count > 1 ? 's' : ''} to the team?`,
    changes: [
      {
        type: 'ADD_DEVELOPERS',
        value: count,
        description: `Add ${count} additional developer${count > 1 ? 's' : ''}`,
      },
    ],
  }),

  reduceScope: (percent: number): WhatIfScenario => ({
    name: `Reduce Scope by ${percent}%`,
    description: `What if we reduce project scope by ${percent}%?`,
    changes: [
      {
        type: 'REDUCE_SCOPE',
        value: percent,
        description: `Reduce remaining work by ${percent}%`,
      },
    ],
  }),

  removeBlockers: (count: number): WhatIfScenario => ({
    name: `Remove ${count} Blocker${count > 1 ? 's' : ''}`,
    description: `What if we remove ${count} blocking dependencies?`,
    changes: [
      {
        type: 'REMOVE_BLOCKERS',
        value: count,
        description: `Remove ${count} blocking dependencies`,
      },
    ],
  }),

  extendHours: (percent: number): WhatIfScenario => ({
    name: `Extend Work Hours by ${percent}%`,
    description: `What if the team works ${percent}% more hours (overtime)?`,
    changes: [
      {
        type: 'EXTEND_HOURS',
        value: percent,
        description: `Increase weekly hours by ${percent}%`,
      },
    ],
  }),

  combined: (developers: number, scopeReduction: number): WhatIfScenario => ({
    name: `Add ${developers} Devs + Reduce Scope ${scopeReduction}%`,
    description: `Combined scenario: add developers and reduce scope`,
    changes: [
      {
        type: 'ADD_DEVELOPERS',
        value: developers,
        description: `Add ${developers} developers`,
      },
      {
        type: 'REDUCE_SCOPE',
        value: scopeReduction,
        description: `Reduce scope by ${scopeReduction}%`,
      },
    ],
  }),
};

/**
 * Get saved scenarios for a project
 */
export async function getScenarios(projectId: string) {
  return prisma.deliveryScenario.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Activate a scenario (mark it as being executed)
 */
export async function activateScenario(scenarioId: string) {
  // Deactivate all other scenarios first
  await prisma.deliveryScenario.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Activate this one
  return prisma.deliveryScenario.update({
    where: { id: scenarioId },
    data: { isActive: true },
  });
}
