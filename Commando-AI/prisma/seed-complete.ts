/**
 * Complete Seed Script for Predictive Delivery Engine & Agent Collaboration
 * 
 * This script creates:
 * - Users (if needed)
 * - Projects with realistic details
 * - Sprints (completed, active, planned)
 * - Issues with dependencies
 * - Velocity snapshots (8 weeks of history)
 * - Resource allocations
 * - Agent profiles
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('\n👥 Seeding users...');
  
  const users = [
    {
      clerkId: 'user_seed_001',
      email: 'sarah.johnson@company.com',
      name: 'Sarah Johnson',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    {
      clerkId: 'user_seed_002',
      email: 'michael.chen@company.com',
      name: 'Michael Chen',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
    {
      clerkId: 'user_seed_003',
      email: 'priya.patel@company.com',
      name: 'Priya Patel',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    },
    {
      clerkId: 'user_seed_004',
      email: 'james.wilson@company.com',
      name: 'James Wilson',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    },
    {
      clerkId: 'user_seed_005',
      email: 'emily.rodriguez@company.com',
      name: 'Emily Rodriguez',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    },
  ];

  for (const userData of users) {
    const existing = await prisma.user.findUnique({
      where: { clerkId: userData.clerkId },
    });

    if (!existing) {
      await prisma.user.create({ data: userData });
      console.log(`  ✅ Created user: ${userData.name}`);
    } else {
      console.log(`  ⏭️  User exists: ${userData.name}`);
    }
  }

  return users.map(u => u.clerkId);
}

async function seedProjects(ownerIds: string[]) {
  console.log('\n📁 Seeding projects...');

  const projects = [
    {
      name: 'E-Commerce Platform Redesign',
      key: 'ECP',
      description: 'Complete overhaul of the customer-facing e-commerce platform with modern UI/UX, improved performance, and new features including AI-powered recommendations and real-time inventory management.',
      ownerId: ownerIds[0],
    },
    {
      name: 'Mobile Banking App',
      key: 'MBA',
      description: 'Secure mobile banking application with biometric authentication, instant transfers, bill payments, investment tracking, and personal finance management features.',
      ownerId: ownerIds[1],
    },
    {
      name: 'Enterprise CRM System',
      key: 'CRM',
      description: 'Comprehensive customer relationship management system with sales pipeline tracking, automated workflows, analytics dashboards, and third-party integrations.',
      ownerId: ownerIds[2],
    },
  ];

  const createdProjects = [];
  for (const projectData of projects) {
    const existing = await prisma.project.findUnique({
      where: { key: projectData.key },
    });

    if (!existing) {
      const project = await prisma.project.create({
        data: projectData,
      });
      console.log(`  ✅ Created project: ${project.name} (${project.key})`);
      createdProjects.push(project);
    } else {
      console.log(`  ⏭️  Project exists: ${existing.name} (${existing.key})`);
      createdProjects.push(existing);
    }
  }

  return createdProjects;
}

async function seedSprints(projectId: string, projectKey: string) {
  console.log(`\n🏃 Seeding sprints for ${projectKey}...`);

  // Check if sprints already exist for this project
  const existingSprints = await prisma.sprint.findMany({
    where: { projectId },
  });

  if (existingSprints.length > 0) {
    console.log(`  ⏭️  Project already has ${existingSprints.length} sprints, skipping...`);
    return existingSprints;
  }

  const now = new Date();
  
  const sprints = [
    {
      name: 'Sprint 1 - Foundation',
      goal: 'Set up project infrastructure and core authentication',
      status: 'COMPLETED' as const,
      startDate: new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000), // 6 weeks ago
      endDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000), // 4 weeks ago
      projectId,
    },
    {
      name: 'Sprint 2 - Core Features',
      goal: 'Implement primary user workflows and data models',
      status: 'COMPLETED' as const,
      startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      projectId,
    },
    {
      name: 'Sprint 3 - Integration & Testing',
      goal: 'Third-party integrations and comprehensive testing',
      status: 'ACTIVE' as const,
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      projectId,
    },
    {
      name: 'Sprint 4 - Polish & Launch Prep',
      goal: 'UI polish, performance optimization, and launch preparation',
      status: 'PLANNED' as const,
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      projectId,
    },
  ];

  const createdSprints = [];
  for (const sprintData of sprints) {
    const sprint = await prisma.sprint.create({ data: sprintData });
    console.log(`  ✅ Created sprint: ${sprint.name} (${sprint.status})`);
    createdSprints.push(sprint);
  }

  return createdSprints;
}

async function seedIssues(
  projectId: string,
  projectKey: string,
  sprints: any[],
  userIds: string[]
) {
  console.log(`\n📝 Seeding issues for ${projectKey}...`);

  // Check if issues already exist for this project
  const existingIssues = await prisma.issue.findMany({
    where: { projectId },
  });

  if (existingIssues.length > 0) {
    console.log(`  ⏭️  Project already has ${existingIssues.length} issues, skipping...`);
    return;
  }

  const activeSprint = sprints.find(s => s.status === 'ACTIVE');
  const completedSprints = sprints.filter(s => s.status === 'COMPLETED');
  const plannedSprint = sprints.find(s => s.status === 'PLANNED');

  // Create epic/parent issues
  const authEpic = await prisma.issue.create({
    data: {
      projectId,
      number: 1,
      title: 'User Authentication System',
      description: 'Complete authentication and authorization system with OAuth, 2FA, and session management',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      reporterId: userIds[0],
      assigneeId: userIds[1],
      sprintId: activeSprint?.id,
      startDate: activeSprint?.startDate,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ✅ Created epic: ${authEpic.title}`);

  // Create child issues for authentication
  const authTasks = [
    {
      title: 'Implement OAuth 2.0 integration',
      description: 'Support Google, Facebook, and GitHub OAuth providers',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      assigneeId: userIds[1],
      sprintId: completedSprints[0]?.id,
    },
    {
      title: 'Build JWT token management',
      description: 'Access tokens, refresh tokens, and secure storage',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      assigneeId: userIds[2],
      sprintId: completedSprints[0]?.id,
    },
    {
      title: 'Add two-factor authentication',
      description: 'SMS and authenticator app 2FA support',
      status: 'IN_PROGRESS' as const,
      priority: 'MEDIUM' as const,
      assigneeId: userIds[1],
      sprintId: activeSprint?.id,
    },
    {
      title: 'Implement session management',
      description: 'Active session tracking and device management',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      assigneeId: userIds[3],
      sprintId: activeSprint?.id,
    },
  ];

  let issueNumber = 2;
  for (const taskData of authTasks) {
    await prisma.issue.create({
      data: {
        projectId,
        number: issueNumber++,
        title: taskData.title,
        description: taskData.description,
        type: 'TASK',
        status: taskData.status,
        priority: taskData.priority,
        reporterId: userIds[0],
        assigneeId: taskData.assigneeId,
        parentId: authEpic.id,
        sprintId: taskData.sprintId,
      },
    });
  }

  // Create payment processing epic
  const paymentEpic = await prisma.issue.create({
    data: {
      projectId,
      number: issueNumber++,
      title: 'Payment Processing Integration',
      description: 'Stripe and PayPal integration with subscription management',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      reporterId: userIds[0],
      assigneeId: userIds[2],
      sprintId: activeSprint?.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ✅ Created epic: ${paymentEpic.title}`);

  const paymentTasks = [
    {
      title: 'Stripe API integration',
      description: 'Payment intents, webhooks, and error handling',
      status: 'IN_PROGRESS' as const,
      priority: 'CRITICAL' as const,
      assigneeId: userIds[2],
    },
    {
      title: 'Subscription billing logic',
      description: 'Recurring charges, prorated upgrades, cancellations',
      status: 'TODO' as const,
      priority: 'HIGH' as const,
      assigneeId: userIds[3],
    },
    {
      title: 'PayPal fallback integration',
      description: 'Secondary payment provider for global coverage',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      assigneeId: userIds[4],
    },
  ];

  for (const taskData of paymentTasks) {
    await prisma.issue.create({
      data: {
        projectId,
        number: issueNumber++,
        title: taskData.title,
        description: taskData.description,
        type: 'TASK',
        status: taskData.status,
        priority: taskData.priority,
        reporterId: userIds[0],
        assigneeId: taskData.assigneeId,
        parentId: paymentEpic.id,
        sprintId: activeSprint?.id,
      },
    });
  }

  // Create backlog items
  const backlogIssues = [
    {
      title: 'Analytics Dashboard',
      description: 'Real-time analytics with charts and KPI tracking',
      type: 'STORY' as const,
      priority: 'MEDIUM' as const,
      assigneeId: null,
    },
    {
      title: 'Email Notification System',
      description: 'Transactional emails and notification preferences',
      type: 'STORY' as const,
      priority: 'LOW' as const,
      assigneeId: null,
    },
    {
      title: 'Mobile Responsive Design',
      description: 'Optimize UI for mobile and tablet devices',
      type: 'TASK' as const,
      priority: 'HIGH' as const,
      assigneeId: userIds[4],
    },
    {
      title: 'Performance Optimization',
      description: 'Database query optimization and caching strategy',
      type: 'TASK' as const,
      priority: 'MEDIUM' as const,
      assigneeId: null,
    },
  ];

  for (const issueData of backlogIssues) {
    await prisma.issue.create({
      data: {
        projectId,
        number: issueNumber++,
        title: issueData.title,
        description: issueData.description,
        type: issueData.type,
        status: 'TODO',
        priority: issueData.priority,
        reporterId: userIds[0],
        assigneeId: issueData.assigneeId,
        sprintId: null, // Backlog
      },
    });
  }

  // Create some bugs
  const bugs = [
    {
      title: 'Login form validation not working on Safari',
      description: 'Form submission fails silently on Safari browser',
      priority: 'HIGH' as const,
      status: 'TODO' as const,
    },
    {
      title: 'Memory leak in dashboard component',
      description: 'Dashboard component causes memory usage to grow over time',
      priority: 'CRITICAL' as const,
      status: 'IN_PROGRESS' as const,
      assigneeId: userIds[1],
    },
  ];

  for (const bugData of bugs) {
    await prisma.issue.create({
      data: {
        projectId,
        number: issueNumber++,
        title: bugData.title,
        description: bugData.description,
        type: 'BUG',
        status: bugData.status,
        priority: bugData.priority,
        reporterId: userIds[0],
        assigneeId: bugData.assigneeId || null,
        sprintId: activeSprint?.id,
      },
    });
  }

  console.log(`  ✅ Created ${issueNumber - 1} issues total`);
}

async function seedVelocityData(projectId: string, projectKey: string) {
  console.log(`\n📊 Seeding velocity data for ${projectKey}...`);

  // Check if velocity data already exists for this project
  const existingVelocity = await prisma.velocitySnapshot.findMany({
    where: { projectId },
  });

  if (existingVelocity.length > 0) {
    console.log(`  ⏭️  Project already has ${existingVelocity.length} velocity snapshots, skipping...`);
    return;
  }

  // Realistic velocity data with some variance
  const velocityData = [
    { points: 22, tasks: 11, utilization: 0.75, burnout: 0.20 },
    { points: 24, tasks: 12, utilization: 0.80, burnout: 0.30 },
    { points: 18, tasks: 9, utilization: 0.70, burnout: 0.15 },
    { points: 26, tasks: 13, utilization: 0.85, burnout: 0.35 },
    { points: 20, tasks: 10, utilization: 0.75, burnout: 0.25 },
    { points: 23, tasks: 11, utilization: 0.78, burnout: 0.22 },
    { points: 25, tasks: 12, utilization: 0.82, burnout: 0.28 },
    { points: 21, tasks: 10, utilization: 0.74, burnout: 0.20 },
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
  }

  const avgVelocity = velocityData.reduce((sum, d) => sum + d.points, 0) / velocityData.length;
  console.log(`  ✅ Created 8 weeks of velocity data (avg: ${avgVelocity.toFixed(1)} points/week)`);
}

async function seedResourceAllocations(projectId: string, projectKey: string, userIds: string[]) {
  console.log(`\n👷 Seeding resource allocations for ${projectKey}...`);

  // Check if resource allocations already exist for this project
  const existingAllocations = await prisma.resourceAllocation.findMany({
    where: { projectId },
  });

  if (existingAllocations.length > 0) {
    console.log(`  ⏭️  Project already has ${existingAllocations.length} resource allocations, skipping...`);
    return;
  }

  const allocations = [
    {
      userId: userIds[0],
      totalCapacityHours: 40,
      allocatedHours: 34,
      availableHours: 6,
      hourlyRate: 75,
      velocityScore: 1.2,
      burnoutRiskScore: 35,
      averageWeeklyHours: 42,
      consecutiveOvertimeWeeks: 2,
      skillTags: ['frontend', 'react', 'typescript'],
    },
    {
      userId: userIds[1],
      totalCapacityHours: 40,
      allocatedHours: 36,
      availableHours: 4,
      hourlyRate: 85,
      velocityScore: 1.4,
      burnoutRiskScore: 45,
      averageWeeklyHours: 44,
      consecutiveOvertimeWeeks: 3,
      skillTags: ['backend', 'nodejs', 'postgresql'],
    },
    {
      userId: userIds[2],
      totalCapacityHours: 32,
      allocatedHours: 24,
      availableHours: 8,
      hourlyRate: 70,
      velocityScore: 1.0,
      burnoutRiskScore: 20,
      averageWeeklyHours: 32,
      consecutiveOvertimeWeeks: 0,
      skillTags: ['fullstack', 'python', 'react'],
    },
    {
      userId: userIds[3],
      totalCapacityHours: 40,
      allocatedHours: 32,
      availableHours: 8,
      hourlyRate: 65,
      velocityScore: 1.1,
      burnoutRiskScore: 28,
      averageWeeklyHours: 38,
      consecutiveOvertimeWeeks: 1,
      skillTags: ['devops', 'docker', 'aws'],
    },
    {
      userId: userIds[4],
      totalCapacityHours: 24,
      allocatedHours: 18,
      availableHours: 6,
      hourlyRate: 60,
      velocityScore: 0.9,
      burnoutRiskScore: 15,
      averageWeeklyHours: 24,
      consecutiveOvertimeWeeks: 0,
      skillTags: ['design', 'ui-ux', 'figma'],
    },
  ];

  for (const allocationData of allocations) {
    await prisma.resourceAllocation.create({
      data: {
        projectId,
        userId: allocationData.userId,
        sprintId: null, // Project-level allocation
        totalCapacityHours: allocationData.totalCapacityHours,
        allocatedHours: allocationData.allocatedHours,
        availableHours: allocationData.availableHours,
        hourlyRate: allocationData.hourlyRate,
        costThisSprint: allocationData.allocatedHours * allocationData.hourlyRate,
        velocityScore: allocationData.velocityScore,
        skillTags: allocationData.skillTags,
        burnoutRiskScore: allocationData.burnoutRiskScore,
        averageWeeklyHours: allocationData.averageWeeklyHours,
        consecutiveOvertimeWeeks: allocationData.consecutiveOvertimeWeeks,
      },
    });
  }

  console.log(`  ✅ Created ${allocations.length} resource allocations`);
}

async function seedAgentProfiles(projectId: string, projectKey: string, userIds: string[]) {
  console.log(`\n🤖 Seeding agent profiles for ${projectKey}...`);

  // Check if agent profiles already exist for this project
  const existingAgents = await prisma.agentProfile.findMany({
    where: { projectId },
  });

  if (existingAgents.length > 0) {
    console.log(`  ⏭️  Project already has ${existingAgents.length} agent profiles, skipping...`);
    return;
  }

  const agents = [
    {
      userId: userIds[0],
      agentType: 'DEVELOPER' as const,
      trustScore: 0.85,
      preferences: {
        communicationStyle: 'analytical',
        expertise: ['frontend', 'ui-ux'],
      },
    },
    {
      userId: userIds[1],
      agentType: 'MANAGER' as const,
      trustScore: 0.90,
      preferences: {
        communicationStyle: 'collaborative',
        expertise: ['team-coordination', 'planning'],
      },
    },
    {
      userId: userIds[2],
      agentType: 'DEVELOPER' as const,
      trustScore: 0.80,
      preferences: {
        communicationStyle: 'pragmatic',
        expertise: ['backend', 'api-design'],
      },
    },
    {
      userId: userIds[3],
      agentType: 'DEVELOPER' as const,
      trustScore: 0.75,
      preferences: {
        communicationStyle: 'detail-oriented',
        expertise: ['devops', 'infrastructure'],
      },
    },
    {
      userId: userIds[4],
      agentType: 'QA' as const,
      trustScore: 0.88,
      preferences: {
        communicationStyle: 'thorough',
        expertise: ['testing', 'quality-assurance'],
      },
    },
  ];

  for (const agentData of agents) {
    await prisma.agentProfile.create({
      data: {
        projectId,
        userId: agentData.userId,
        agentType: agentData.agentType,
        status: 'ACTIVE',
        trustScore: agentData.trustScore,
        preferences: agentData.preferences,
        currentState: {
          activeGoals: [],
          blockers: [],
          recentActions: [],
        },
        memory: [],
      },
    });
  }

  console.log(`  ✅ Created ${agents.length} agent profiles`);
}

async function main() {
  console.log('🚀 Starting Complete Seed Script');
  console.log('='.repeat(60));

  try {
    // Step 1: Create users
    const userIds = await seedUsers();

    // Step 2: Create projects
    const projects = await seedProjects(userIds);

    // Step 3: For each project, create full ecosystem
    for (const project of projects) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Setting up project: ${project.name} (${project.key})`);
      console.log('='.repeat(60));

      // Create sprints
      const sprints = await seedSprints(project.id, project.key);

      // Create issues
      await seedIssues(project.id, project.key, sprints, userIds);

      // Create velocity data
      await seedVelocityData(project.id, project.key);

      // Create resource allocations
      await seedResourceAllocations(project.id, project.key, userIds);

      // Create agent profiles
      await seedAgentProfiles(project.id, project.key, userIds);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Seed script completed successfully!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Summary:');
    console.log(`   ${userIds.length} users created`);
    console.log(`   ${projects.length} projects created`);
    console.log(`   Each project has:`);
    console.log(`     - 4 sprints (2 completed, 1 active, 1 planned)`);
    console.log(`     - 15+ issues with dependencies`);
    console.log(`     - 8 weeks of velocity history`);
    console.log(`     - 5 resource allocations`);
    console.log(`     - 5 AI agent profiles`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Navigate to: /projects');
    console.log('   3. Select a project (ECP, MBA, or CRM)');
    console.log('   4. Go to Dashboard to see AI Features');
    console.log('   5. Test Agent Collaboration');
    console.log('   6. Test Predictive Delivery Engine\n');

    console.log('🔗 Quick Links:');
    for (const project of projects) {
      console.log(`   ${project.name}:`);
      console.log(`     Dashboard: /projects/${project.id}/project-manager/dashboard`);
      console.log(`     Agents: /projects/${project.id}/project-manager/agent-collaboration`);
      console.log(`     Delivery: /projects/${project.id}/project-manager/delivery-engine`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
