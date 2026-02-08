import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  getInstallationOctokit,
  getUserInstallations,
  getInstallationUrl,
} from '@/lib/github-app';

export const dynamic = 'force-dynamic';

/**
 * GET /api/github/installation
 * Get the current user's GitHub App installation status and accessible repos.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const github = await db.gitHub.findFirst({
      where: {
        userId,
        connections: { some: { type: 'GitHub' } },
      },
    });

    if (!github) {
      return NextResponse.json({
        connected: false,
        installed: false,
        installUrl: getInstallationUrl(),
      });
    }

    // If we have an installation ID, fetch repos
    if (github.installationId) {
      try {
        const octokit = await getInstallationOctokit(github.installationId);
        const { data } = await octokit.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

        return NextResponse.json({
          connected: true,
          installed: true,
          installationId: github.installationId,
          username: github.username,
          repositories: data.repositories.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            private: r.private,
            htmlUrl: r.html_url,
            description: r.description,
            defaultBranch: r.default_branch,
            language: r.language,
            updatedAt: r.updated_at,
          })),
          totalCount: data.total_count,
        });
      } catch (err) {
        console.error('[GITHUB_INSTALLATION] Error fetching repos:', err);
        // Installation may have been revoked
        return NextResponse.json({
          connected: true,
          installed: false,
          username: github.username,
          installUrl: getInstallationUrl(),
          error: 'Installation access revoked. Please reinstall the app.',
        });
      }
    }

    // Connected but not installed — check if they installed it since
    try {
      const installations = await getUserInstallations(github.accessToken);
      if (installations.length > 0) {
        // Update the database with the installation
        await db.gitHub.update({
          where: { id: github.id },
          data: {
            installationId: installations[0].id,
            appSlug: installations[0].app_slug,
          },
        });

        const octokit = await getInstallationOctokit(installations[0].id);
        const { data } = await octokit.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

        return NextResponse.json({
          connected: true,
          installed: true,
          installationId: installations[0].id,
          username: github.username,
          repositories: data.repositories.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            private: r.private,
            htmlUrl: r.html_url,
            description: r.description,
            defaultBranch: r.default_branch,
            language: r.language,
            updatedAt: r.updated_at,
          })),
          totalCount: data.total_count,
        });
      }
    } catch (err) {
      console.warn('[GITHUB_INSTALLATION] Could not check installations:', err);
    }

    return NextResponse.json({
      connected: true,
      installed: false,
      username: github.username,
      installUrl: getInstallationUrl(),
    });
  } catch (error) {
    console.error('[GITHUB_INSTALLATION_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
