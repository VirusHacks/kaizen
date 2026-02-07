# Commando-AI MCP Server

Connect your IDE assistant (Claude Code, GitHub Copilot, Cursor) directly to your Commando-AI project management data.

## 26 Tools Available

### Project Context (4 tools)
- `list_projects` — List all your projects
- `get_project_context` — Full project details, tech stack, vision, team
- `get_coding_standards` — AI instructions, tech stack, vision
- `get_team_members` — Project members with roles

### Task Management (8 tools)
- `get_my_tasks` — Your assigned tasks (filterable by status/priority)
- `get_task_details` — Full task details with subtasks, parent, tech context
- `find_task_by_key` — Find task by key like `PROJ-42`
- `update_task_status` — Move task between TODO/IN_PROGRESS/IN_REVIEW/DONE
- `update_task_description` — Add implementation notes to a task
- `search_tasks` — Search tasks by title/description
- `create_task` — Create new task, bug, subtask
- `get_all_tasks` — All tasks grouped by status

### Sprint Management (3 tools)
- `get_sprints` — All sprints with progress
- `get_active_sprint` — Current sprint tasks and deadline
- `get_backlog` — Unplanned tasks

### Workflow (2 tools)
- `get_allowed_transitions` — Valid status transitions from current status
- `get_workflow` — Full workflow definition

### AI-Powered (4 tools)
- `generate_implementation_plan` — Step-by-step plan for a task (architecture, files, DB, testing)
- `ask_project_question` — Ask anything about the project/codebase
- `generate_test_cases` — Generate test scenarios for a task
- `check_acceptance_criteria` — Generate verification checklist

### Productivity (5 tools)
- `get_my_stats` — Personal dashboard stats
- `generate_standup` — Auto-generate daily standup summary
- `get_branch_name` — Git branch name for a task (`feature/PROJ-123-add-auth`)
- `get_commit_message` — Conventional commit message with task key
- `get_next_task` — Smartly suggest next task (overdue → critical → sprint → priority)

## Setup

### Build
```bash
cd mcp-server
npm install
npx prisma generate
npm run build
```

### VS Code / GitHub Copilot
Add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "commando-ai": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Desktop
Add to `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "commando-ai": {
      "command": "node",
      "args": ["C:\\path\\to\\Commando-AI\\mcp-server\\dist\\index.js"]
    }
  }
}
```

### Claude Code (CLI)
```bash
claude mcp add commando-ai node /path/to/Commando-AI/mcp-server/dist/index.js
```

### Cursor
Add to Cursor Settings → MCP Servers:
```json
{
  "commando-ai": {
    "command": "node",
    "args": ["/path/to/Commando-AI/mcp-server/dist/index.js"]
  }
}
```

## Example Workflows

### Start working on a task
```
"What tasks are assigned to me?" → get_my_tasks
"Show details for PROJ-42" → find_task_by_key → get_task_details
"Generate implementation plan" → generate_implementation_plan
"Create a branch" → get_branch_name
"Move to in progress" → update_task_status
```

### Daily standup
```
"Generate my standup" → generate_standup
```

### Find what to work on next
```
"What should I work on next?" → get_next_task
```

### Create a commit
```
"Generate commit message for adding user auth" → get_commit_message
```
