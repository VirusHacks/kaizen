import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting project seed...\n')

  // ─── Step 1: Find or create users ───
  const pmEmail = 'virustechhacks@gmail.com'

  const pmUser = await prisma.user.findUnique({ where: { email: pmEmail } })

  if (!pmUser) {
    console.log(`❌ PM user (${pmEmail}) not found in database.`)
    console.log('   Please sign up with this account first, then re-run.')
    return
  }
  console.log(`✅ PM User: ${pmUser.name || pmUser.email} (${pmUser.clerkId})`)

  // Find any other existing users to use as developers
  const allUsers = await prisma.user.findMany({
    where: { clerkId: { not: pmUser.clerkId } },
    take: 2
  })

  const dev1User = allUsers[0] || pmUser // Fallback to PM if no other users
  const dev2User = allUsers[1] || pmUser // Fallback to PM if not enough users
  
  console.log(`✅ Dev1 User: ${dev1User.name || dev1User.email} (${dev1User.clerkId})`)
  console.log(`✅ Dev2 User: ${dev2User.name || dev2User.email} (${dev2User.clerkId})`)

  // ─── Step 2: Create the Project ───
  console.log('\n📦 Creating project...')

  const project = await prisma.project.create({
    data: {
      name: 'Commando AI Platform',
      key: 'CMD',
      description:
        'An AI-powered project management platform that integrates with GitHub, Slack, and other tools. Features role-based dashboards, sprint management, kanban boards, and an MCP server for IDE integration.',
      ownerId: pmUser.clerkId,
      issueCounter: 0,
    },
  })

  console.log(`✅ Project created: ${project.name} (${project.key}) — ID: ${project.id}`)

  // ─── Step 3: Create Project Setup (Context) ───
  console.log('\n⚙️  Setting up project context...')

  await prisma.projectSetup.create({
    data: {
      projectId: project.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-04-15'),
      teamSize: 3,
      techStack: [
        'Next.js 15 (App Router)',
        'TypeScript',
        'Tailwind CSS + shadcn/ui',
        'Prisma ORM',
        'PostgreSQL (Supabase)',
        'Clerk Authentication',
        'MCP Server (Model Context Protocol)',
        'Google Gemini AI',
        'Stream Video SDK',
        'Zustand (State Management)',
      ].join('\n'),
      vision:
        'Build the most developer-friendly project management platform that seamlessly integrates AI assistance directly into IDE workflows via MCP, enabling developers to manage tasks, get implementation plans, and track progress without leaving their editor.',
      aiInstructions: [
        'Use TypeScript strict mode with proper type annotations.',
        'Follow Next.js App Router conventions with server components by default.',
        'Use server actions (use server) for data mutations.',
        'Prisma for all database operations — never raw SQL.',
        'Components go in _components folders, actions in _actions folders.',
        'Use shadcn/ui components and Tailwind CSS for styling.',
        'Keep API routes minimal — prefer server actions.',
        'Error handling: always return { data, error } pattern from server actions.',
        'Use Clerk auth() or currentUser() for authentication checks.',
      ].join('\n'),
      githubRepoUrl: 'https://github.com/CZHACKS/Commando-AI',
      githubRepoName: 'Commando-AI',
      githubRepoOwner: 'CZHACKS',
    },
  })

  console.log('✅ Project setup/context created')

  // ─── Step 4: Add Team Members ───
  console.log('\n👥 Adding team members...')

  // PM as OWNER
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: pmUser.clerkId,
      role: 'OWNER',
      departmentRole: 'PROJECT_MANAGER',
      memberId: 'PM001',
    },
  })
  console.log(`   ✅ ${pmUser.name || pmUser.email} → OWNER / PROJECT_MANAGER`)

  // Dev 1
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: dev1User.clerkId,
      role: 'MEMBER',
      departmentRole: 'DEVELOPER',
      memberId: 'DEV001',
    },
  })
  console.log(`   ✅ ${dev1User.name || dev1User.email} → MEMBER / DEVELOPER`)

  // ─── Step 5: Create Workflow ───
  console.log('\n🔄 Creating workflow...')

  const workflow = await prisma.projectWorkflow.create({
    data: {
      name: 'Default',
      description: 'Standard development workflow',
      isDefault: true,
      projectId: project.id,
    },
  })

  const statusTodo = await prisma.workflowStatus.create({
    data: { workflowId: workflow.id, status: 'TODO', displayName: 'To Do', order: 0, color: '#6B7280', positionX: 0, positionY: 200 },
  })
  const statusInProgress = await prisma.workflowStatus.create({
    data: { workflowId: workflow.id, status: 'IN_PROGRESS', displayName: 'In Progress', order: 1, color: '#3B82F6', positionX: 300, positionY: 200 },
  })
  const statusInReview = await prisma.workflowStatus.create({
    data: { workflowId: workflow.id, status: 'IN_REVIEW', displayName: 'In Review', order: 2, color: '#F59E0B', positionX: 600, positionY: 200 },
  })
  const statusDone = await prisma.workflowStatus.create({
    data: { workflowId: workflow.id, status: 'DONE', displayName: 'Done', order: 3, color: '#10B981', positionX: 900, positionY: 200 },
  })

  // Transitions
  const transitions = [
    { from: statusTodo.id, to: statusInProgress.id, name: 'Start Work' },
    { from: statusInProgress.id, to: statusInReview.id, name: 'Submit for Review' },
    { from: statusInReview.id, to: statusDone.id, name: 'Approve' },
    { from: statusInReview.id, to: statusInProgress.id, name: 'Request Changes' },
    { from: statusInProgress.id, to: statusTodo.id, name: 'Move Back' },
  ]

  for (const t of transitions) {
    await prisma.workflowTransition.create({
      data: {
        workflowId: workflow.id,
        fromStatusId: t.from,
        toStatusId: t.to,
        name: t.name,
      },
    })
  }
  console.log('✅ Workflow created with 4 statuses and 5 transitions')

  // ─── Step 6: Create Sprint ───
  console.log('\n🏃 Creating sprint...')

  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 1 — Foundation',
      goal: 'Set up core infrastructure, authentication, role-based dashboards, and MCP server integration.',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-15'),
      status: 'ACTIVE',
      projectId: project.id,
    },
  })
  console.log(`✅ Sprint created: ${sprint.name}`)

  const sprint2 = await prisma.sprint.create({
    data: {
      name: 'Sprint 2 — AI & Automation',
      goal: 'Implement AI-powered features, meeting transcription, and workflow automation.',
      startDate: new Date('2026-02-16'),
      endDate: new Date('2026-03-01'),
      status: 'PLANNED',
      projectId: project.id,
    },
  })
  console.log(`✅ Sprint created: ${sprint2.name}`)

  // ─── Step 7: Create Issues / Tasks ───
  console.log('\n📋 Creating issues and tasks...')

  let issueNumber = 0
  const nextNumber = () => ++issueNumber

  // ── EPIC 1: Authentication & User Management ──
  const epic1 = await prisma.issue.create({
    data: {
      projectId: project.id,
      number: nextNumber(),
      title: 'Authentication & User Management',
      description:
        '## Overview\nSet up Clerk authentication, user roles, and project-based access control.\n\n## Goals\n- Clerk sign-up/sign-in flow\n- Role-based access (PM, Developer, QA, etc.)\n- Member invitation system\n- Protected routes via middleware',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      reporterId: pmUser.clerkId,
      sprintId: sprint.id,
    },
  })
  console.log(`   ✅ EPIC: CMD-${epic1.number} — ${epic1.title}`)

  // Stories/Tasks under Epic 1
  const tasks1 = [
    {
      title: 'Set up Clerk middleware and protected routes',
      description: '### Task\nConfigure `clerkMiddleware` in `middleware.ts` to protect all routes except public ones (`/sign-in`, `/sign-up`, `/api/webhooks`, `/`).\n\n### Acceptance Criteria\n- [ ] Unauthenticated users redirected to sign-in\n- [ ] Public routes accessible without auth\n- [ ] Webhook routes excluded from auth checks',
      type: 'TASK' as const,
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      assigneeId: dev1User.clerkId,
    },
    {
      title: 'Implement role-based dashboard routing',
      description: '### Task\nAfter member login with memberId + password, route them to the correct dashboard based on `departmentRole`:\n- DEVELOPER → `/projects/[id]/developer`\n- QA_TESTER → `/projects/[id]/qa-tester`\n- PROJECT_MANAGER → `/projects/[id]/project-manager`\n\n### Acceptance Criteria\n- [ ] Login form validates memberId + password\n- [ ] Correct redirect based on role\n- [ ] Show error for invalid credentials',
      type: 'STORY' as const,
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      assigneeId: dev2User.clerkId,
    },
    {
      title: 'Build team management UI for project managers',
      description: '### Task\nCreate UI in PM settings to manage team members — add members, assign roles, set department roles, generate login credentials.\n\n### Acceptance Criteria\n- [ ] List all members with roles\n- [ ] Add new member with memberId and password\n- [ ] Edit member roles\n- [ ] Delete members',
      type: 'TASK' as const,
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      assigneeId: dev1User.clerkId,
    },
  ]

  for (const task of tasks1) {
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: nextNumber(),
        title: task.title,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        reporterId: pmUser.clerkId,
        assigneeId: task.assigneeId,
        parentId: epic1.id,
        sprintId: sprint.id,
      },
    })
    console.log(`   ✅ ${task.type}: CMD-${issue.number} — ${issue.title} [${task.status}]`)
  }

  // ── EPIC 2: Developer Dashboard ──
  const epic2 = await prisma.issue.create({
    data: {
      projectId: project.id,
      number: nextNumber(),
      title: 'Developer Dashboard & Kanban Board',
      description:
        '## Overview\nBuild a comprehensive developer dashboard with kanban board, task detail panel, and dev stats.\n\n## Goals\n- Drag-and-drop kanban board\n- Task detail side panel\n- Developer statistics (velocity, completion rate)\n- Sprint-filtered views',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      reporterId: pmUser.clerkId,
      sprintId: sprint.id,
    },
  })
  console.log(`   ✅ EPIC: CMD-${epic2.number} — ${epic2.title}`)

  const tasks2 = [
    {
      title: 'Build developer kanban board with drag-and-drop',
      description: '### Task\nCreate a kanban board component using `@dnd-kit` with columns: TODO, IN_PROGRESS, IN_REVIEW, DONE.\n\n### Technical Details\n- Use `@dnd-kit/core` and `@dnd-kit/sortable`\n- Support drag between columns (status change)\n- Respect workflow transitions (only allow valid moves)\n- Optimistic updates with server action fallback\n\n### Acceptance Criteria\n- [ ] 4-column kanban board renders\n- [ ] Cards show title, priority badge, assignee avatar\n- [ ] Drag-and-drop changes issue status\n- [ ] Invalid transitions show error toast',
      type: 'STORY' as const,
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      assigneeId: dev1User.clerkId,
    },
    {
      title: 'Create task detail side panel',
      description: '### Task\nWhen clicking a task card on the kanban board, slide open a detail panel showing full issue info with edit capabilities.\n\n### Fields to display\n- Title (editable)\n- Description (markdown, editable)\n- Status, Priority, Type (dropdowns)\n- Assignee\n- Due date\n- Parent task\n- Subtasks list\n\n### Acceptance Criteria\n- [ ] Panel slides in from right\n- [ ] All fields editable inline\n- [ ] Changes save via server action\n- [ ] Close button and click-outside dismiss',
      type: 'TASK' as const,
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      assigneeId: dev2User.clerkId,
    },
    {
      title: 'Implement developer stats component',
      description: '### Task\nShow developer productivity stats at the top of the dashboard:\n- Tasks completed this sprint\n- Tasks in progress\n- Completion rate percentage\n- Velocity trend\n\n### Acceptance Criteria\n- [ ] Stats cards render with real data\n- [ ] Color-coded progress indicators\n- [ ] Responsive on mobile',
      type: 'TASK' as const,
      status: 'TODO' as const,
      priority: 'LOW' as const,
      assigneeId: dev1User.clerkId,
    },
  ]

  for (const task of tasks2) {
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: nextNumber(),
        title: task.title,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        reporterId: pmUser.clerkId,
        assigneeId: task.assigneeId,
        parentId: epic2.id,
        sprintId: sprint.id,
      },
    })
    console.log(`   ✅ ${task.type}: CMD-${issue.number} — ${issue.title} [${task.status}]`)
  }

  // ── EPIC 3: MCP Server Integration ──
  const epic3 = await prisma.issue.create({
    data: {
      projectId: project.id,
      number: nextNumber(),
      title: 'MCP Server — IDE Integration',
      description:
        '## Overview\nBuild an MCP (Model Context Protocol) server so developers can manage tasks, get AI implementation plans, and view project context directly from their IDE.\n\n## Goals\n- VS Code / Cursor integration\n- Task CRUD from IDE\n- AI-powered implementation plan generation\n- Daily standup generation\n- Project context retrieval',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      reporterId: pmUser.clerkId,
      sprintId: sprint.id,
    },
  })
  console.log(`   ✅ EPIC: CMD-${epic3.number} — ${epic3.title}`)

  const tasks3 = [
    {
      title: 'Set up MCP server with stdio transport',
      description: '### Task\nCreate the MCP server using `@modelcontextprotocol/sdk` with stdio transport.\n\n### Technical Details\n- Entry point: `mcp-server/src/index.ts`\n- Register tool groups: project, tasks, sprints, workflow, AI, productivity\n- Use Prisma client connected to same database\n- Load environment from parent `.env`\n\n### Acceptance Criteria\n- [ ] Server starts without errors\n- [ ] Connects via stdio to VS Code\n- [ ] All tool groups registered',
      type: 'TASK' as const,
      status: 'DONE' as const,
      priority: 'CRITICAL' as const,
      assigneeId: dev1User.clerkId,
    },
    {
      title: 'Implement AI implementation plan generator',
      description: '### Task\nUse Google Gemini to generate step-by-step implementation plans for tasks.\n\n### Input\n- Task title, description, acceptance criteria\n- Project tech stack and coding standards\n\n### Output\n- Architecture steps\n- File changes needed\n- Database migrations\n- Integration steps\n- Testing plan\n\n### Acceptance Criteria\n- [ ] Returns structured JSON plan\n- [ ] Includes project context in prompt\n- [ ] Handles API errors gracefully',
      type: 'STORY' as const,
      status: 'IN_REVIEW' as const,
      priority: 'HIGH' as const,
      assigneeId: dev2User.clerkId,
    },
    {
      title: 'Add daily standup generation tool',
      description: '### Task\nCreate MCP tool that generates a daily standup report by analyzing recent task changes.\n\n### Format\n```\n## Daily Standup — [Date]\n### ✅ Yesterday (Done)\n### 🔨 Today (In Progress)\n### 🚨 Blockers\n```\n\n### Acceptance Criteria\n- [ ] Pulls tasks completed in last 24h\n- [ ] Shows currently in-progress tasks\n- [ ] Identifies blocked items',
      type: 'TASK' as const,
      status: 'DONE' as const,
      priority: 'MEDIUM' as const,
      assigneeId: dev1User.clerkId,
    },
  ]

  for (const task of tasks3) {
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: nextNumber(),
        title: task.title,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        reporterId: pmUser.clerkId,
        assigneeId: task.assigneeId,
        parentId: epic3.id,
        sprintId: sprint.id,
      },
    })
    console.log(`   ✅ ${task.type}: CMD-${issue.number} — ${issue.title} [${task.status}]`)
  }

  // ── Sprint 2 Backlog Items ──
  console.log('\n📋 Creating Sprint 2 backlog items...')

  const sprint2Tasks = [
    {
      title: 'AI-powered meeting transcription and action items',
      description: '### Feature\nIntegrate Stream Video SDK meeting recordings with AI transcription. Extract action items and auto-create tasks.\n\n### Acceptance Criteria\n- [ ] Transcribe meeting recordings\n- [ ] Extract action items with AI\n- [ ] Auto-create issues from action items\n- [ ] Link issues to meeting record',
      type: 'STORY' as const,
      priority: 'HIGH' as const,
      assigneeId: dev2User.clerkId,
    },
    {
      title: 'Build PM analytics dashboard with charts',
      description: '### Feature\nCreate an analytics dashboard for project managers with:\n- Sprint burndown chart\n- Task distribution by status\n- Team velocity over time\n- Priority breakdown pie chart\n\n### Acceptance Criteria\n- [ ] Burndown chart with ideal line\n- [ ] Interactive charts with tooltips\n- [ ] Date range filtering',
      type: 'STORY' as const,
      priority: 'MEDIUM' as const,
      assigneeId: dev1User.clerkId,
    },
    {
      title: 'Implement GitHub PR auto-linking to tasks',
      description: '### Feature\nWhen a PR title or branch contains `CMD-123`, auto-link it to the corresponding issue and update status.\n\n### Acceptance Criteria\n- [ ] Detect task key in PR title/branch\n- [ ] Show linked PRs on task detail\n- [ ] Auto-move task to IN_REVIEW when PR opened\n- [ ] Auto-move to DONE when PR merged',
      type: 'STORY' as const,
      priority: 'HIGH' as const,
      assigneeId: dev1User.clerkId,
    },
  ]

  for (const task of sprint2Tasks) {
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: nextNumber(),
        title: task.title,
        description: task.description,
        type: task.type,
        status: 'TODO',
        priority: task.priority,
        reporterId: pmUser.clerkId,
        assigneeId: task.assigneeId,
        sprintId: sprint2.id,
      },
    })
    console.log(`   ✅ ${task.type}: CMD-${issue.number} — ${issue.title}`)
  }

  // ── Bugs ──
  console.log('\n🐛 Creating bug reports...')

  const bugs = [
    {
      title: 'Developer dashboard returns 404 for non-owner members',
      description: '### Bug Report\n**Steps to Reproduce:**\n1. Log in as a developer (not project owner)\n2. Navigate to `/projects/[id]/developer`\n3. Page shows "Not Found"\n\n**Expected:** Developer dashboard loads\n**Actual:** 404 page\n\n**Root Cause:** `getProjectById` only checks `ownerId`, not project members.\n\n**Fix:** Update query to use `OR` with `members.some`.',
      priority: 'CRITICAL' as const,
      assigneeId: dev1User.clerkId,
      status: 'DONE' as const,
      sprintId: sprint.id,
    },
    {
      title: 'Kanban drag-and-drop fails on mobile Safari',
      description: '### Bug Report\n**Steps to Reproduce:**\n1. Open developer dashboard on iOS Safari\n2. Try to drag a task card\n3. Card doesn\'t move, page scrolls instead\n\n**Expected:** Card drags smoothly\n**Actual:** Touch events captured by scroll\n\n**Possible Fix:** Add `touch-action: none` CSS and use `@dnd-kit` touch sensor.',
      priority: 'MEDIUM' as const,
      assigneeId: dev2User.clerkId,
      status: 'TODO' as const,
      sprintId: sprint.id,
    },
  ]

  for (const bug of bugs) {
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: nextNumber(),
        title: bug.title,
        description: bug.description,
        type: 'BUG',
        status: bug.status,
        priority: bug.priority,
        reporterId: pmUser.clerkId,
        assigneeId: bug.assigneeId,
        sprintId: bug.sprintId,
      },
    })
    console.log(`   ✅ BUG: CMD-${issue.number} — ${issue.title} [${bug.status}]`)
  }

  // ─── Step 8: Update issue counter ───
  await prisma.project.update({
    where: { id: project.id },
    data: { issueCounter: issueNumber },
  })

  // ─── Summary ───
  console.log('\n' + '═'.repeat(60))
  console.log('🎉 SEED COMPLETE!')
  console.log('═'.repeat(60))
  console.log(`\n📦 Project: ${project.name} (${project.key})`)
  console.log(`   ID: ${project.id}`)
  console.log(`\n👥 Team:`)
  console.log(`   PM:   ${pmUser.name || pmUser.email} (${pmUser.clerkId})`)
  console.log(`   Dev:  ${dev1User.name || dev1User.email} (${dev1User.clerkId})`)
  console.log(`\n🏃 Sprints: 2 (Sprint 1 ACTIVE, Sprint 2 PLANNED)`)
  console.log(`📋 Issues: ${issueNumber} total`)
  console.log(`   3 Epics | 6 Stories/Tasks (Sprint 1) | 3 Stories (Sprint 2) | 2 Bugs`)
  console.log(`🔄 Workflow: 4 statuses, 5 transitions`)
  console.log(`\n🔗 URL: http://localhost:3000/projects/${project.id}/project-manager`)
  console.log(`   Dev1: http://localhost:3000/projects/${project.id}/developer`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
