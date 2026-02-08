import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getInstallationOctokit } from '@/lib/github-app';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ owner: string; repo: string }> };

/**
 * GET /api/github/repos/[owner]/[repo]/commits
 * List commits for a repository.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner, repo } = await params;
    const { searchParams } = new URL(req.url);
    const sha = searchParams.get('sha') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '30');

    const github = await db.gitHub.findFirst({ where: { userId } });

    if (!github?.installationId) {
      return NextResponse.json(
        { error: 'GitHub App not installed' },
        { status: 400 },
      );
    }

    const octokit = await getInstallationOctokit(github.installationId);
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha,
      per_page: perPage,
      page,
    });

    return NextResponse.json({ commits: data });
  } catch (error) {
    console.error('[GITHUB_COMMITS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch commits' },
      { status: 500 },
    );
  }
}
