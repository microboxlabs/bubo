# Bubo

An enterprise AI coding agent with deep GitHub integration. Bubo automates software development workflows by orchestrating AI-powered coding sessions that integrate seamlessly with GitHub Issues, Projects, and Pull Requests.

## Overview

Bubo implements an iterative agent loop inspired by the "Ralph Wiggum" approach:

1. **Pick a task** from your GitHub Project board (matching your configured triggers)
2. **Execute** using Claude Code with clear stop conditions
3. **Commit** changes with passing CI
4. **Report progress** and update task status
5. **Repeat** until the task is complete

```
┌─────────────────────────────────────────────────────────────┐
│                      BUBO AGENT LOOP                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐  │
│   │  Fetch  │───▶│ Execute │───▶│  Test   │───▶│ Commit │  │
│   │  Task   │    │  Code   │    │   CI    │    │  Push  │  │
│   └─────────┘    └─────────┘    └─────────┘    └────────┘  │
│        ▲                                            │       │
│        │         ┌─────────┐                        │       │
│        └─────────│ Update  │◀───────────────────────┘       │
│                  │  Task   │                                │
│                  └─────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Configurable Workflow**: Adapts to your existing GitHub workflow (columns, labels, triggers)
- **GitHub-Native**: Deep integration with Issues, Projects (v2), and Pull Requests
- **Multiple Triggers**: Run as CLI, GitHub Action, or webhook service
- **AI-Powered**: Uses Claude Code for intelligent code generation
- **CI-Aware**: Ensures all commits pass tests and type checks
- **Progress Tracking**: Maintains detailed logs and updates GitHub status

## Installation

### Prerequisites

- Node.js 20+
- GitHub Personal Access Token with `repo` and `project` scopes
- Claude Code CLI (for AI execution)

### From npm

```bash
pnpm add -g bubo
```

### From Source

```bash
git clone https://github.com/microboxlabs/bubo.git
cd bubo
pnpm install
pnpm build
pnpm link --global
```

### Docker

```bash
docker pull ghcr.io/microboxlabs/bubo:latest

# Or build locally
docker build -t bubo -f docker/Dockerfile .
```

## Quick Start

```bash
# 1. Set up environment
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
export GITHUB_OWNER=your-org
export GITHUB_REPO=your-repo

# 2. Initialize configuration
bubo init

# 3. Validate setup
bubo config validate

# 4. Create required labels
bubo config setup-labels

# 5. Run on an issue
bubo run --issue 42
```

## Configuration

Bubo uses a YAML configuration file to adapt to your company's GitHub workflow.

### Initialize Configuration

```bash
bubo init --owner myorg --repo myrepo --project 1
```

This creates `.bubo/workflow.yml`:

```yaml
version: 1

github:
  owner: myorg
  repo: myrepo
  project: 1  # GitHub Project number (optional)

workflow:
  # Map your project board columns
  columns:
    backlog: "Backlog"
    ready: "Ready for Development"
    in_progress: "In Progress"
    review: "In Review"
    done: "Done"

  # Define when Bubo picks up tasks
  triggers:
    pickup:
      column: "Ready for Development"
      labels:
        - "bubo:ready"
      exclude_labels:
        - "bubo:blocked"
        - "bubo:in-progress"

  # Labels Bubo applies to indicate status
  labels:
    in_progress: "bubo:in-progress"
    blocked: "bubo:blocked"
    complete: "bubo:complete"

# Agent behavior settings
agent:
  max_iterations: 10
  branch_prefix: "bubo/"
  commit_prefix: "[bubo]"
  dry_run: false
```

### Environment Variables

Environment variables override configuration file values:

```bash
# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Optional (can also be in config file)
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
BUBO_PROJECT_NUMBER=1
BUBO_MAX_ITERATIONS=10
BUBO_DRY_RUN=false
```

### Validate Configuration

```bash
# Check config file and GitHub access
bubo config validate --verbose

# Show current configuration
bubo config show

# Create required labels in GitHub
bubo config setup-labels
```

## Usage

### CLI Commands

```bash
# Run on a specific issue
bubo run --issue 42

# Run on the next available task from project board
bubo run

# Dry run (plan without executing)
bubo run --dry-run

# Check Bubo status
bubo status

# Configuration commands
bubo config validate    # Validate configuration
bubo config show        # Show current config
bubo config setup-labels # Create required labels
```

### GitHub Action

```yaml
name: Bubo Agent

on:
  issues:
    types: [labeled]
  issue_comment:
    types: [created]

jobs:
  bubo:
    if: github.event.label.name == 'bubo:ready'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: microboxlabs/bubo@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          issue-number: ${{ github.event.issue.number }}
```

### Programmatic API

```typescript
import { BuboAgent } from 'bubo';
import { loadConfig } from 'bubo/config';

const config = await loadConfig(process.cwd());
const agent = new BuboAgent(config);

// Run on specific issue
await agent.runOnIssue(42);

// Run on next available task
await agent.runOnNextTask();

// Run on issues with trigger labels (no project board)
await agent.runOnLabeledIssues();
```

## Workflow Integration

### How Task Pickup Works

1. Bubo looks for issues that match **all** trigger conditions:
   - In the configured `ready` column (if using GitHub Projects)
   - Has all required `labels` (e.g., `bubo:ready`)
   - Does not have any `exclude_labels` (e.g., `bubo:in-progress`)

2. When Bubo starts working:
   - Removes the trigger label (`bubo:ready`)
   - Adds the in-progress label (`bubo:in-progress`)
   - Moves task to `in_progress` column

3. When Bubo completes:
   - Removes status labels
   - Adds complete label (`bubo:complete`)
   - Moves task to `done` column

### Example Workflow

| Step | Column | Labels | Action |
|------|--------|--------|--------|
| 1. Human creates issue | Backlog | - | Issue created |
| 2. Human reviews & approves | Ready for Development | `bubo:ready` | Ready for Bubo |
| 3. Bubo picks up | In Progress | `bubo:in-progress` | Working |
| 4. Bubo completes | Done | `bubo:complete` | Finished |

### Customizing for Your Workflow

Your workflow might be different. Configure Bubo to match:

**Example: Simple label-based workflow (no project board)**

```yaml
workflow:
  columns:
    ready: "N/A"  # Not using columns
    in_progress: "N/A"
    done: "N/A"
  
  triggers:
    pickup:
      column: ""  # Empty = ignore column
      labels:
        - "ai-task"
        - "approved"
```

**Example: Sprint-based workflow**

```yaml
workflow:
  columns:
    backlog: "Product Backlog"
    ready: "Sprint Backlog"
    in_progress: "In Development"
    review: "Code Review"
    done: "Done"
  
  triggers:
    pickup:
      column: "Sprint Backlog"
      labels:
        - "bubo"
      exclude_labels:
        - "needs-design"
        - "blocked"
```

## Architecture

```
src/
├── cli/                    # Command-line interface
│   ├── index.ts            # Main CLI entry point
│   └── commands/           # Command implementations
├── core/
│   ├── agent.ts            # Main agent orchestration
│   ├── config/             # Configuration system
│   │   ├── schema.ts       # Zod schemas
│   │   ├── loader.ts       # Config loading
│   │   └── defaults.ts     # Default values
│   ├── github/             # GitHub API integration
│   │   ├── client.ts       # REST API client
│   │   └── projects.ts     # Projects v2 GraphQL
│   ├── claude/             # Claude Code integration
│   └── workflow/           # Kanban workflow engine
├── types/                  # TypeScript definitions
└── utils/                  # Shared utilities
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`pnpm test`)
- Code is formatted (`pnpm format`)
- No linting errors (`pnpm lint`)
- TypeScript compiles (`pnpm typecheck`)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by the "Ralph Wiggum" approach to long-running AI agents
- Built with [Octokit](https://github.com/octokit) for GitHub integration
- Powered by [Claude](https://anthropic.com) for AI capabilities
