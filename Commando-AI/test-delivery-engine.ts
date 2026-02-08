/**
 * Comprehensive test script for Predictive Delivery Engine
 *
 * This script:
 * 1. Seeds velocity data for Monte Carlo simulations
 * 2. Creates sample issues with dependencies
 * 3. Tests delivery predictions
 * 4. Tests dependency impact analysis
 * 5. Tests what-if scenarios
 */

import { PrismaClient } from '@prisma/client';
import {
  runMonteCarloSimulation,
  savePrediction,
} from './src/lib/delivery-engine/monte-carlo';
import { analyzeDependencyImpact } from './src/lib/delivery-engine/dependency-analyzer';
import { runWhatIfScenario } from './src/lib/delivery-engine/what-if';

const prisma = new PrismaClient();

async function seedVelocityData(projectId: string) {
  console.log('\n📊 Seeding velocity data...');

  const velocityData = [
    { points: 22, tasks: 11, utilization: 0.75, burnout: 0.2 },
    { points: 24, tasks: 12, utilization: 0.8, burnout: 0.3 },
    { points: 18, tasks: 9, utilization: 0.7, burnout: 0.15 },
    { points: 26, tasks: 13, utilization: 0.85, burnout: 0.35 },
    { points: 20, tasks: 10, utilization: 0.75, burnout: 0.25 },
    { points: 23, tasks: 11, utilization: 0.78, burnout: 0.22 },
    { points: 25, tasks: 12, utilization: 0.82, burnout: 0.28 },
    { points: 21, tasks: 10, utilization: 0.74, burnout: 0.2 },
  ];

  for (let i = 0; i < velocityData.length; i++) {
    const weekData = velocityData[i];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (8 - i) * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    await prisma.velocitySnapshot.create({
      data: {
        projectId,
        weekStart,
        weekEnd,
        storyPoints: weekData.points,
        tasksCompleted: weekData.tasks,
        teamSize: 5,
        avgUtilization: weekData.utilization,
        avgBurnout: weekData.burnout,
      },
    });
    console.log(`  ✅ Week ${i + 1}: ${weekData.points} story points`);
  }

  const avgVelocity =
    velocityData.reduce((sum, d) => sum + d.points, 0) / velocityData.length;
  console.log(
    `\n📈 Average velocity: ${avgVelocity.toFixed(1)} story points/week`,
  );
}

async function createSampleIssues(projectId: string) {
  console.log('\n📝 Creating sample issues with dependencies...');

  // Get first user to use as reporter
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('❌ No user found. Please create a user first.');
    throw new Error('No user found');
  }

  // Get first sprint
  let sprint = await prisma.sprint.findFirst({ where: { projectId } });

  if (!sprint) {
    sprint = await prisma.sprint.create({
      data: {
        projectId,
        name: 'Test Sprint',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      },
    });
  }

  // Create parent issue (blocker)
  const parentIssue = await prisma.issue.create({
    data: {
      projectId,
      number: 100,
      title: 'Authentication API',
      description: 'Core authentication service',
      type: 'TASK',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      sprintId: sprint.id,
      reporterId: user.clerkId,
    },
  });

  console.log(`  ✅ Created parent issue: ${parentIssue.title}`);

  // Create dependent issues
  const dependentIssues = [
    { title: 'User Profile Management' },
    { title: 'Role-Based Access Control' },
    { title: 'OAuth Integration' },
  ];

  for (const dep of dependentIssues) {
    const issue = await prisma.issue.create({
      data: {
        projectId,
        number: Math.floor(Math.random() * 1000) + 100,
        title: dep.title,
        description: `Depends on ${parentIssue.title}`,
        type: 'TASK',
        status: 'TODO',
        priority: 'MEDIUM',
        parentId: parentIssue.id,
        sprintId: sprint.id,
        reporterId: user.clerkId,
      },
    });
    console.log(`  ✅ Created dependent issue: ${issue.title}`);
  }

  return { parentIssue, sprint };
}

async function testDeliveryPrediction(
  projectId: string,
  issueId: string,
  issueTitle: string,
) {
  console.log(`\n🎯 Testing delivery prediction for: ${issueTitle}`);

  const result = await runMonteCarloSimulation({
    projectId,
    targetId: issueId,
    targetType: 'ISSUE',
    remainingComplexity: 40, // 40 story points
    dependencyCount: 3,
    startDate: new Date(),
  });

  console.log('\n📊 Monte Carlo Results:');
  console.log(`  P50 (50% confidence): ${result.p50Date.toDateString()}`);
  console.log(`  P70 (70% confidence): ${result.p70Date.toDateString()}`);
  console.log(`  P85 (85% confidence): ${result.p85Date.toDateString()}`);
  console.log(`  P90 (90% confidence): ${result.p90Date.toDateString()}`);
  console.log(`  Confidence Level: ${result.confidence}`);
  console.log(
    `  Historical Velocity: ${result.historicalVelocity.toFixed(1)} points/week`,
  );

  // Save prediction
  await savePrediction(
    {
      projectId,
      targetId: issueId,
      targetType: 'ISSUE',
      remainingComplexity: 40,
      dependencyCount: 3,
    },
    result,
  );

  // Update title
  await prisma.deliveryPrediction.updateMany({
    where: { targetId: issueId },
    data: { targetTitle: issueTitle },
  });

  console.log('  ✅ Prediction saved to database');

  return result;
}

async function testDependencyImpact(
  projectId: string,
  issueId: string,
  issueTitle: string,
) {
  console.log(`\n🔗 Testing dependency impact for: ${issueTitle}`);

  const impact = await analyzeDependencyImpact(projectId, issueId, 5); // 5 days delay

  console.log('\n⚠️ Dependency Impact Results:');
  console.log(`  Root Delay: ${impact.rootDelay} days`);
  console.log(`  Total Cascade Impact: ${impact.totalImpact} days`);
  console.log(`  Affected Issues: ${impact.affectedIssues.length}`);
  console.log(`  Critical Path: ${impact.criticalPath ? 'YES' : 'NO'}`);
  console.log(`  Risk Score: ${impact.riskScore}/100`);

  console.log('\n📋 Affected Issues:');
  impact.affectedIssues.forEach((issue) => {
    console.log(
      `    - ${issue.issueTitle}: +${issue.delayDays.toFixed(1)} days delay`,
    );
  });

  console.log('\n💡 Recommendations:');
  impact.recommendations.forEach((rec) => {
    console.log(`    ${rec}`);
  });

  // Save to database
  await prisma.dependencyChain.create({
    data: {
      projectId,
      rootIssueId: impact.rootIssueId,
      rootIssueTitle: impact.rootIssueTitle,
      chainLength: impact.affectedIssues.length,
      totalDaysAtRisk: impact.totalImpact,
      blockedIssues: impact.affectedIssues as any,
      criticalPath: impact.criticalPath as any,
      riskScore: impact.riskScore,
      impactRadius: impact.affectedIssues.length,
    },
  });

  console.log('  ✅ Dependency chain saved to database');

  return impact;
}

async function testWhatIfScenario(
  projectId: string,
  issueId: string,
  issueTitle: string,
) {
  console.log(`\n💡 Testing what-if scenario for: ${issueTitle}`);

  const comparison = await runWhatIfScenario(
    projectId,
    issueId,
    'ISSUE',
    40, // base complexity
    3, // base dependencies
    {
      name: 'Add 2 Developers',
      description: 'What if we add 2 developers to speed up delivery?',
      changes: [
        { type: 'ADD_DEVELOPERS', value: 2, description: 'Add 2 developers' },
      ],
    },
  );

  console.log('\n🔮 What-If Scenario Results:');
  console.log(`  Current P70 Date: ${comparison.currentP70.toDateString()}`);
  console.log(`  Scenario P70 Date: ${comparison.scenarioP70.toDateString()}`);
  console.log(`  Days Saved: ${comparison.daysSaved} days`);
  console.log(
    `  Confidence Change: ${comparison.confidenceChange > 0 ? '+' : ''}${comparison.confidenceChange}%`,
  );
  console.log(`  Cost Impact: $${comparison.costImpact?.toLocaleString()}`);
  console.log(`  Feasible: ${comparison.isFeasible ? 'YES' : 'NO'}`);

  console.log('\n📝 Feasibility Notes:');
  comparison.feasibilityNotes.forEach((note) => {
    console.log(`    ${note}`);
  });

  console.log('\n⚠️ Risk Impact:');
  comparison.riskImpact.forEach((risk) => {
    console.log(`    - ${risk}`);
  });

  console.log('  ✅ Scenario analysis complete');

  return comparison;
}

async function main() {
  console.log('🚀 Starting Predictive Delivery Engine Test\n');
  console.log('='.repeat(60));

  // Get first project
  const project = await prisma.project.findFirst();

  if (!project) {
    console.log('❌ No project found. Please create a project first.');
    process.exit(1);
  }

  console.log(`\n📁 Project: ${project.name}`);
  console.log(`   ID: ${project.id}`);

  try {
    // Step 1: Seed velocity data
    await seedVelocityData(project.id);

    // Step 2: Create sample issues
    const { parentIssue, sprint } = await createSampleIssues(project.id);

    // Step 3: Test delivery prediction
    await testDeliveryPrediction(project.id, parentIssue.id, parentIssue.title);

    // Step 4: Test dependency impact
    await testDependencyImpact(project.id, parentIssue.id, parentIssue.title);

    // Step 5: Test what-if scenario
    await testWhatIfScenario(project.id, parentIssue.id, parentIssue.title);

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ All tests completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log(
      `   1. Visit: /projects/${project.id}/project-manager/dashboard`,
    );
    console.log('   2. Click "Open Delivery Engine" button');
    console.log('   3. Explore predictions, scenarios, and dependencies');
    console.log('\n🤖 Agent Collaboration:');
    console.log(
      `   1. Visit: /projects/${project.id}/project-manager/agent-collaboration`,
    );
    console.log('   2. Click "Trigger Planning Cycle"');
    console.log('   3. View agent decisions and recommendations\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
