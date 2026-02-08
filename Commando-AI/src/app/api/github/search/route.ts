import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/github/search
 * Search repositories, issues, or code.
 * Supports ?q=search+query&type=repositories|issues|code&page=1&per_page=20
 */
export async function GET(req: NextRequest) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const type = searchParams.get('type') || 'repositories'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')

    if (!q) {
      return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'repositories': {
        const res = await result.octokit.search.repos({
          q,
          sort: 'updated',
          order: 'desc',
          per_page: perPage,
          page,
        })
        data = { items: res.data.items, totalCount: res.data.total_count }
        break
      }
      case 'issues': {
        const res = await result.octokit.search.issuesAndPullRequests({
          q,
          sort: 'updated',
          order: 'desc',
          per_page: perPage,
          page,
        })
        data = { items: res.data.items, totalCount: res.data.total_count }
        break
      }
      case 'code': {
        const res = await result.octokit.search.code({
          q,
          per_page: perPage,
          page,
        })
        data = { items: res.data.items, totalCount: res.data.total_count }
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid search type. Use: repositories, issues, or code' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[GITHUB_SEARCH_GET]', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
