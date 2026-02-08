import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getInstallationOctokit } from '@/lib/github-app';

export const dynamic = 'force-dynamic';

/**
 * GET /api/github/repos
 * List repositories accessible to the authenticated user.
 * Supports ?page=1&per_page=30&sort=updated&type=all query params.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const github = await db.gitHub.findFirst({
      where: { userId },
    });

    if (!github?.installationId) {
      return NextResponse.json(
        { error: 'GitHub App not installed. Please install the app first.' },
        { status: 400 },
      );
    }

    const octokit = await getInstallationOctokit(github.installationId);
    const { data } = await octokit.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    return NextResponse.json({
      repositories: data.repositories,
      totalCount: data.total_count,
    });
  } catch (error) {
    console.error('[GITHUB_REPOS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/github/repos
 * Create a new repository.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const github = await db.gitHub.findFirst({
      where: { userId },
    });

    if (!github?.installationId) {
      return NextResponse.json(
        { error: 'GitHub App not installed. Please install the app first.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { name, description, isPrivate, autoInit, org } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 },
      );
    }

    // Use the user's OAuth token (via Octokit) to create repos
    // Installation tokens can't create repos — we need user token
    const { Octokit } = await import('@octokit/rest');
    const userOctokit = new Octokit({ auth: github.accessToken });

    let result;
    if (org) {
      const res = await userOctokit.repos.createInOrg({
        org,
        name,
        description: description || '',
        private: isPrivate ?? false,
        auto_init: autoInit ?? true,
      });
      result = res;
    } else {
      const res = await userOctokit.repos.createForAuthenticatedUser({
        name,
        description: description || '',
        private: isPrivate ?? false,
        auto_init: autoInit ?? true,
      });
      result = res;
    }

    return NextResponse.json(
      {
        repository: {
          id: result.data.id,
          name: result.data.name,
          fullName: result.data.full_name,
          htmlUrl: result.data.html_url,
          private: result.data.private,
          defaultBranch: result.data.default_branch,
          owner: {
            login: result.data.owner.login,
          },
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[GITHUB_REPOS_POST]', error);

    if (error?.status === 422) {
      return NextResponse.json(
        { error: 'Repository name already exists or is invalid' },
        { status: 422 },
      );
    }
    if (error?.status === 403) {
      return NextResponse.json(
        {
          error:
            'Insufficient permissions. The GitHub App may need additional scopes.',
        },
        { status: 403 },
      );
    }
    if (error?.status === 401) {
      return NextResponse.json(
        {
          error:
            'GitHub token expired. Please reconnect GitHub from Connections.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 },
    );
  }
}
