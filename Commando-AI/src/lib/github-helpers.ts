import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Octokit } from '@octokit/rest'
import { getInstallationOctokit, isGitHubAppConfigured, refreshAccessToken } from '@/lib/github-app'

export type GitHubRecord = {
  id: string
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
  username: string
  installationId: number | null
  appSlug: string | null
  userId: string
}

export type AuthResult =
  | { octokit: Octokit; userId: string; github: GitHubRecord; error?: never; status?: never }
  | { octokit?: never; userId?: never; github?: never; error: string; status: number }

/**
 * Check if a token is expired or about to expire (within 5 minutes).
 */
function isTokenExpired(github: GitHubRecord): boolean {
  if (!github.tokenExpiresAt) return false // No expiry = standard OAuth, doesn't expire
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  return github.tokenExpiresAt < fiveMinutesFromNow
}

/**
 * Get a valid access token, refreshing if expired.
 * Returns the updated access token string.
 */
async function getValidAccessToken(github: GitHubRecord): Promise<string> {
  if (!isTokenExpired(github)) {
    return github.accessToken
  }

  // Token expired — try to refresh
  if (!github.refreshToken) {
    console.warn('[GITHUB_HELPER] Token expired but no refresh token available')
    return github.accessToken // Return stale token, let it fail naturally
  }

  try {
    console.log('[GITHUB_HELPER] Refreshing expired token for user:', github.userId)
    const newTokens = await refreshAccessToken(github.refreshToken)

    // Calculate new expiry
    const tokenExpiresAt = newTokens.expiresIn
      ? new Date(Date.now() + newTokens.expiresIn * 1000)
      : null

    // Update the database with new tokens
    await db.gitHub.update({
      where: { id: github.id },
      data: {
        accessToken: newTokens.accessToken,
        ...(newTokens.refreshToken ? { refreshToken: newTokens.refreshToken } : {}),
        tokenExpiresAt,
      },
    })

    return newTokens.accessToken
  } catch (err) {
    console.error('[GITHUB_HELPER] Token refresh failed:', err)
    return github.accessToken // Return stale token, let it fail naturally
  }
}

/**
 * Shared helper for API routes — gets an authenticated Octokit instance.
 * Prefers GitHub App installation token, falls back to user's OAuth token.
 * Automatically refreshes expired tokens.
 *
 * Usage:
 *   const result = await getAuthenticatedOctokit()
 *   if ('error' in result) {
 *     return NextResponse.json({ error: result.error }, { status: result.status })
 *   }
 *   const { octokit, userId, github } = result
 */
export async function getAuthenticatedOctokit(): Promise<AuthResult> {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'Unauthorized', status: 401 }
  }

  const github = await db.gitHub.findFirst({
    where: { userId },
  })

  if (!github) {
    return { error: 'GitHub not connected. Please connect GitHub from the Connections page.', status: 400 }
  }

  // Try installation token first (GitHub App mode)
  if (github.installationId && isGitHubAppConfigured()) {
    try {
      const octokit = await getInstallationOctokit(github.installationId)
      return { octokit, userId, github }
    } catch (err) {
      console.warn('[GITHUB_HELPER] Installation token failed, falling back to OAuth:', err)
    }
  }

  // Fall back to user's OAuth token (with auto-refresh)
  const accessToken = await getValidAccessToken(github)
  if (!accessToken) {
    return { error: 'No GitHub access token found. Please reconnect GitHub.', status: 401 }
  }

  const octokit = new Octokit({ auth: accessToken })
  return { octokit, userId, github }
}

/**
 * Get an Octokit instance using the user's OAuth token ONLY (never installation token).
 * Required for endpoints that don't work with installation tokens, such as:
 *   - POST /user/repos (create repo for authenticated user)
 *   - DELETE /repos/{owner}/{repo}
 *   - Any endpoint scoped to the user rather than an installation
 * Automatically refreshes expired tokens.
 */
export async function getUserOctokit(): Promise<AuthResult> {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'Unauthorized', status: 401 }
  }

  const github = await db.gitHub.findFirst({
    where: { userId },
  })

  if (!github) {
    return { error: 'GitHub not connected. Please connect GitHub from the Connections page.', status: 400 }
  }

  const accessToken = await getValidAccessToken(github)
  if (!accessToken) {
    return { error: 'No GitHub access token found. Please reconnect GitHub.', status: 401 }
  }

  const octokit = new Octokit({ auth: accessToken })
  return { octokit, userId, github }
}
