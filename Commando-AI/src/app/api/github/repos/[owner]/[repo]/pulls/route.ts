import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/pulls
 * List pull requests for a repository.
 * Supports ?state=open|closed|all&page=1&per_page=30&sort=updated&direction=desc
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
    const sort = (searchParams.get('sort') || 'updated') as 'created' | 'updated' | 'popularity' | 'long-running'
    const direction = (searchParams.get('direction') || 'desc') as 'asc' | 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')

    const { data } = await result.octokit.pulls.list({
      owner,
      repo,
      state,
      sort,
      direction,
      per_page: perPage,
      page,
    })

    return NextResponse.json({ pullRequests: data })
  } catch (error) {
    console.error('[GITHUB_PULLS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch pull requests' }, { status: 500 })
  }
}

/**
 * POST /api/github/repos/[owner]/[repo]/pulls
 * Create a new pull request.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { title, description, head, base, draft } = body

    if (!title || !head || !base) {
      return NextResponse.json(
        { error: 'Title, head branch, and base branch are required' },
        { status: 400 }
      )
    }

    const { data } = await result.octokit.pulls.create({
      owner,
      repo,
      title,
      body: description,
      head,
      base,
      draft: draft ?? false,
    })

    return NextResponse.json({ pullRequest: data }, { status: 201 })
  } catch (error) {
    console.error('[GITHUB_PULLS_POST]', error)
    return NextResponse.json({ error: 'Failed to create pull request' }, { status: 500 })
  }
}

/**
 * PATCH /api/github/repos/[owner]/[repo]/pulls
 * Update/merge a pull request (pass pull_number in body).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { pull_number, title, description, state, base } = body

    if (!pull_number) {
      return NextResponse.json({ error: 'pull_number is required' }, { status: 400 })
    }

    const { data } = await result.octokit.pulls.update({
      owner,
      repo,
      pull_number,
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { body: description } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(base !== undefined ? { base } : {}),
    })

    return NextResponse.json({ pullRequest: data })
  } catch (error) {
    console.error('[GITHUB_PULLS_PATCH]', error)
    return NextResponse.json({ error: 'Failed to update pull request' }, { status: 500 })
  }
}
