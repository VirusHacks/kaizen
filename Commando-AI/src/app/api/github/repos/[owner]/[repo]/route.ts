import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]
 * Get details of a specific repository.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { data } = await result.octokit.repos.get({ owner, repo })

    return NextResponse.json({ repository: data })
  } catch (error) {
    console.error('[GITHUB_REPO_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 500 })
  }
}

/**
 * DELETE /api/github/repos/[owner]/[repo]
 * Delete a repository (use with caution!).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    await result.octokit.repos.delete({ owner, repo })

    return NextResponse.json({ success: true, message: `Repository ${owner}/${repo} deleted` })
  } catch (error: any) {
    console.error('[GITHUB_REPO_DELETE]', error)
    if (error?.status === 403) {
      return NextResponse.json({ error: 'Insufficient permissions to delete this repository' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete repository' }, { status: 500 })
  }
}
