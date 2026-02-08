import { Octokit } from '@octokit/rest'
import crypto from 'crypto'

// ==========================================
// GITHUB APP CONFIGURATION
// ==========================================

/**
 * Check if a full GitHub App is configured (App ID + Private Key).
 * If not, we fall back to standard OAuth App mode.
 */
export function isGitHubAppConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_CLIENT_ID &&
    process.env.GITHUB_APP_CLIENT_SECRET
  )
}

function getAppConfig() {
  const appId = process.env.GITHUB_APP_ID
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  if (!appId || !privateKey || !clientId || !clientSecret) {
    throw new Error(
      'Missing GitHub App configuration. Required: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET'
    )
  }

  return { appId, privateKey, clientId, clientSecret, webhookSecret }
}

/**
 * Get the OAuth client ID — works for both GitHub App and OAuth App mode.
 */
export function getGitHubClientId(): string {
  return (
    process.env.GITHUB_APP_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ||
    ''
  )
}

/**
 * Get the OAuth client secret — works for both modes.
 */
export function getGitHubClientSecret(): string {
  return (
    process.env.GITHUB_APP_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_GITHUB_SECRET ||
    ''
  )
}

// ==========================================
// APP-LEVEL OCTOKIT (JWT auth)
// ==========================================

/**
 * Create an Octokit instance authenticated as the GitHub App itself (JWT).
 * Used for: listing installations, getting app info.
 * Only works if the full GitHub App is configured.
 */
export async function getAppOctokit() {
  if (!isGitHubAppConfigured()) {
    throw new Error('GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, etc.')
  }

  const { createAppAuth } = await import('@octokit/auth-app')
  const { appId, privateKey, clientId, clientSecret } = getAppConfig()

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      clientId,
      clientSecret,
    },
  })
}

// ==========================================
// INSTALLATION-LEVEL OCTOKIT
// ==========================================

/**
 * Create an Octokit instance authenticated as a specific installation.
 * Used for: repo CRUD, issues, commits, PRs — everything on behalf of the user's installation.
 * Only works if the full GitHub App is configured.
 */
export async function getInstallationOctokit(installationId: number) {
  if (!isGitHubAppConfigured()) {
    throw new Error('GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, etc.')
  }

  const { createAppAuth } = await import('@octokit/auth-app')
  const { appId, privateKey, clientId, clientSecret } = getAppConfig()

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      clientId,
      clientSecret,
      installationId,
    },
  })
}

// ==========================================
// OAUTH FLOW (User-to-server tokens)
// ==========================================

/**
 * Exchange an OAuth code for a user access token.
 * Works for both GitHub App OAuth and standard OAuth App.
 */
export async function exchangeCodeForToken(code: string) {
  const clientId = getGitHubClientId()
  const clientSecret = getGitHubClientSecret()

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured. Set GITHUB_APP_CLIENT_ID/SECRET or NEXT_PUBLIC_GITHUB_CLIENT_ID/SECRET')
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number | undefined,
    tokenType: data.token_type as string,
  }
}

/**
 * Refresh a GitHub App user-to-server token using a refresh token.
 * Only works for GitHub App OAuth (not standard OAuth Apps — those don't expire).
 */
export async function refreshAccessToken(refreshToken: string) {
  const clientId = getGitHubClientId()
  const clientSecret = getGitHubClientSecret()

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured')
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`GitHub token refresh error: ${data.error_description || data.error}`)
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number | undefined,
    tokenType: data.token_type as string,
  }
}

/**
 * Get the authenticated user's profile using their access token.
 */
export async function getUserProfile(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get GitHub user profile')
  }

  return response.json()
}

/**
 * Get the user's GitHub App installations.
 */
export async function getUserInstallations(accessToken: string) {
  const response = await fetch('https://api.github.com/user/installations', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user installations')
  }

  const data = await response.json()
  return data.installations as Array<{
    id: number
    app_id: number
    app_slug: string
    target_type: string
    account: {
      login: string
      id: number
      type: string
    }
    permissions: Record<string, string>
    events: string[]
    repository_selection: string
  }>
}

// ==========================================
// WEBHOOK VERIFICATION
// ==========================================

/**
 * Verify a GitHub webhook signature (HMAC SHA-256).
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  if (!webhookSecret || !signature) {
    console.warn('[GITHUB_WEBHOOK] No webhook secret configured or no signature provided')
    return false
  }

  const sig = Buffer.from(signature)
  const hmac = crypto.createHmac('sha256', webhookSecret)
  const digest = Buffer.from(`sha256=${hmac.update(payload).digest('hex')}`)

  if (sig.length !== digest.length) return false
  return crypto.timingSafeEqual(sig, digest)
}

// ==========================================
// INSTALLATION HELPERS
// ==========================================

/**
 * List all repositories accessible to an installation.
 */
export async function getInstallationRepos(installationId: number) {
  const octokit = await getInstallationOctokit(installationId)
  const { data } = await octokit.apps.listReposAccessibleToInstallation({
    per_page: 100,
  })
  return data.repositories
}

/**
 * Get the GitHub App's installation URL for users to install/configure it.
 */
export function getInstallationUrl() {
  const appSlug = process.env.GITHUB_APP_SLUG
  if (!appSlug) {
    throw new Error('GITHUB_APP_SLUG environment variable is required')
  }
  return `https://github.com/apps/${appSlug}/installations/new`
}

/**
 * Get the OAuth authorization URL. Works for both GitHub App and OAuth App.
 */
export function getOAuthUrl(state?: string) {
  const clientId = getGitHubClientId()
  if (!clientId) {
    throw new Error('No GitHub client ID configured')
  }

  const redirectUri = process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/github`
    : 'https://localhost:3000/api/auth/callback/github'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  })

  // Standard OAuth App needs scopes explicitly; GitHub App inherits from app permissions
  if (!isGitHubAppConfigured()) {
    params.set('scope', 'repo,user,read:org')
  }

  if (state) {
    params.set('state', state)
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}
