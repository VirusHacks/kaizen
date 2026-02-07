import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getInstallationOctokit } from '@/lib/github-app'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/issues
 * List issues for a repository.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo } = await params
    const { searchParams } = new URL(req.url)
    const state = (searchParams.get('state') || 'open') as 'open' | 'closed' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')

    const github = await db.gitHub.findFirst({ where: { userId } })

    if (!github?.installationId) {
      return NextResponse.json({ error: 'GitHub App not installed' }, { status: 400 })
    }

    const octokit = getInstallationOctokit(github.installationId)
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state,
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    })

    return NextResponse.json({ issues: data })
  } catch (error) {
    console.error('[GITHUB_ISSUES_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

/**
 * POST /api/github/repos/[owner]/[repo]/issues
 * Create a new issue.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { title, description, labels, assignees } = body

    if (!title) {
      return NextResponse.json({ error: 'Issue title is required' }, { status: 400 })
    }

    const github = await db.gitHub.findFirst({ where: { userId } })

    if (!github?.installationId) {
      return NextResponse.json({ error: 'GitHub App not installed' }, { status: 400 })
    }

    const octokit = getInstallationOctokit(github.installationId)
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body: description,
      labels,
      assignees,
    })

    return NextResponse.json({ issue: data }, { status: 201 })
  } catch (error) {
    console.error('[GITHUB_ISSUES_POST]', error)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
