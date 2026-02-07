'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import {
  getGitHubClient,
  getRepository,
  getRepositoryCommits,
  getCommit,
  getRepositoryIssues,
  createGitHubIssue,
  getRepositoryPullRequests,
  createPullRequest,
  getRepositoryBranches,
  createBranch,
  getRepositoryContents,
  createRepository,
  compareCommits,
} from '../../_actions/github-api'

// ==========================================
// HELPERS
// ==========================================

/**
 * Resolve the GitHub repo (owner, name) from a project's setup.
 * Returns null if the project has no linked repo.
 */
async function resolveProjectRepo(projectId: string) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      setup: true,
    },
  })

  if (!project) {
    return { error: 'Project not found or access denied', data: null }
  }

  if (!project.setup?.githubRepoOwner || !project.setup?.githubRepoName) {
    return { error: 'No GitHub repository linked to this project', data: null }
  }

  return {
    data: {
      owner: project.setup.githubRepoOwner,
      repo: project.setup.githubRepoName,
      repoUrl: project.setup.githubRepoUrl,
      projectName: project.name,
      projectKey: project.key,
    },
    error: null,
  }
}

// ==========================================
// PROJECT REPO INFO
// ==========================================

/**
 * Get the GitHub repository info for a project.
 */
export async function getProjectRepository(projectId: string) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return getRepository(owner, repo)
}

/**
 * Get GitHub connection + repo status for a project.
 */
export async function getProjectGitHubStatus(projectId: string) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      setup: true,
    },
  })

  if (!project) {
    return { error: 'Project not found', data: null }
  }

  // Check if user has GitHub connected
  const githubConnection = await db.connections.findFirst({
    where: { type: 'GitHub', userId },
    include: { GitHub: true },
  })

  const hasGitHub = !!(githubConnection?.GitHub?.accessToken)
  const hasLinkedRepo = !!(project.setup?.githubRepoOwner && project.setup?.githubRepoName)

  return {
    data: {
      isGitHubConnected: hasGitHub,
      hasLinkedRepo,
      repoOwner: project.setup?.githubRepoOwner || null,
      repoName: project.setup?.githubRepoName || null,
      repoUrl: project.setup?.githubRepoUrl || null,
    },
    error: null,
  }
}

// ==========================================
// COMMITS
// ==========================================

/**
 * Get commits for the project's linked GitHub repo.
 */
export async function getProjectCommits(
  projectId: string,
  options?: {
    sha?: string
    path?: string
    author?: string
    since?: string
    until?: string
    page?: number
    perPage?: number
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return getRepositoryCommits(owner, repo, options)
}

/**
 * Get a single commit with diff details.
 */
export async function getProjectCommit(projectId: string, commitSha: string) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return getCommit(owner, repo, commitSha)
}

/**
 * Compare two branches/commits/tags in the project's repo.
 */
export async function compareProjectCommits(
  projectId: string,
  base: string,
  head: string
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return compareCommits(owner, repo, base, head)
}

// ==========================================
// ISSUES
// ==========================================

/**
 * Get GitHub issues for the project's linked repo.
 */
export async function getProjectGitHubIssues(
  projectId: string,
  options?: {
    state?: 'open' | 'closed' | 'all'
    labels?: string
    assignee?: string
    page?: number
    perPage?: number
    sort?: 'created' | 'updated' | 'comments'
    direction?: 'asc' | 'desc'
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: options?.state || 'open',
      labels: options?.labels,
      assignee: options?.assignee,
      sort: options?.sort || 'updated',
      direction: options?.direction || 'desc',
      per_page: options?.perPage || 30,
      page: options?.page || 1,
    })

    // Filter out pull requests (GitHub API includes PRs as issues)
    const issuesOnly = data.filter((item) => !item.pull_request)

    return { data: issuesOnly, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_GITHUB_ISSUES]', error)
    return { data: null, error: 'Failed to fetch GitHub issues' }
  }
}

/**
 * Get a single GitHub issue by number.
 */
export async function getProjectGitHubIssue(projectId: string, issueNumber: number) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_GITHUB_ISSUE]', error)
    return { data: null, error: 'Failed to fetch GitHub issue' }
  }
}

/**
 * Create a new GitHub issue in the project's repo.
 */
export async function createProjectGitHubIssue(
  projectId: string,
  options: {
    title: string
    body?: string
    labels?: string[]
    assignees?: string[]
    milestone?: number
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      labels: options.labels,
      assignees: options.assignees,
      milestone: options.milestone,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[CREATE_PROJECT_GITHUB_ISSUE]', error)
    return { data: null, error: 'Failed to create GitHub issue' }
  }
}

/**
 * Update a GitHub issue in the project's repo.
 */
export async function updateProjectGitHubIssue(
  projectId: string,
  issueNumber: number,
  options: {
    title?: string
    body?: string
    state?: 'open' | 'closed'
    labels?: string[]
    assignees?: string[]
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...options,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[UPDATE_PROJECT_GITHUB_ISSUE]', error)
    return { data: null, error: 'Failed to update GitHub issue' }
  }
}

/**
 * Get comments on a GitHub issue.
 */
export async function getProjectIssueComments(projectId: string, issueNumber: number) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_ISSUE_COMMENTS]', error)
    return { data: null, error: 'Failed to fetch issue comments' }
  }
}

/**
 * Add a comment to a GitHub issue.
 */
export async function addProjectIssueComment(
  projectId: string,
  issueNumber: number,
  body: string
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[ADD_PROJECT_ISSUE_COMMENT]', error)
    return { data: null, error: 'Failed to add comment' }
  }
}

// ==========================================
// PULL REQUESTS
// ==========================================

/**
 * Get pull requests for the project's linked repo.
 */
export async function getProjectPullRequests(
  projectId: string,
  options?: {
    state?: 'open' | 'closed' | 'all'
    page?: number
    perPage?: number
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: options?.state || 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: options?.perPage || 30,
      page: options?.page || 1,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_PRS]', error)
    return { data: null, error: 'Failed to fetch pull requests' }
  }
}

/**
 * Get a single pull request by number.
 */
export async function getProjectPullRequest(projectId: string, prNumber: number) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })
    return { data, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_PR]', error)
    return { data: null, error: 'Failed to fetch pull request' }
  }
}

/**
 * Create a pull request in the project's repo.
 */
export async function createProjectPullRequest(
  projectId: string,
  options: {
    title: string
    body?: string
    head: string
    base: string
    draft?: boolean
  }
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return createPullRequest(owner, repo, options)
}

// ==========================================
// BRANCHES
// ==========================================

/**
 * Get branches for the project's linked repo.
 */
export async function getProjectBranches(projectId: string) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return getRepositoryBranches(owner, repo)
}

/**
 * Create a branch in the project's linked repo.
 */
export async function createProjectBranch(
  projectId: string,
  branchName: string,
  fromBranch = 'main'
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return createBranch(owner, repo, branchName, fromBranch)
}

// ==========================================
// REPO CONTENTS
// ==========================================

/**
 * Get file/folder contents from the project's linked repo.
 */
export async function getProjectRepoContents(
  projectId: string,
  path = '',
  ref?: string
) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data
  return getRepositoryContents(owner, repo, path, ref)
}

// ==========================================
// LINK / UNLINK REPO
// ==========================================

/**
 * Link an existing GitHub repo to a project.
 */
export async function linkGitHubRepoToProject(
  projectId: string,
  repoUrl: string
) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  // Verify ownership
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    include: { setup: true },
  })

  if (!project) {
    return { error: 'Project not found or access denied', data: null }
  }

  // Parse the URL
  let owner: string, repo: string
  try {
    const parsed = new URL(repoUrl)
    if (parsed.hostname !== 'github.com') {
      return { error: 'Not a GitHub URL', data: null }
    }
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) {
      return { error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo', data: null }
    }
    owner = parts[0]
    repo = parts[1].replace(/\.git$/, '')
  } catch {
    return { error: 'Invalid URL', data: null }
  }

  // Verify we can access the repo
  const repoResult = await getRepository(owner, repo)
  if (!repoResult.data) {
    return { error: `Cannot access repository: ${repoResult.error}`, data: null }
  }

  // Update or create project setup
  if (project.setup) {
    await db.projectSetup.update({
      where: { id: project.setup.id },
      data: {
        githubRepoUrl: repoResult.data.html_url,
        githubRepoName: repoResult.data.name,
        githubRepoOwner: repoResult.data.owner.login,
      },
    })
  } else {
    await db.projectSetup.create({
      data: {
        projectId,
        githubRepoUrl: repoResult.data.html_url,
        githubRepoName: repoResult.data.name,
        githubRepoOwner: repoResult.data.owner.login,
      },
    })
  }

  return {
    data: {
      repoUrl: repoResult.data.html_url,
      repoName: repoResult.data.name,
      repoOwner: repoResult.data.owner.login,
    },
    error: null,
  }
}

/**
 * Unlink GitHub repo from a project.
 */
export async function unlinkGitHubRepoFromProject(projectId: string) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    include: { setup: true },
  })

  if (!project) {
    return { error: 'Project not found or access denied', data: null }
  }

  if (project.setup) {
    await db.projectSetup.update({
      where: { id: project.setup.id },
      data: {
        githubRepoUrl: null,
        githubRepoName: null,
        githubRepoOwner: null,
      },
    })
  }

  return { data: { success: true }, error: null }
}

/**
 * Create a new GitHub repo and link it to the project.
 */
export async function createAndLinkGitHubRepo(
  projectId: string,
  options: {
    name: string
    description?: string
    isPrivate?: boolean
  }
) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    include: { setup: true },
  })

  if (!project) {
    return { error: 'Project not found or access denied', data: null }
  }

  // Create the repo
  const result = await createRepository({
    name: options.name,
    description: options.description || `Project: ${project.name}`,
    isPrivate: options.isPrivate ?? false,
    autoInit: true,
  })

  if (!result.data) {
    return { error: result.error || 'Failed to create repository', data: null }
  }

  // Link it to the project
  if (project.setup) {
    await db.projectSetup.update({
      where: { id: project.setup.id },
      data: {
        githubRepoUrl: result.data.html_url,
        githubRepoName: result.data.name,
        githubRepoOwner: result.data.owner.login,
      },
    })
  } else {
    await db.projectSetup.create({
      data: {
        projectId,
        githubRepoUrl: result.data.html_url,
        githubRepoName: result.data.name,
        githubRepoOwner: result.data.owner.login,
      },
    })
  }

  return {
    data: {
      repoUrl: result.data.html_url,
      repoName: result.data.name,
      repoOwner: result.data.owner.login,
      fullName: result.data.full_name,
    },
    error: null,
  }
}

// ==========================================
// ACTIVITY SUMMARY
// ==========================================

/**
 * Get a combined activity summary for the project's repo.
 * Useful for dashboards — returns recent commits, open issues, and open PRs.
 */
export async function getProjectRepoActivity(projectId: string) {
  const resolved = await resolveProjectRepo(projectId)
  if (resolved.error || !resolved.data) {
    return { data: null, error: resolved.error }
  }

  const { owner, repo } = resolved.data

  try {
    const octokit = await getGitHubClient()

    // Fetch in parallel
    const [commitsResult, issuesResult, prsResult, repoResult] = await Promise.all([
      octokit.repos.listCommits({
        owner,
        repo,
        per_page: 10,
      }).catch(() => ({ data: [] })),
      octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 10,
        sort: 'updated',
        direction: 'desc',
      }).catch(() => ({ data: [] })),
      octokit.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 10,
        sort: 'updated',
        direction: 'desc',
      }).catch(() => ({ data: [] })),
      octokit.repos.get({ owner, repo }).catch(() => ({ data: null })),
    ])

    // Filter out PRs from issues
    const issuesOnly = issuesResult.data.filter((item: any) => !item.pull_request)

    return {
      data: {
        repo: repoResult.data
          ? {
              name: repoResult.data.name,
              fullName: repoResult.data.full_name,
              htmlUrl: repoResult.data.html_url,
              defaultBranch: repoResult.data.default_branch,
              stargazersCount: repoResult.data.stargazers_count,
              forksCount: repoResult.data.forks_count,
              openIssuesCount: repoResult.data.open_issues_count,
              language: repoResult.data.language,
              updatedAt: repoResult.data.updated_at,
            }
          : null,
        recentCommits: commitsResult.data.map((c: any) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name,
          authorLogin: c.author?.login,
          authorAvatar: c.author?.avatar_url,
          date: c.commit.author?.date,
          url: c.html_url,
        })),
        openIssues: issuesOnly.map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          labels: i.labels.map((l: any) => ({ name: l.name, color: l.color })),
          assignee: i.assignee?.login,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          url: i.html_url,
        })),
        openPullRequests: prsResult.data.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login,
          authorAvatar: pr.user?.avatar_url,
          head: pr.head.ref,
          base: pr.base.ref,
          draft: pr.draft,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          url: pr.html_url,
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET_PROJECT_REPO_ACTIVITY]', error)
    return { data: null, error: 'Failed to fetch repo activity' }
  }
}
