'use server'

import { auth } from '@clerk/nextjs/server'
import { getGitHubConnection } from '../connections/_actions/github-connection'
import { Octokit } from '@octokit/rest'
import { isGitHubAppConfigured, getInstallationOctokit, refreshAccessToken } from '@/lib/github-app'
import { db } from '@/lib/db'

// ==========================================
// CLIENT SETUP
// ==========================================

/**
 * Refresh token if expired, return a valid access token.
 */
async function getValidToken(github: { id: string; accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null; userId: string }): Promise<string> {
  // If no expiry set, token doesn't expire (standard OAuth)
  if (!github.tokenExpiresAt) return github.accessToken

  // Check if expired (with 5min buffer)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (github.tokenExpiresAt > fiveMinFromNow) return github.accessToken

  // Token expired — refresh it
  if (!github.refreshToken) {
    console.warn('[GITHUB_CLIENT] Token expired but no refresh token')
    return github.accessToken
  }

  try {
    console.log('[GITHUB_CLIENT] Refreshing expired token for:', github.userId)
    const newTokens = await refreshAccessToken(github.refreshToken)
    const tokenExpiresAt = newTokens.expiresIn
      ? new Date(Date.now() + newTokens.expiresIn * 1000)
      : null

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
    console.error('[GITHUB_CLIENT] Token refresh failed:', err)
    return github.accessToken
  }
}

/**
 * Get authenticated Octokit client for the current user.
 * Prefers GitHub App installation token if available, falls back to user OAuth token.
 * Auto-refreshes expired tokens.
 * Use this for read operations (list repos, get issues, etc.).
 */
export async function getGitHubClient() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const github = await getGitHubConnection(userId)
  
  if (!github) {
    throw new Error('GitHub not connected. Please connect GitHub from the Connections page.')
  }

  // Use installation token if available AND GitHub App is configured
  if (github.installationId && isGitHubAppConfigured()) {
    try {
      return await getInstallationOctokit(github.installationId)
    } catch (err) {
      console.warn('[GITHUB_CLIENT] Failed to get installation octokit, falling back to user token:', err)
    }
  }

  // Fall back to user's personal access token (OAuth App flow) with auto-refresh
  const accessToken = await getValidToken(github)
  if (!accessToken) {
    throw new Error('No GitHub access token found. Please reconnect GitHub.')
  }

  return new Octokit({
    auth: accessToken,
  })
}

/**
 * Get Octokit client using ONLY the user's OAuth token (never installation token).
 * Required for user-scoped endpoints that don't work with installation tokens:
 *   - POST /user/repos (create repo)
 *   - DELETE /repos/{owner}/{repo}
 * Auto-refreshes expired tokens.
 */
export async function getUserOctokitClient() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const github = await getGitHubConnection(userId)
  
  if (!github) {
    throw new Error('GitHub not connected. Please connect GitHub from the Connections page.')
  }

  const accessToken = await getValidToken(github)
  if (!accessToken) {
    throw new Error('No GitHub access token found. Please reconnect GitHub.')
  }

  return new Octokit({
    auth: accessToken,
  })
}

// ==========================================
// USER / PROFILE
// ==========================================

/**
 * Get user's GitHub profile
 */
export async function getGitHubProfile() {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.users.getAuthenticated()
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_PROFILE]', error)
    return { data: null, error: 'Failed to fetch profile' }
  }
}

// ==========================================
// REPOSITORIES — READ
// ==========================================

/**
 * Get user's GitHub repositories
 */
export async function getGitHubRepositories(page = 1, perPage = 30) {
  try {
    const octokit = await getGitHubClient()
    
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    })

    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_REPOS]', error)
    return { data: null, error: 'Failed to fetch repositories' }
  }
}

/**
 * Get repository details
 */
export async function getRepository(owner: string, repo: string) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.get({ owner, repo })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_REPO]', error)
    return { data: null, error: 'Failed to fetch repository' }
  }
}

/**
 * Get repository branches
 */
export async function getRepositoryBranches(owner: string, repo: string) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_BRANCHES]', error)
    return { data: null, error: 'Failed to fetch branches' }
  }
}

/**
 * Get repository contents (files/folders) at a given path
 */
export async function getRepositoryContents(
  owner: string,
  repo: string,
  path = '',
  ref?: string
) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_CONTENTS]', error)
    return { data: null, error: 'Failed to fetch repository contents' }
  }
}

/**
 * Search repositories accessible to the authenticated user
 */
export async function searchRepositories(query: string) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.search.repos({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 20,
    })
    return { data: data.items, total: data.total_count, error: null }
  } catch (error) {
    console.error('[SEARCH_GITHUB_REPOS]', error)
    return { data: null, total: 0, error: 'Failed to search repositories' }
  }
}

// ==========================================
// REPOSITORIES — CREATE / UPDATE / DELETE
// ==========================================

/**
 * Create a new GitHub repository
 */
export async function createRepository(options: {
  name: string
  description?: string
  isPrivate?: boolean
  autoInit?: boolean
  gitignoreTemplate?: string
  licenseTemplate?: string
}) {
  try {
    // Must use user OAuth token — installation tokens can't create repos
    const octokit = await getUserOctokitClient()
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: options.name,
      description: options.description,
      private: options.isPrivate ?? false,
      auto_init: options.autoInit ?? true,
      gitignore_template: options.gitignoreTemplate,
      license_template: options.licenseTemplate,
    })
    return { data, error: null }
  } catch (error: any) {
    console.error('[CREATE_GITHUB_REPO]', error?.status, error?.message, error?.response?.data)
    const msg =
      error?.status === 422
        ? 'Repository name already exists or is invalid'
        : error?.status === 403
          ? 'Insufficient permissions. Make sure your GitHub connection has repo scope.'
          : error?.status === 401
            ? 'GitHub token expired. Please reconnect GitHub from Connections.'
            : `Failed to create repository: ${error?.message || 'Unknown error'}`
    return { data: null, error: msg }
  }
}

/**
 * Create a repository under an organization
 */
export async function createOrgRepository(
  org: string,
  options: {
    name: string
    description?: string
    isPrivate?: boolean
    autoInit?: boolean
  }
) {
  try {
    // Must use user OAuth token — installation tokens can't create org repos
    const octokit = await getUserOctokitClient()
    const { data } = await octokit.repos.createInOrg({
      org,
      name: options.name,
      description: options.description,
      private: options.isPrivate ?? false,
      auto_init: options.autoInit ?? true,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_ORG_GITHUB_REPO]', error)
    return { data: null, error: 'Failed to create organization repository' }
  }
}

/**
 * Delete a repository (use with caution!)
 */
export async function deleteRepository(owner: string, repo: string) {
  try {
    // Must use user OAuth token — installation tokens can't delete repos
    const octokit = await getUserOctokitClient()
    await octokit.repos.delete({ owner, repo })
    return { success: true, error: null }
  } catch (error) {
    console.error('[DELETE_GITHUB_REPO]', error)
    return { success: false, error: 'Failed to delete repository' }
  }
}

// ==========================================
// COMMITS — READ
// ==========================================

/**
 * Get commits for a repository (optionally filtered by branch/path/author)
 */
export async function getRepositoryCommits(
  owner: string,
  repo: string,
  options?: {
    sha?: string      // branch name or commit SHA
    path?: string     // only commits affecting this file path
    author?: string   // GitHub username or email
    since?: string    // ISO 8601 date
    until?: string    // ISO 8601 date
    page?: number
    perPage?: number
  }
) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: options?.sha,
      path: options?.path,
      author: options?.author,
      since: options?.since,
      until: options?.until,
      per_page: options?.perPage ?? 30,
      page: options?.page ?? 1,
    })
    return { data, error: null }
  } catch (error: any) {
    console.error('[GET_GITHUB_COMMITS]', error)
    
    // Handle empty repository (409 status)
    if (error?.status === 409 && error?.message?.includes('empty')) {
      return { data: [], error: null }
    }
    
    return { data: null, error: 'Failed to fetch commits' }
  }
}

/**
 * Get a single commit by SHA (includes diff/patch info)
 */
export async function getCommit(owner: string, repo: string, ref: string) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.getCommit({ owner, repo, ref })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_COMMIT]', error)
    return { data: null, error: 'Failed to fetch commit' }
  }
}

/**
 * Compare two commits, branches, or tags
 */
export async function compareCommits(
  owner: string,
  repo: string,
  base: string,
  head: string
) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[COMPARE_GITHUB_COMMITS]', error)
    return { data: null, error: 'Failed to compare commits' }
  }
}

// ==========================================
// COMMITS — CREATE (file operations)
// ==========================================

/**
 * Create or update a file in a repository (creates a commit)
 */
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  options: {
    message: string
    content: string       // plain text — will be base64-encoded automatically
    branch?: string
    sha?: string          // required when updating an existing file
    committerName?: string
    committerEmail?: string
  }
) {
  try {
    const octokit = await getGitHubClient()

    // Base64 encode the content
    const encodedContent = Buffer.from(options.content).toString('base64')

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: options.message,
      content: encodedContent,
      branch: options.branch,
      sha: options.sha,
      ...(options.committerName && options.committerEmail
        ? {
            committer: {
              name: options.committerName,
              email: options.committerEmail,
            },
          }
        : {}),
    })

    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_UPDATE_GITHUB_FILE]', error)
    return { data: null, error: 'Failed to create/update file' }
  }
}

/**
 * Delete a file from a repository (creates a commit)
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  options: {
    message: string
    sha: string           // SHA of the file blob to delete
    branch?: string
  }
) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: options.message,
      sha: options.sha,
      branch: options.branch,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[DELETE_GITHUB_FILE]', error)
    return { data: null, error: 'Failed to delete file' }
  }
}

/**
 * Create a multi-file commit using the Git Data API (tree + commit)
 * Useful for committing multiple files at once.
 */
export async function createMultiFileCommit(
  owner: string,
  repo: string,
  options: {
    branch: string
    message: string
    files: Array<{
      path: string
      content: string
    }>
  }
) {
  try {
    const octokit = await getGitHubClient()

    // 1. Get the reference (branch)
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${options.branch}`,
    })
    const latestCommitSha = ref.object.sha

    // 2. Get the tree of the latest commit
    const { data: latestCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    })

    // 3. Create blobs for each file
    const blobPromises = options.files.map((file) =>
      octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      })
    )
    const blobs = await Promise.all(blobPromises)

    // 4. Create a new tree
    const tree = options.files.map((file, index) => ({
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blobs[index].data.sha,
    }))

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: latestCommit.tree.sha,
      tree,
    })

    // 5. Create the commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: options.message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    })

    // 6. Update the reference to point to the new commit
    const { data: updatedRef } = await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${options.branch}`,
      sha: newCommit.sha,
    })

    return {
      data: {
        commit: newCommit,
        ref: updatedRef,
      },
      error: null,
    }
  } catch (error) {
    console.error('[CREATE_MULTI_FILE_COMMIT]', error)
    return { data: null, error: 'Failed to create multi-file commit' }
  }
}

// ==========================================
// ISSUES
// ==========================================

/**
 * Get repository issues
 */
export async function getRepositoryIssues(owner: string, repo: string) {
  try {
    const octokit = await getGitHubClient()
    
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 30,
    })

    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_ISSUES]', error)
    return { data: null, error: 'Failed to fetch issues' }
  }
}

/**
 * Create a new issue in a repository
 */
export async function createGitHubIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
) {
  try {
    const octokit = await getGitHubClient()
    
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    })

    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_GITHUB_ISSUE]', error)
    return { data: null, error: 'Failed to create issue' }
  }
}

// ==========================================
// PULL REQUESTS
// ==========================================

/**
 * Get repository pull requests
 */
export async function getRepositoryPullRequests(owner: string, repo: string) {
  try {
    const octokit = await getGitHubClient()
    
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 30,
    })

    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_PRS]', error)
    return { data: null, error: 'Failed to fetch pull requests' }
  }
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  options: {
    title: string
    body?: string
    head: string         // branch with changes
    base: string         // branch to merge into (e.g. 'main')
    draft?: boolean
  }
) {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
      draft: options.draft,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_GITHUB_PR]', error)
    return { data: null, error: 'Failed to create pull request' }
  }
}

// ==========================================
// BRANCHES
// ==========================================

/**
 * Create a new branch from an existing ref
 */
export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch = 'main'
) {
  try {
    const octokit = await getGitHubClient()

    // Get the SHA of the source branch
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    })

    // Create the new branch
    const { data } = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })

    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_GITHUB_BRANCH]', error)
    return { data: null, error: 'Failed to create branch' }
  }
}

// ==========================================
// ORGANIZATIONS
// ==========================================

/**
 * Get organizations the authenticated user belongs to
 */
export async function getUserOrganizations() {
  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.orgs.listForAuthenticatedUser()
    return { data, error: null }
  } catch (error) {
    console.error('[GET_GITHUB_ORGS]', error)
    return { data: null, error: 'Failed to fetch organizations' }
  }
}
