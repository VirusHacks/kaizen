import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/github/user
 * Get the authenticated user's GitHub profile.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data } = await result.octokit.users.getAuthenticated()

    return NextResponse.json({
      user: {
        login: data.login,
        id: data.id,
        avatarUrl: data.avatar_url,
        name: data.name,
        email: data.email,
        bio: data.bio,
        publicRepos: data.public_repos,
        totalPrivateRepos: data.total_private_repos,
        followers: data.followers,
        following: data.following,
        htmlUrl: data.html_url,
      },
    })
  } catch (error) {
    console.error('[GITHUB_USER_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
  }
}
