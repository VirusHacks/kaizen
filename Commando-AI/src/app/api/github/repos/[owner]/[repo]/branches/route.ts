import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/branches
 * List branches for a repository.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { data } = await result.octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    })

    return NextResponse.json({ branches: data })
  } catch (error) {
    console.error('[GITHUB_BRANCHES_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}

/**
 * POST /api/github/repos/[owner]/[repo]/branches
 * Create a new branch from an existing one.
 * Body: { branchName: string, fromBranch?: string (default: 'main') }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const body = await req.json()
    const { branchName, fromBranch = 'main' } = body

    if (!branchName) {
      return NextResponse.json({ error: 'branchName is required' }, { status: 400 })
    }

    // Get the SHA of the source branch
    const { data: ref } = await result.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    })

    // Create the new branch
    const { data } = await result.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })

    return NextResponse.json({ branch: data }, { status: 201 })
  } catch (error: any) {
    console.error('[GITHUB_BRANCHES_POST]', error)
    if (error?.status === 422) {
      return NextResponse.json({ error: 'Branch already exists' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}
