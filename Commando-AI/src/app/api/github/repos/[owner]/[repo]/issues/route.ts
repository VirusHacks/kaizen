import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/issues
 * List issues for a repository.
 * Supports ?state=open|closed|all&page=1&per_page=30&labels=bug,feature&sort=updated&direction=desc
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { searchParams } = new URL(req.url)
    const state = (searchParams.get('state') || 'open') as 'open' | 'closed' | 'all'
    const labels = searchParams.get('labels') || undefined
    const sort = (searchParams.get('sort') || 'updated') as 'created' | 'updated' | 'comments'
    const direction = (searchParams.get('direction') || 'desc') as 'asc' | 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')

    const { data } = await result.octokit.issues.listForRepo({
      owner,
      repo,
      state,
      labels,
      sort,
      direction,
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
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { title, description, labels, assignees, milestone } = body

    if (!title) {
      return NextResponse.json({ error: 'Issue title is required' }, { status: 400 })
    }

    const { data } = await result.octokit.issues.create({
      owner,
      repo,
      title,
      body: description,
      labels,
      assignees,
      milestone,
    })

    return NextResponse.json({ issue: data }, { status: 201 })
  } catch (error) {
    console.error('[GITHUB_ISSUES_POST]', error)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}

/**
 * PATCH /api/github/repos/[owner]/[repo]/issues
 * Update an existing issue (pass issue_number in body).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { issue_number, title, description, state, labels, assignees, milestone } = body

    if (!issue_number) {
      return NextResponse.json({ error: 'issue_number is required' }, { status: 400 })
    }

    const { data } = await result.octokit.issues.update({
      owner,
      repo,
      issue_number,
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { body: description } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(labels !== undefined ? { labels } : {}),
      ...(assignees !== undefined ? { assignees } : {}),
      ...(milestone !== undefined ? { milestone } : {}),
    })

    return NextResponse.json({ issue: data })
  } catch (error) {
    console.error('[GITHUB_ISSUES_PATCH]', error)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}
