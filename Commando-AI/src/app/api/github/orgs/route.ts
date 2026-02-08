import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/github/orgs
 * List organizations the authenticated user belongs to.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data } = await result.octokit.orgs.listForAuthenticatedUser()

    return NextResponse.json({
      organizations: data.map((org) => ({
        login: org.login,
        id: org.id,
        avatarUrl: org.avatar_url,
        description: org.description,
      })),
    })
  } catch (error) {
    console.error('[GITHUB_ORGS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}
