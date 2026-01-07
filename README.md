# Bubo

An enterprise AI coding agent with deep GitHub integration. Bubo automates software development workflows by orchestrating AI-powered coding sessions that integrate seamlessly with GitHub Issues, Projects, and Pull Requests.

## Overview

Bubo implements an iterative agent loop inspired by the "Ralph Wiggum" approach:

1. **Pick a task** from your GitHub Project board
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

- **GitHub-Native Workflow**: Deep integration with Issues, Projects (v2), and Pull Requests
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

## Configuration

Create a `.env` file or set environment variables:

```bash
# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# Optional
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
BUBO_MAX_ITERATIONS=10
BUBO_LOG_LEVEL=info
```

## Usage

### CLI

```bash
# Run agent on a specific issue
bubo run --issue 42

# Run agent on the next task from a project board
bubo run --project "Sprint Board"

# Dry run (plan without executing)
bubo plan --issue 42

# Check status
bubo status
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
    if: github.event.label.name == 'bubo' || contains(github.event.comment.body, '@bubo')
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

const agent = new BuboAgent({
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: 'your-org',
    repo: 'your-repo',
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
});

await agent.run({ issueNumber: 42 });
```

## Workflow Integration

Bubo works best with a structured GitHub workflow:

### Recommended Labels

| Label | Description |
|-------|-------------|
| `bubo` | Triggers Bubo to work on this issue |
| `bubo:in-progress` | Bubo is currently working on this |
| `bubo:blocked` | Bubo encountered an issue and needs help |
| `bubo:complete` | Bubo has completed the task |

### Project Board Columns

| Column | Description |
|--------|-------------|
| Backlog | Tasks waiting to be picked up |
| Ready | Tasks ready for Bubo to work on |
| In Progress | Tasks currently being worked on |
| Review | PRs awaiting human review |
| Done | Completed tasks |

## Architecture

```
src/
├── cli/           # Command-line interface
├── core/
│   ├── agent.ts   # Main agent orchestration
│   ├── github/    # GitHub API integration
│   ├── claude/    # Claude Code integration
│   └── workflow/  # Kanban workflow engine
├── types/         # TypeScript definitions
└── utils/         # Shared utilities
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
