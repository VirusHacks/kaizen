/**
 * Dependency Impact Analyzer
 * 
 * Analyzes how delays in one task cascade through dependent tasks.
 * Identifies critical paths and calculates total project impact.
 * 
 * Features:
 * - Dependency graph traversal
 * - Critical path identification
 * - Delay cascade calculation
 * - Bottleneck detection
 */

import { db } from '@/lib/db';

interface DependencyNode {
  issueId: string;
  issueTitle: string;
  status: string;
  estimatedHours: number;
  assigneeId: string | null;
  children: DependencyNode[]; // Tasks that depend on this one
}

interface DependencyImpact {
  rootIssueId: string;
  rootIssueTitle: string;
  rootDelay: number; // Days of delay in root task
  totalImpact: number; // Total days of delay cascaded
  affectedIssues: AffectedIssue[];
  criticalPath: string[]; // Array of issue IDs on critical path
  riskScore: number; // 0-100
  recommendations: string[];
}

interface AffectedIssue {
  issueId: string;
  issueTitle: string;
  delayDays: number;
  newEstimatedDate: Date;
  confidence: number; // 0-1
}

/**
 * Build dependency graph for a project
 */
async function buildDependencyGraph(projectId: string): Promise<Map<string, DependencyNode>> {
  const issues = await db.issue.findMany({
    where: { projectId },
    include: {
      assignee: true,
    },
  });

  const nodeMap = new Map<string, DependencyNode>();

  // Create nodes
  issues.forEach((issue) => {
    nodeMap.set(issue.id, {
      issueId: issue.id,
      issueTitle: issue.title,
      status: issue.status,
      estimatedHours: 8, // Default 1 day (Issue model doesn't have estimatedHours)
      assigneeId: issue.assigneeId,
      children: [],
    });
  });

  // Build edges (parent -> children relationships)
  issues.forEach((issue) => {
    if (issue.parentId) {
      const parent = nodeMap.get(issue.parentId);
      const child = nodeMap.get(issue.id);
      if (parent && child) {
        parent.children.push(child);
      }
    }
  });

  return nodeMap;
}

/**
 * Find all descendants of a node (BFS traversal)
 */
function findDescendants(node: DependencyNode, graph: Map<string, DependencyNode>): DependencyNode[] {
  const descendants: DependencyNode[] = [];
  const visited = new Set<string>();
  const queue: DependencyNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.issueId)) continue;
    visited.add(current.issueId);
    
    if (current.issueId !== node.issueId) {
      descendants.push(current);
    }

    current.children.forEach((child) => {
      if (!visited.has(child.issueId)) {
        queue.push(child);
      }
    });
  }

  return descendants;
}

/**
 * Calculate critical path (longest path through dependency graph)
 */
function calculateCriticalPath(
  node: DependencyNode,
  memo: Map<string, { length: number; path: string[] }> = new Map()
): { length: number; path: string[] } {
  if (memo.has(node.issueId)) {
    return memo.get(node.issueId)!;
  }

  if (node.children.length === 0) {
    const result = {
      length: node.estimatedHours / 8, // Convert to days
      path: [node.issueId],
    };
    memo.set(node.issueId, result);
    return result;
  }

  // Find longest path among children
  let maxPath = { length: 0, path: [] as string[] };
  
  node.children.forEach((child) => {
    const childPath = calculateCriticalPath(child, memo);
    if (childPath.length > maxPath.length) {
      maxPath = childPath;
    }
  });

  const result = {
    length: node.estimatedHours / 8 + maxPath.length,
    path: [node.issueId, ...maxPath.path],
  };
  
  memo.set(node.issueId, result);
  return result;
}

/**
 * Simulate delay propagation
 */
function calculateDelayPropagation(
  rootNode: DependencyNode,
  delayDays: number,
  graph: Map<string, DependencyNode>
): AffectedIssue[] {
  const affected: AffectedIssue[] = [];
  const descendants = findDescendants(rootNode, graph);

  // Simple model: delay propagates 100% to immediate children,
  // then decays by 20% for each level deeper
  const visited = new Set<string>([rootNode.issueId]);
  const queue: { node: DependencyNode; inheritedDelay: number; depth: number }[] = 
    rootNode.children.map(child => ({ node: child, inheritedDelay: delayDays, depth: 1 }));

  while (queue.length > 0) {
    const { node, inheritedDelay, depth } = queue.shift()!;
    
    if (visited.has(node.issueId)) continue;
    visited.add(node.issueId);

    // Delay decays by 20% per level (parallel work can absorb some delay)
    const actualDelay = inheritedDelay * Math.pow(0.8, depth - 1);
    
    // Calculate new estimated date (simplified)
    const taskDurationDays = node.estimatedHours / 8;
    const newEstimatedDate = new Date();
    newEstimatedDate.setDate(newEstimatedDate.getDate() + taskDurationDays + actualDelay);

    affected.push({
      issueId: node.issueId,
      issueTitle: node.issueTitle,
      delayDays: actualDelay,
      newEstimatedDate,
      confidence: Math.max(0.4, 1 - depth * 0.15), // Confidence decreases with depth
    });

    // Add children to queue with increased depth
    node.children.forEach((child) => {
      queue.push({ node: child, inheritedDelay: actualDelay, depth: depth + 1 });
    });
  }

  return affected;
}

/**
 * Calculate risk score based on impact
 */
function calculateRiskScore(
  rootDelay: number,
  totalImpact: number,
  affectedCount: number,
  criticalPathLength: number
): number {
  // Factors:
  // 1. Root delay size (0-30 points)
  // 2. Total cascaded impact (0-30 points)
  // 3. Number of affected issues (0-20 points)
  // 4. Critical path involvement (0-20 points)
  
  const delayScore = Math.min(30, (rootDelay / 10) * 30);
  const impactScore = Math.min(30, (totalImpact / 50) * 30);
  const breadthScore = Math.min(20, (affectedCount / 20) * 20);
  const criticalityScore = criticalPathLength > 0 ? 20 : 0;

  return Math.round(delayScore + impactScore + breadthScore + criticalityScore);
}

/**
 * Generate recommendations based on impact analysis
 */
function generateRecommendations(impact: DependencyImpact): string[] {
  const recommendations: string[] = [];

  if (impact.riskScore > 70) {
    recommendations.push('🚨 CRITICAL: This delay has severe project-wide impact. Consider escalating immediately.');
  }

  if (impact.affectedIssues.length > 10) {
    recommendations.push(`📊 This delay affects ${impact.affectedIssues.length} tasks. Consider re-planning the sprint.`);
  }

  if (impact.criticalPath.length > 0) {
    recommendations.push('⚠️ This task is on the critical path. Any delay directly impacts delivery date.');
  }

  if (impact.totalImpact > impact.rootDelay * 3) {
    recommendations.push('🔗 Strong cascade effect detected. Focus on unblocking this task first.');
  }

  if (impact.affectedIssues.some(a => a.confidence < 0.6)) {
    recommendations.push('📉 High uncertainty in downstream impact. Monitor affected tasks closely.');
  }

  // Mitigation strategies
  if (impact.affectedIssues.length > 5) {
    recommendations.push('💡 Consider parallelizing independent tasks to reduce total delay.');
  }

  if (impact.riskScore > 50) {
    recommendations.push('👥 Consider adding resources to this task to minimize delay.');
  }

  return recommendations;
}

/**
 * Analyze the impact of a delay in a specific issue
 */
export async function analyzeDependencyImpact(
  projectId: string,
  issueId: string,
  delayDays: number
): Promise<DependencyImpact> {
  // Build dependency graph
  const graph = await buildDependencyGraph(projectId);
  const rootNode = graph.get(issueId);

  if (!rootNode) {
    throw new Error(`Issue ${issueId} not found in project ${projectId}`);
  }

  // Calculate critical path
  const criticalPath = calculateCriticalPath(rootNode);

  // Calculate delay propagation
  const affectedIssues = calculateDelayPropagation(rootNode, delayDays, graph);

  // Calculate total impact
  const totalImpact = affectedIssues.reduce((sum, issue) => sum + issue.delayDays, 0) + delayDays;

  // Calculate risk score
  const riskScore = calculateRiskScore(
    delayDays,
    totalImpact,
    affectedIssues.length,
    criticalPath.length
  );

  const impact: DependencyImpact = {
    rootIssueId: issueId,
    rootIssueTitle: rootNode.issueTitle,
    rootDelay: delayDays,
    totalImpact,
    affectedIssues,
    criticalPath: criticalPath.path,
    riskScore,
    recommendations: [],
  };

  // Generate recommendations
  impact.recommendations = generateRecommendations(impact);

  return impact;
}

/**
 * Find all critical paths in a project
 */
export async function findCriticalPaths(projectId: string): Promise<DependencyNode[][]> {
  const graph = await buildDependencyGraph(projectId);
  const criticalPaths: DependencyNode[][] = [];

  // Find root nodes (nodes with no parents)
  const rootNodes = Array.from(graph.values()).filter(
    (node) => !Array.from(graph.values()).some((n) => n.children.some((c) => c.issueId === node.issueId))
  );

  // Calculate critical path from each root
  rootNodes.forEach((root) => {
    const path = calculateCriticalPath(root);
    const nodes = path.path.map((id) => graph.get(id)!).filter(Boolean);
    if (nodes.length > 0) {
      criticalPaths.push(nodes);
    }
  });

  // Sort by length (longest first)
  criticalPaths.sort((a, b) => b.length - a.length);

  return criticalPaths;
}

/**
 * Save dependency chain analysis to database
 */
export async function saveDependencyChain(
  projectId: string,
  impact: DependencyImpact
): Promise<string> {
  const chain = await db.dependencyChain.create({
    data: {
      projectId,
      rootIssueId: impact.rootIssueId,
      rootIssueTitle: impact.rootIssueTitle,
      chainLength: impact.affectedIssues.length + 1,
      totalDaysAtRisk: Math.round(impact.totalImpact),
      blockedIssues: impact.affectedIssues.map((issue) => ({
        issueId: issue.issueId,
        title: issue.issueTitle,
        estimatedDelay: issue.delayDays,
      })),
      criticalPath: impact.criticalPath.length > 0,
      riskScore: impact.riskScore,
      impactRadius: impact.affectedIssues.length,
    },
  });

  return chain.id;
}

/**
 * Get all dependency chains for a project
 */
export async function getDependencyChains(projectId: string) {
  return db.dependencyChain.findMany({
    where: { projectId },
    orderBy: { riskScore: 'desc' },
  });
}
