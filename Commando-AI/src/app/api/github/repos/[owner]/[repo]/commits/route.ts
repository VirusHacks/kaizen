import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ owner: string; repo: string }> }

/**
 * GET /api/github/repos/[owner]/[repo]/commits
 * List commits for a repository.
 * Supports ?sha=branch&page=1&per_page=30&author=username&path=filepath&since=ISO&until=ISO
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { owner, repo } = await params
    const { searchParams } = new URL(req.url)
    const sha = searchParams.get('sha') || undefined
    const path = searchParams.get('path') || undefined
    const author = searchParams.get('author') || undefined
    const since = searchParams.get('since') || undefined
    const until = searchParams.get('until') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')

    const { data } = await result.octokit.repos.listCommits({
      owner,
      repo,
      sha,
      path,
      author,
      since,
      until,
      per_page: perPage,
      page,
    })

    return NextResponse.json({ commits: data })
  } catch (error) {
    console.error('[GITHUB_COMMITS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch commits' }, { status: 500 })
  }
}
