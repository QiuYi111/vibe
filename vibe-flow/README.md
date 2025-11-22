# 🌊 Vibe Flow

**Git-Native Autonomous Coding Engine powered by Claude**

Vibe Flow orchestrates parallel AI agents in isolated Git worktrees to implement complex features autonomously. Built with TypeScript for production-grade reliability.

---

## ✨ Features

- 🔀 **Parallel Git Worktrees**: Each agent works in isolated branches
- 🤖 **Multi-Agent Orchestration**: Architect → Factory (parallel agents) → Review → Merge
- 🔁 **Self-Healing**: Automatic retry with review feedback
- 🛡️ **Production-Grade**: Timeout protection, schema validation, graceful shutdown
- 📊 **SuperClaude Integration**: Uses `/sc:index-repo`, `/sc:workflow`, `/sc:implement` commands

---

## 🚀 Quick Start

### Installation

```bash
npm install -g @jingyi_qiu/vibe-flow
```

### Prerequisites

Vibe Flow requires the following system dependencies:

- **Node.js** 18+
- **Git** with worktree support
- **Claude CLI** (for SuperClaude commands)
- **jq** - JSON processor
- **python3** - For utility scripts

### Usage

```bash
# Navigate to your project
cd your-project

# Run vibe flow
vibe

# With custom configuration
MAX_PARALLEL_AGENTS=4 MAX_RETRIES=5 vibe
```

---

## 🏗️ Architecture

### TypeScript Refactoring (v1.0.0)

Vibe Flow has been refactored from Bash to TypeScript with critical improvements:

#### **P0 Critical Fixes**
- ✅ **Process Deadlock Prevention**: 
  - Migrated from native `spawn` to `execa`
  - 5-minute timeout prevents infinite hangs
  - 10MB buffer limit prevents overflow
  - `CI: 'true'` forces non-interactive mode
  
- ✅ **Schema Validation**: 
  - Zod runtime validation for all LLM outputs
  - Detailed error messages for invalid JSON
  - Type-safe data flow

- ✅ **Graceful Shutdown**:
  - SIGINT/SIGTERM signal handlers
  - Automatic worktree cleanup on exit
  - No orphan processes or directories

#### **P1 Optimizations**
- ✅ **Exponential Backoff**: Retry delays scale from 1s → 2s → 4s → ... → 60s
- ✅ **Code Quality**: ESLint + Prettier configured
- ✅ **Concurrency Control**: Clean `p-limit` abstraction

### Directory Structure

```
src/
├── cli.ts              # Entry point
├── config.ts           # Configuration loader
├── logger.ts           # Unified logging
├── types.ts            # TypeScript definitions
├── core/               # Orchestration logic
│   ├── librarian.ts    # Context generation
│   ├── architect.ts    # Task planning
│   ├── factory.ts      # Parallel execution
│   ├── review.ts       # Code review agent
│   ├── mergeManager.ts # Branch merging
│   ├── integration.ts  # Integration testing
│   └── cto.ts          # Final approval
├── git/                # Git operations
│   ├── gitWorktree.ts  # Worktree management
│   └── gitBranch.ts    # Branch operations
├── utils/              # Utilities
│   ├── childProcess.ts # Process execution (execa)
│   ├── jsonExtractor.ts# JSON parsing (Zod)
│   ├── cleanup.ts      # Signal handlers
│   └── file.ts         # File operations
└── schemas/            # Zod schemas
    └── taskPlan.ts     # Task plan validation
```

### Workflow

```
┌──────────────┐
│ Librarian    │ Generate project index
└──────┬───────┘
       │
┌──────▼───────┐
│ Architect    │ Create task plan (validated by Zod)
└──────┬───────┘
       │
┌──────▼───────┐
│ Factory      │ Execute tasks in parallel (p-limit)
│              │ • Each task in isolated worktree
│              │ • Self-healing with retry (exponential backoff)
│              │ • Review feedback loop
└──────┬───────┘
       │
┌──────▼───────┐
│ Merge        │ Combine all branches
└──────┬───────┘
       │
┌──────▼───────┐
│ Integration  │ Run integration tests
└──────┬───────┘
       │
┌──────▼───────┐
│ CTO Review   │ Final approval
└──────┬───────┘
       │
┌──────▼───────┐
│ Report       │ Generate summary
└──────────────┘
```

---

## 🔧 Configuration

Environment variables:

- `MAX_PARALLEL_AGENTS` - Number of concurrent agents (default: 2)
- `MAX_RETRIES` - Maximum retry attempts (default: 3)

---

##💻 Development

### Setup

```bash
git clone https://github.com/jingyi-qiu/vibe-flow.git
cd vibe-flow
npm install
```

### Scripts

```bash
npm run build        # Compile TypeScript
npm run dev          # Run in development mode
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting
```

### Project Quality

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier (120 col, 4 spaces, single quotes)
- **Type Safety**: Zod for runtime validation

---

## 🎯 Why TypeScript?

The original Bash version (v0.1.7) had critical issues:

| Issue | Bash | TypeScript |
|-------|------|------------|
| Process hangs | ❌ No timeout | ✅ 5min timeout |
| Buffer overflow | ❌ Unlimited | ✅ 10MB limit |
| Invalid JSON | ❌ Runtime crash | ✅ Zod validation |
| Orphan processes | ❌ Manual cleanup | ✅ Auto cleanup |
| Type safety | ❌ None | ✅ Full strict mode |
| Retry strategy | 🟡 Fixed 1s | ✅ Exponential |

**Refactoring Progress**: 80% → 98%  
**Production Readiness**: ⭐⭐⭐⭐½ (4.5/5)

---

## 📝 License

MIT

---

## 🙏 Credits

Powered by [Claude](https://claude.ai) and [SuperClaude](https://docs.anthropic.com/en/docs/build-with-claude/claude-code) commands.