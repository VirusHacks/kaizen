import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedOctokit, getUserOctokit } from '@/lib/github-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/github/repos
 * List repositories accessible to the authenticated user.
 * Supports ?page=1&per_page=30&sort=updated&type=all query params.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await getAuthenticatedOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { octokit, github } = result
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')
    const sort = (searchParams.get('sort') || 'updated') as 'created' | 'updated' | 'pushed' | 'full_name'
    const type = (searchParams.get('type') || 'all') as 'all' | 'owner' | 'public' | 'private' | 'member'

    // If we have an installation, list installation repos
    if (github.installationId) {
      try {
        const { data } = await octokit.apps.listReposAccessibleToInstallation({
          per_page: perPage,
          page,
        })
        return NextResponse.json({
          repositories: data.repositories,
          totalCount: data.total_count,
        })
      } catch {
        // Fall through to user repos
      }
    }

    // Otherwise, list user's repos
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort,
      direction: 'desc',
      per_page: perPage,
      page,
      type,
    })

    return NextResponse.json({
      repositories: data,
      totalCount: data.length,
    })
  } catch (error) {
    console.error('[GITHUB_REPOS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}

/**
 * POST /api/github/repos
 * Create a new repository.
 */
export async function POST(req: NextRequest) {
  try {
    // Must use user OAuth token — installation tokens can't call POST /user/repos
    const result = await getUserOctokit()
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { octokit } = result
    const body = await req.json()
    const { name, description, isPrivate, autoInit, gitignoreTemplate, licenseTemplate, org } = body

    if (!name) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 })
    }

    let data
    if (org) {
      const res = await octokit.repos.createInOrg({
        org,
        name,
        description: description || '',
        private: isPrivate ?? false,
        auto_init: autoInit ?? true,
        gitignore_template: gitignoreTemplate,
        license_template: licenseTemplate,
      })
      data = res.data
    } else {
      const res = await octokit.repos.createForAuthenticatedUser({
        name,
        description: description || '',
        private: isPrivate ?? false,
        auto_init: autoInit ?? true,
        gitignore_template: gitignoreTemplate,
        license_template: licenseTemplate,
      })
      data = res.data
    }

    return NextResponse.json({
      repository: {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        htmlUrl: data.html_url,
        private: data.private,
        defaultBranch: data.default_branch,
        description: data.description,
        language: data.language,
        owner: {
          login: data.owner.login,
          avatarUrl: data.owner.avatar_url,
        },
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[GITHUB_REPOS_POST]', error)

    if (error?.status === 422) {
      return NextResponse.json(
        { error: 'Repository name already exists or is invalid' },
        { status: 422 }
      )
    }
    if (error?.status === 403) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Make sure your GitHub connection has repo scope.' },
        { status: 403 }
      )
    }
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'GitHub token expired. Please reconnect GitHub from Connections.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Failed to create repository' }, { status: 500 })
  }
}
