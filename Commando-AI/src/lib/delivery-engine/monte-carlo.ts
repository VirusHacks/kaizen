/**
 * Monte Carlo Simulation Engine for Delivery Predictions
 * 
 * Uses historical velocity data and team capacity to predict delivery dates
 * with statistical confidence intervals (P50, P70, P85, P90).
 * 
 * The simulation:
 * 1. Samples from historical velocity distribution
 * 2. Accounts for team capacity and burnout risk
 * 3. Simulates N iterations (default 10,000)
 * 4. Returns percentile outcomes
 */

import { db } from '@/lib/db';

interface VelocityDistribution {
  mean: number;
  stdDev: number;
  samples: number[];
  min: number;
  max: number;
}

interface TeamCapacity {
  totalHoursPerWeek: number;
  utilizationRate: number; // 0-1
  burnoutRisk: number; // 0-1, higher = more risky
  teamSize: number;
}

export interface MonteCarloInput {
  projectId: string;
  targetId: string; // Issue ID, Sprint ID, etc.
  targetType: 'ISSUE' | 'SPRINT' | 'MILESTONE' | 'FEATURE_GROUP';
  remainingComplexity: number; // Story points or hours
  dependencyCount?: number;
  externalDependencies?: number;
  startDate?: Date;
}

export interface MonteCarloResult {
  p50Date: Date; // Median (50% confidence)
  p70Date: Date;
  p85Date: Date;
  p90Date: Date;
  bestCase: Date;
  worstCase: Date;
  mostLikely: Date;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  historicalVelocity: number;
  currentTeamCapacity: number;
  simulationRuns: number;
  assumptions: Record<string, any>;
}

/**
 * Load historical velocity data from completed sprints
 */
async function loadHistoricalVelocity(projectId: string): Promise<VelocityDistribution> {
  const snapshots = await db.velocitySnapshot.findMany({
    where: { projectId },
    orderBy: { weekStart: 'desc' },
    take: 12, // Last 12 weeks/sprints
  });

  if (snapshots.length === 0) {
    // Fallback: use default velocity assumptions
    return {
      mean: 20, // 20 story points per sprint
      stdDev: 5,
      samples: [20],
      min: 15,
      max: 25,
    };
  }

  const velocities = snapshots.map((s) => s.storyPoints);
  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    stdDev,
    samples: velocities,
    min: Math.min(...velocities),
    max: Math.max(...velocities),
  };
}

/**
 * Calculate current team capacity
 */
async function calculateTeamCapacity(projectId: string): Promise<TeamCapacity> {
  const allocations = await db.resourceAllocation.findMany({
    where: { projectId },
  });

  if (allocations.length === 0) {
    return {
      totalHoursPerWeek: 40, // Default
      utilizationRate: 0.75,
      burnoutRisk: 0.2,
      teamSize: 1,
    };
  }

  const totalHours = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  const avgUtilization = allocations.length > 0 
    ? allocations.reduce((sum, a) => sum + (a.totalCapacityHours > 0 ? a.allocatedHours / a.totalCapacityHours : 0.75), 0) / allocations.length
    : 0.75;
  const avgBurnout = allocations.reduce((sum, a) => sum + (a.burnoutRiskScore / 100), 0) / allocations.length;

  return {
    totalHoursPerWeek: totalHours,
    utilizationRate: avgUtilization,
    burnoutRisk: avgBurnout,
    teamSize: allocations.length,
  };
}

/**
 * Sample from velocity distribution using normal distribution
 */
function sampleVelocity(distribution: VelocityDistribution): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  const sample = distribution.mean + z0 * distribution.stdDev;
  
  // Clamp to reasonable bounds (velocity can't be negative or wildly high)
  return Math.max(distribution.min * 0.5, Math.min(distribution.max * 1.5, sample));
}

/**
 * Adjust velocity for team capacity and burnout risk
 */
function adjustForCapacity(velocity: number, capacity: TeamCapacity): number {
  // High burnout reduces velocity
  const burnoutMultiplier = 1 - (capacity.burnoutRisk * 0.3); // Up to 30% reduction
  
  // Low utilization reduces velocity
  const utilizationMultiplier = capacity.utilizationRate;
  
  return velocity * burnoutMultiplier * utilizationMultiplier;
}

/**
 * Adjust for dependencies (each dependency adds uncertainty)
 */
function adjustForDependencies(weeksToComplete: number, dependencyCount: number): number {
  // Each dependency adds 5-15% delay (randomly sampled)
  const delayPerDependency = 0.05 + Math.random() * 0.1;
  const totalDelay = 1 + (dependencyCount * delayPerDependency);
  
  return weeksToComplete * totalDelay;
}

/**
 * Run Monte Carlo simulation
 */
export async function runMonteCarloSimulation(
  input: MonteCarloInput,
  runs: number = 10000
): Promise<MonteCarloResult> {
  const { projectId, remainingComplexity, dependencyCount = 0, externalDependencies = 0, startDate = new Date() } = input;

  // Load historical data
  const velocityDist = await loadHistoricalVelocity(projectId);
  const teamCapacity = await calculateTeamCapacity(projectId);

  // Run simulations
  const completionWeeks: number[] = [];
  
  for (let i = 0; i < runs; i++) {
    // Sample velocity
    let velocity = sampleVelocity(velocityDist);
    
    // Adjust for capacity and burnout
    velocity = adjustForCapacity(velocity, teamCapacity);
    
    // Calculate weeks to complete
    let weeks = remainingComplexity / Math.max(velocity, 1); // Prevent division by zero
    
    // Adjust for dependencies
    if (dependencyCount > 0) {
      weeks = adjustForDependencies(weeks, dependencyCount);
    }
    
    // Add external dependency delays (random)
    if (externalDependencies > 0) {
      weeks += externalDependencies * (1 + Math.random()); // 1-2 weeks per external dep
    }
    
    completionWeeks.push(weeks);
  }

  // Sort results
  completionWeeks.sort((a, b) => a - b);

  // Calculate percentiles
  const p50Weeks = completionWeeks[Math.floor(runs * 0.5)];
  const p70Weeks = completionWeeks[Math.floor(runs * 0.7)];
  const p85Weeks = completionWeeks[Math.floor(runs * 0.85)];
  const p90Weeks = completionWeeks[Math.floor(runs * 0.9)];
  const bestCaseWeeks = completionWeeks[Math.floor(runs * 0.1)]; // 10th percentile
  const worstCaseWeeks = completionWeeks[Math.floor(runs * 0.95)]; // 95th percentile
  
  // Calculate mode (most likely)
  const histogram = new Map<number, number>();
  completionWeeks.forEach(w => {
    const bucket = Math.round(w * 2) / 2; // Round to 0.5 weeks
    histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
  });
  const mostLikelyWeeks = Array.from(histogram.entries()).sort((a, b) => b[1] - a[1])[0][0];

  // Convert weeks to dates
  const addWeeks = (date: Date, weeks: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result;
  };

  const p50Date = addWeeks(startDate, p50Weeks);
  const p70Date = addWeeks(startDate, p70Weeks);
  const p85Date = addWeeks(startDate, p85Weeks);
  const p90Date = addWeeks(startDate, p90Weeks);
  const bestCase = addWeeks(startDate, bestCaseWeeks);
  const worstCase = addWeeks(startDate, worstCaseWeeks);
  const mostLikely = addWeeks(startDate, mostLikelyWeeks);

  // Calculate confidence level
  const spread = p90Weeks - p50Weeks;
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  
  if (spread > 8) {
    confidence = 'LOW'; // Very uncertain
  } else if (spread > 4) {
    confidence = 'MEDIUM';
  } else if (spread > 2) {
    confidence = 'HIGH';
  } else {
    confidence = 'VERY_HIGH';
  }

  return {
    p50Date,
    p70Date,
    p85Date,
    p90Date,
    bestCase,
    worstCase,
    mostLikely,
    confidence,
    historicalVelocity: velocityDist.mean,
    currentTeamCapacity: teamCapacity.totalHoursPerWeek,
    simulationRuns: runs,
    assumptions: {
      velocityMean: velocityDist.mean,
      velocityStdDev: velocityDist.stdDev,
      teamSize: teamCapacity.teamSize,
      utilizationRate: teamCapacity.utilizationRate,
      burnoutRisk: teamCapacity.burnoutRisk,
      dependencyCount,
      externalDependencies,
      remainingComplexity,
    },
  };
}

/**
 * Save prediction to database
 */
export async function savePrediction(
  input: MonteCarloInput,
  result: MonteCarloResult
): Promise<string> {
  const prediction = await db.deliveryPrediction.create({
    data: {
      projectId: input.projectId,
      targetId: input.targetId,
      targetType: input.targetType,
      targetTitle: input.targetId, // Will be updated by caller with actual title
      
      p50Date: result.p50Date,
      p70Date: result.p70Date,
      p85Date: result.p85Date,
      p90Date: result.p90Date,
      
      confidence: result.confidence,
      
      historicalVelocity: result.historicalVelocity,
      currentTeamCapacity: result.currentTeamCapacity,
      remainingComplexity: input.remainingComplexity,
      
      dependencyCount: input.dependencyCount || 0,
      externalDependencies: input.externalDependencies || 0,
      
      simulationRuns: result.simulationRuns,
      simulationMethod: 'monte_carlo',
      assumptions: result.assumptions,
      
      bestCase: result.bestCase,
      worstCase: result.worstCase,
      mostLikely: result.mostLikely,
      
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
    },
  });

  return prediction.id;
}

/**
 * Get or generate prediction for a target
 */
export async function getPrediction(
  projectId: string,
  targetId: string,
  targetType: MonteCarloInput['targetType'],
  forceRefresh = false
): Promise<MonteCarloResult | null> {
  // Check for valid cached prediction
  if (!forceRefresh) {
    const cached = await db.deliveryPrediction.findFirst({
      where: {
        projectId,
        targetId,
        targetType,
        validUntil: { gte: new Date() },
      },
      orderBy: { calculatedAt: 'desc' },
    });

    if (cached) {
      return {
        p50Date: cached.p50Date,
        p70Date: cached.p70Date,
        p85Date: cached.p85Date,
        p90Date: cached.p90Date,
        bestCase: cached.bestCase,
        worstCase: cached.worstCase,
        mostLikely: cached.mostLikely,
        confidence: cached.confidence as any,
        historicalVelocity: cached.historicalVelocity,
        currentTeamCapacity: cached.currentTeamCapacity,
        simulationRuns: cached.simulationRuns,
        assumptions: cached.assumptions as Record<string, any>,
      };
    }
  }

  return null;
}
