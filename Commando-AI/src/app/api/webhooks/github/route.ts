import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/github-app'
import { db } from '@/lib/db'
import {
  analyzeCommitsForStatusUpdate,
  CommitInfo,
  ProjectIssueContext,
} from '@/lib/ai/commit-analyzer'
import { validateTransition } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/settings/workflow/_actions/workflow-actions'

export const dynamic = 'force-dynamic'

/**
 * GitHub App Webhook receiver.
 * Handles events sent by GitHub when things happen in repos where the app is installed.
 *
 * Webhook URL: https://your-domain.com/api/webhooks/github
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers.get('x-github-event')
    const deliveryId = req.headers.get('x-github-delivery')

    console.log(`[GITHUB_WEBHOOK] Event: ${event}, Delivery: ${deliveryId}`)

    // Verify webhook signature
    const isValid = verifyWebhookSignature(payload, signature)
    if (!isValid) {
      console.error('[GITHUB_WEBHOOK] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(payload)

    // Handle different event types
    switch (event) {
      case 'installation':
        await handleInstallation(body)
        break

      case 'installation_repositories':
        await handleInstallationRepositories(body)
        break

      case 'push':
        await handlePush(body)
        break

      case 'issues':
        await handleIssues(body)
        break

      case 'pull_request':
        await handlePullRequest(body)
        break

      case 'create':
        await handleCreate(body)
        break

      case 'delete':
        await handleDelete(body)
        break

      case 'repository':
        await handleRepository(body)
        break

      case 'ping':
        console.log('[GITHUB_WEBHOOK] Ping received successfully')
        break

      default:
        console.log(`[GITHUB_WEBHOOK] Unhandled event: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[GITHUB_WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ==========================================
// EVENT HANDLERS
// ==========================================

async function handleInstallation(body: any) {
  const action = body.action // created, deleted, suspend, unsuspend, new_permissions_accepted
  const installation = body.installation
  const sender = body.sender

  console.log(
    `[GITHUB_WEBHOOK] Installation ${action}: ID=${installation.id}, Account=${installation.account.login}, By=${sender.login}`
  )

  if (action === 'created') {
    // App was installed — update any GitHub records that match the sender
    try {
      const githubRecords = await db.gitHub.findMany({
        where: { username: sender.login },
      })

      for (const record of githubRecords) {
        await db.gitHub.update({
          where: { id: record.id },
          data: {
            installationId: installation.id,
            appSlug: installation.app_slug || null,
          },
        })
      }

      console.log(
        `[GITHUB_WEBHOOK] Updated ${githubRecords.length} GitHub records with installation ${installation.id}`
      )
    } catch (err) {
      console.error('[GITHUB_WEBHOOK] Error updating installation:', err)
    }
  } else if (action === 'deleted') {
    // App was uninstalled — clear installation data
    try {
      const githubRecords = await db.gitHub.findMany({
        where: { installationId: installation.id },
      })

      for (const record of githubRecords) {
        await db.gitHub.update({
          where: { id: record.id },
          data: {
            installationId: null,
            appSlug: null,
          },
        })
      }

      console.log(
        `[GITHUB_WEBHOOK] Cleared installation data for ${githubRecords.length} records`
      )
    } catch (err) {
      console.error('[GITHUB_WEBHOOK] Error clearing installation:', err)
    }
  }
}

async function handleInstallationRepositories(body: any) {
  const action = body.action // added, removed
  const installation = body.installation
  const added = body.repositories_added || []
  const removed = body.repositories_removed || []

  console.log(
    `[GITHUB_WEBHOOK] Installation repos ${action}: +${added.length} -${removed.length} for installation ${installation.id}`
  )

  // You could track which repos the installation has access to here
}

async function handlePush(body: any) {
  const repo = body.repository
  const pusher = body.pusher
  const ref = body.ref
  const commits = body.commits || []

  console.log(
    `[GITHUB_WEBHOOK] Push to ${repo.full_name} (${ref}) by ${pusher.name}: ${commits.length} commits`
  )

  // Find projects linked to this repo
  try {
    const linkedSetups = await db.projectSetup.findMany({
      where: {
        githubRepoName: repo.name,
        githubRepoOwner: repo.owner?.login || repo.owner?.name,
      },
      include: { project: true },
    })

    for (const setup of linkedSetups) {
      const project = setup.project
      console.log(
        `[GITHUB_WEBHOOK] Push relates to project: ${project.name} (${project.key})`
      )

      // --- AI-Powered Auto Status Update ---
      try {
        await processCommitsForProject(project, commits)
      } catch (err) {
        console.error(
          `[GITHUB_WEBHOOK] AI commit analysis failed for project ${project.key}:`,
          err
        )
      }
    }
  } catch (err) {
    console.error('[GITHUB_WEBHOOK] Error processing push:', err)
  }
}

/**
 * Process commits through AI to auto-update issue statuses on the Kanban board.
 * Flow: Parse commits → Load active issues → AI analysis → Validate transitions → Update DB
 */
async function processCommitsForProject(
  project: { id: string; key: string; name: string },
  rawCommits: any[]
) {
  if (rawCommits.length === 0) return

  // 1. Build commit info for AI
  const commits: CommitInfo[] = rawCommits.map((c: any) => ({
    sha: c.id || c.sha || '',
    message: c.message || '',
    author: c.author?.name || c.author?.username || 'unknown',
    timestamp: c.timestamp || new Date().toISOString(),
    url: c.url || undefined,
  }))

  // 2. Load all active (non-DONE, non-archived) issues for the project
  const activeIssues = await db.issue.findMany({
    where: {
      projectId: project.id,
      isArchived: false,
      status: { not: 'DONE' },
    },
    include: {
      assignee: {
        select: { name: true },
      },
    },
  })

  if (activeIssues.length === 0) {
    console.log(
      `[GITHUB_WEBHOOK] No active issues in project ${project.key} — skipping AI analysis`
    )
    return
  }

  const issueContext: ProjectIssueContext[] = activeIssues.map((i) => ({
    id: i.id,
    number: i.number,
    title: i.title,
    description: i.description,
    status: i.status,
    type: i.type,
    priority: i.priority,
    assigneeName: i.assignee?.name || null,
  }))

  // 3. AI analysis — match commits to issues and suggest status changes
  console.log(
    `[GITHUB_WEBHOOK] Running AI commit analysis: ${commits.length} commits against ${activeIssues.length} active issues in ${project.key}`
  )

  const analysis = await analyzeCommitsForStatusUpdate(
    commits,
    issueContext,
    project.key
  )

  if (analysis.matches.length === 0) {
    console.log(
      `[GITHUB_WEBHOOK] AI found no matching issues for commits in ${project.key}`
    )
    return
  }

  console.log(
    `[GITHUB_WEBHOOK] AI matched ${analysis.matches.length} issue(s): ${analysis.summary}`
  )

  // 4. Apply status updates with workflow validation
  for (const match of analysis.matches) {
    const issue = activeIssues.find((i) => i.number === match.issueNumber)
    if (!issue) {
      console.log(
        `[GITHUB_WEBHOOK] Issue ${project.key}-${match.issueNumber} not found — skipping`
      )
      continue
    }

    // Skip if already in the target status
    if (issue.status === match.newStatus) {
      console.log(
        `[GITHUB_WEBHOOK] ${project.key}-${match.issueNumber} already ${match.newStatus} — skipping`
      )
      continue
    }

    // Validate the transition is allowed by the project workflow
    const validation = await validateTransition(
      project.id,
      issue.id,
      issue.status,
      match.newStatus
    )

    if (!validation.valid) {
      console.log(
        `[GITHUB_WEBHOOK] Transition ${issue.status} → ${match.newStatus} not allowed for ${project.key}-${match.issueNumber}: ${validation.error}`
      )
      continue
    }

    // Apply the status update
    try {
      await db.issue.update({
        where: { id: issue.id },
        data: { status: match.newStatus as any },
      })

      console.log(
        `[GITHUB_WEBHOOK] ✅ Auto-updated ${project.key}-${match.issueNumber} "${issue.title}": ${issue.status} → ${match.newStatus} (confidence: ${match.confidence}, reason: ${match.reason})`
      )
    } catch (err) {
      console.error(
        `[GITHUB_WEBHOOK] Failed to update ${project.key}-${match.issueNumber}:`,
        err
      )
    }
  }
}

async function handleIssues(body: any) {
  const action = body.action // opened, edited, closed, reopened, assigned, etc.
  const issue = body.issue
  const repo = body.repository

  console.log(
    `[GITHUB_WEBHOOK] Issue ${action}: #${issue.number} "${issue.title}" in ${repo.full_name}`
  )

  // Future: sync GitHub issues with project issues, trigger notifications
}

async function handlePullRequest(body: any) {
  const action = body.action // opened, closed, merged, etc.
  const pr = body.pull_request
  const repo = body.repository

  console.log(
    `[GITHUB_WEBHOOK] PR ${action}: #${pr.number} "${pr.title}" in ${repo.full_name}`
  )

  // Future: update project board, trigger code review workflows
}

async function handleCreate(body: any) {
  const refType = body.ref_type // branch, tag
  const ref = body.ref
  const repo = body.repository

  console.log(
    `[GITHUB_WEBHOOK] Created ${refType}: ${ref} in ${repo.full_name}`
  )
}

async function handleDelete(body: any) {
  const refType = body.ref_type
  const ref = body.ref
  const repo = body.repository

  console.log(
    `[GITHUB_WEBHOOK] Deleted ${refType}: ${ref} in ${repo.full_name}`
  )
}

async function handleRepository(body: any) {
  const action = body.action // created, deleted, archived, unarchived, publicized, privatized, etc.
  const repo = body.repository

  console.log(
    `[GITHUB_WEBHOOK] Repository ${action}: ${repo.full_name}`
  )
}
