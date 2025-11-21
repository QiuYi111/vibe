# Vibe Flow (Git-Native)

**Git-Native Autonomous Coding Engine powered by Claude**

Vibe Flow is a powerful CLI tool that orchestrates AI agents to autonomously plan, implement, and verify code changes directly within your Git workflow. It uses a worktree-based architecture to run agents in parallel, ensuring a clean and efficient development process.

## Features

- **Git-Native Architecture**: Operates directly on your Git repository using worktrees for isolation.
- **Autonomous Agents**:
  - **Architect**: Plans tasks based on requirements and codebase context.
  - **Agents**: Implement code in parallel isolated branches.
  - **Reviewer**: Performs Linus-style code reviews and generates tests.
  - **Mediator**: Automatically resolves merge conflicts.
  - **System Healer**: Fixes integration issues when merging features.
- **Visual Dashboard**: Real-time progress monitoring with ASCII art interface.
- **CTO Review**: Generates a final architectural report of the session.

## Installation

```bash
npm install -g @jingyi_qiu/vibe-flow
```

## Usage

Navigate to your project directory and run:

```bash
vibe
```

### Options

```bash
vibe --help      # Show help message
```

### Environment Variables

- `MAX_PARALLEL_AGENTS`: Number of concurrent agents (default: 2)
- `MAX_RETRIES`: Max retries for agent tasks (default: 3)

### Example

```bash
# Run with default settings
vibe

# Run with 4 parallel agents
MAX_PARALLEL_AGENTS=4 vibe
```

## Requirements

- `git`
- `node` & `npx`
- `claude` (Anthropic CLI)
- `jq`
- `python3`

## License

MIT
