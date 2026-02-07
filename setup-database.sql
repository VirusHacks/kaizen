-- ==========================================
-- KAIZEN DATABASE SETUP FOR SUPABASE
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create ENUMs first
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "DepartmentRole" AS ENUM ('DEVELOPER', 'QA_TESTER', 'FINANCE', 'SALES', 'EXECUTIVE', 'PROJECT_MANAGER');
CREATE TYPE "IssueType" AS ENUM ('EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK');
CREATE TYPE "IssueStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- ==========================================
-- USER MANAGEMENT
-- ==========================================

CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "clerkId" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "profileImage" TEXT,
    "tier" TEXT DEFAULT 'Free',
    "credits" TEXT DEFAULT '10',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "localGoogleId" TEXT UNIQUE,
    "googleResourceId" TEXT UNIQUE
);

CREATE TABLE "LocalGoogleCredential" (
    "id" TEXT PRIMARY KEY,
    "accessToken" TEXT NOT NULL UNIQUE,
    "folderId" TEXT,
    "pageToken" TEXT,
    "channelId" TEXT NOT NULL UNIQUE,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL UNIQUE,
    CONSTRAINT "LocalGoogleCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ==========================================
-- INTEGRATIONS
-- ==========================================

CREATE TABLE "DiscordWebhook" (
    "id" TEXT PRIMARY KEY,
    "webhookId" TEXT NOT NULL UNIQUE,
    "url" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    CONSTRAINT "DiscordWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Slack" (
    "id" TEXT PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "authedUserId" TEXT NOT NULL,
    "authedUserToken" TEXT NOT NULL UNIQUE,
    "slackAccessToken" TEXT NOT NULL UNIQUE,
    "botUserId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Slack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Notion" (
    "id" TEXT PRIMARY KEY,
    "accessToken" TEXT NOT NULL UNIQUE,
    "workspaceId" TEXT NOT NULL UNIQUE,
    "databaseId" TEXT NOT NULL UNIQUE,
    "workspaceName" TEXT NOT NULL,
    "workspaceIcon" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Notion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "GitHub" (
    "id" TEXT PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "GitHub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Connections" (
    "id" TEXT PRIMARY KEY,
    "type" TEXT NOT NULL UNIQUE,
    "discordWebhookId" TEXT,
    "notionId" TEXT,
    "userId" TEXT,
    "slackId" TEXT,
    "githubId" TEXT,
    CONSTRAINT "Connections_discordWebhookId_fkey" FOREIGN KEY ("discordWebhookId") REFERENCES "DiscordWebhook"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Connections_notionId_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Connections_slackId_fkey" FOREIGN KEY ("slackId") REFERENCES "Slack"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Connections_githubId_fkey" FOREIGN KEY ("githubId") REFERENCES "GitHub"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Workflows" (
    "id" TEXT PRIMARY KEY,
    "nodes" TEXT,
    "edges" TEXT,
    "name" TEXT NOT NULL,
    "discordTemplate" TEXT,
    "notionTemplate" TEXT,
    "slackTemplate" TEXT,
    "slackChannels" TEXT[],
    "slackAccessToken" TEXT,
    "notionAccessToken" TEXT,
    "notionDbId" TEXT,
    "flowPath" TEXT,
    "cronPath" TEXT,
    "publish" BOOLEAN DEFAULT false,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Workflows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ==========================================
-- PROJECT MANAGEMENT
-- ==========================================

CREATE TABLE "Project" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "issueCounter" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ProjectSetup" (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL UNIQUE,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "teamSize" INTEGER,
    "techStack" TEXT,
    "vision" TEXT,
    "aiInstructions" TEXT,
    "githubRepoUrl" TEXT,
    "githubRepoName" TEXT,
    "githubRepoOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectSetup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectMember" (
    "id" TEXT PRIMARY KEY,
    "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
    "departmentRole" "DepartmentRole",
    "memberId" TEXT,
    "password" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectMember_projectId_memberId_key" ON "ProjectMember"("projectId", "memberId");
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");
CREATE INDEX "ProjectMember_memberId_idx" ON "ProjectMember"("memberId");

-- ==========================================
-- SPRINT MANAGEMENT
-- ==========================================

CREATE TABLE "Sprint" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Sprint_projectId_idx" ON "Sprint"("projectId");
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");

-- ==========================================
-- ISSUE MANAGEMENT
-- ==========================================

CREATE TABLE "Issue" (
    "id" TEXT PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "IssueType" NOT NULL DEFAULT 'TASK',
    "status" "IssueStatus" NOT NULL DEFAULT 'TODO',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    "parentId" TEXT,
    "sprintId" TEXT,
    CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("clerkId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Issue_projectId_number_key" ON "Issue"("projectId", "number");
CREATE INDEX "Issue_projectId_idx" ON "Issue"("projectId");
CREATE INDEX "Issue_assigneeId_idx" ON "Issue"("assigneeId");
CREATE INDEX "Issue_status_idx" ON "Issue"("status");
CREATE INDEX "Issue_sprintId_idx" ON "Issue"("sprintId");
CREATE INDEX "Issue_dueDate_idx" ON "Issue"("dueDate");

-- ==========================================
-- WORKFLOW ENGINE
-- ==========================================

CREATE TABLE "ProjectWorkflow" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ProjectWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectWorkflow_projectId_name_key" ON "ProjectWorkflow"("projectId", "name");
CREATE INDEX "ProjectWorkflow_projectId_idx" ON "ProjectWorkflow"("projectId");

CREATE TABLE "WorkflowStatus" (
    "id" TEXT PRIMARY KEY,
    "status" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workflowId" TEXT NOT NULL,
    CONSTRAINT "WorkflowStatus_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProjectWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkflowStatus_workflowId_status_key" ON "WorkflowStatus"("workflowId", "status");
CREATE INDEX "WorkflowStatus_workflowId_idx" ON "WorkflowStatus"("workflowId");

CREATE TABLE "WorkflowTransition" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "requiresAssignee" BOOLEAN NOT NULL DEFAULT false,
    "requiresComment" BOOLEAN NOT NULL DEFAULT false,
    "workflowId" TEXT NOT NULL,
    "fromStatusId" TEXT NOT NULL,
    "toStatusId" TEXT NOT NULL,
    "allowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "WorkflowTransition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProjectWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkflowTransition_workflowId_fromStatusId_toStatusId_key" ON "WorkflowTransition"("workflowId", "fromStatusId", "toStatusId");
CREATE INDEX "WorkflowTransition_workflowId_idx" ON "WorkflowTransition"("workflowId");
CREATE INDEX "WorkflowTransition_fromStatusId_idx" ON "WorkflowTransition"("fromStatusId");
CREATE INDEX "WorkflowTransition_toStatusId_idx" ON "WorkflowTransition"("toStatusId");

-- ==========================================
-- DASHBOARD ANALYTICS
-- ==========================================

CREATE TABLE "DashboardAnalytics" (
    "id" TEXT PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "monthlySales" JSONB,
    "aovTrend" JSONB,
    "topCountries" JSONB,
    "topProducts" JSONB,
    "topCustomers" JSONB,
    "rfmDistribution" JSONB,
    "revenueByDay" JSONB,
    "revenueByHour" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ForecastAnalytics" (
    "id" TEXT PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "periods" INTEGER NOT NULL DEFAULT 6,
    "revenueForecast" JSONB,
    "aovForecast" JSONB,
    "ordersForecast" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ==========================================
-- PRISMA MIGRATIONS TABLE
-- ==========================================

CREATE TABLE "_prisma_migrations" (
    "id" TEXT PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- ==========================================
-- SEED DATA - Test Members with Department Roles
-- ==========================================

-- First, let's insert a test user if it doesn't exist
-- Note: You'll need to replace 'your-clerk-user-id' with actual Clerk user ID
-- You can skip this and add users through your app's signup flow

-- INSERT INTO "User" ("clerkId", "name", "email", "tier", "credits", "updatedAt")
-- VALUES 
--   ('system_user', 'System User', 'system@kaizen.com', 'Free', '10', CURRENT_TIMESTAMP)
-- ON CONFLICT ("clerkId") DO NOTHING;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX "Project_key_idx" ON "Project"("key");

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

-- Note: After running this script:
-- 1. Your database schema is ready
-- 2. Run your Next.js app to authenticate with Clerk
-- 3. Create projects through the UI
-- 4. Add team members with department roles (DEV, QA, etc.)
-- 5. Upload CSV data to the sales dashboard
