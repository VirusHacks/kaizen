import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/github-app'
import { db } from '@/lib/db'

/**
 * POST /api/github/webhook
 * Handle incoming GitHub App webhook events.
 * Processes: installation, push, issues, pull_request events.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers.get('x-github-event')
    const deliveryId = req.headers.get('x-github-delivery')

    // Verify webhook signature if secret is configured
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('[GITHUB_WEBHOOK] Invalid signature for delivery:', deliveryId)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)

    console.log(`[GITHUB_WEBHOOK] Event: ${event}, Action: ${payload.action}, Delivery: ${deliveryId}`)

    switch (event) {
      case 'installation':
        await handleInstallationEvent(payload)
        break

      case 'installation_repositories':
        await handleInstallationReposEvent(payload)
        break

      case 'push':
        await handlePushEvent(payload)
        break

      case 'issues':
        await handleIssuesEvent(payload)
        break

      case 'pull_request':
        await handlePullRequestEvent(payload)
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

/**
 * Handle installation created/deleted/suspend/unsuspend events.
 * When a user installs or uninstalls the GitHub App.
 */
async function handleInstallationEvent(payload: any) {
  const { action, installation, sender } = payload
  const installationId = installation.id
  const appSlug = installation.app_slug
  const senderLogin = sender?.login

  console.log(`[GITHUB_WEBHOOK] Installation ${action} by ${senderLogin}, ID: ${installationId}`)

  switch (action) {
    case 'created': {
      // User installed the app — try to link to existing GitHub connection
      if (senderLogin) {
        const github = await db.gitHub.findFirst({
          where: { username: senderLogin },
        })

        if (github && !github.installationId) {
          await db.gitHub.update({
            where: { id: github.id },
            data: {
              installationId,
              appSlug,
            },
          })
          console.log(`[GITHUB_WEBHOOK] Linked installation ${installationId} to user ${senderLogin}`)
        }
      }
      break
    }

    case 'deleted': {
      // User uninstalled the app — clear installation from our records
      const githubRecords = await db.gitHub.findMany({
        where: { installationId },
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
      console.log(`[GITHUB_WEBHOOK] Cleared installation ${installationId} from ${githubRecords.length} records`)
      break
    }

    case 'suspend': {
      console.log(`[GITHUB_WEBHOOK] Installation ${installationId} suspended`)
      break
    }

    case 'unsuspend': {
      console.log(`[GITHUB_WEBHOOK] Installation ${installationId} unsuspended`)
      break
    }
  }
}

/**
 * Handle repository add/remove from installation.
 */
async function handleInstallationReposEvent(payload: any) {
  const { action, installation, repositories_added, repositories_removed } = payload
  console.log(
    `[GITHUB_WEBHOOK] Installation repos ${action}: +${repositories_added?.length || 0} -${repositories_removed?.length || 0}`
  )
}

/**
 * Handle push events (new commits pushed).
 */
async function handlePushEvent(payload: any) {
  const { ref, repository, commits, pusher } = payload
  const repoName = repository?.full_name
  const branch = ref?.replace('refs/heads/', '')
  const commitCount = commits?.length || 0

  console.log(
    `[GITHUB_WEBHOOK] Push to ${repoName}/${branch} by ${pusher?.name}: ${commitCount} commits`
  )

  // Update project setup if repo matches any linked project
  if (repository?.full_name) {
    const [owner, name] = repository.full_name.split('/')
    const projects = await db.projectSetup.findMany({
      where: {
        githubRepoOwner: owner,
        githubRepoName: name,
      },
    })

    if (projects.length > 0) {
      console.log(`[GITHUB_WEBHOOK] Push matches ${projects.length} linked project(s)`)
      // You can add real-time notifications or trigger workflows here
    }
  }
}

/**
 * Handle issue events (opened, closed, edited, etc.).
 */
async function handleIssuesEvent(payload: any) {
  const { action, issue, repository } = payload
  console.log(
    `[GITHUB_WEBHOOK] Issue #${issue?.number} ${action} in ${repository?.full_name}: ${issue?.title}`
  )
}

/**
 * Handle pull request events (opened, closed, merged, etc.).
 */
async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, repository } = payload
  console.log(
    `[GITHUB_WEBHOOK] PR #${pull_request?.number} ${action} in ${repository?.full_name}: ${pull_request?.title}`
  )
}
