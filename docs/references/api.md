---
title: API Reference
description: Complete API documentation for Vibe Flow
category: references
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [api, reference, cli, commands]
language: en
---

# API Reference

## Command Line Interface / 命令行接口

### Basic Usage / 基本用法

```bash
vibe [options]
```

### Options / 选项

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | - |
| `--version` | `-v` | Show version number | - |
| `--config` | `-c` | Specify config file | `./vibe.config.json` |
| `--dry-run` | - | Show what would be done without executing | `false` |
| `--verbose` | - | Enable verbose logging | `false` |

### Environment Variables / 环境变量

#### Core Configuration / 核心配置

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MAX_PARALLEL_AGENTS` | Number of concurrent AI agents | `2` | `4` |
| `MAX_RETRIES` | Maximum retry attempts per task | `3` | `5` |
| `AUTO_COMMIT` | Automatically commit successful changes | `false` | `true` |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug` |
| `TIMEOUT` | Task timeout in seconds | `300` | `600` |

#### Claude Configuration / Claude 配置

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CLAUDE_MODEL` | Claude model to use | `claude-3-sonnet` | `claude-3-opus` |
| `CLAUDE_API_KEY` | Anthropic API key (overrides CLI config) | - | `sk-ant-...` |

#### Git Configuration / Git 配置

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GIT_REMOTE` | Git remote to push to | `origin` | `upstream` |
| `BRANCH_PREFIX` | Prefix for agent branches | `vibe/` | `agent/` |

## Configuration File / 配置文件

### vibe.config.json
```json
{
  "version": "5.0",
  "agents": {
    "max_parallel": 4,
    "timeout": 600,
    "retry_attempts": 3
  },
  "git": {
    "remote": "origin",
    "branch_prefix": "vibe/",
    "auto_commit": true
  },
  "review": {
    "strict_mode": true,
    "require_tests": true,
    "coverage_threshold": 80
  },
  "logging": {
    "level": "info",
    "file": ".vibe_logs/session.log",
    "console": true
  },
  "domains": {
    "javascript": {
      "test_command": "npm test",
      "lint_command": "npm run lint",
      "build_command": "npm run build"
    },
    "python": {
      "test_command": "pytest",
      "lint_command": "flake8 .",
      "build_command": "python setup.py build"
    },
    "go": {
      "test_command": "go test ./...",
      "lint_command": "golint ./...",
      "build_command": "go build"
    }
  }
}
```

## Domain Support / 项目类型支持

### Supported Domains / 支持的领域

#### JavaScript/TypeScript
- **Test Command**: `npm test` or `yarn test`
- **Lint Command**: `npm run lint` or `yarn lint`
- **Build Command**: `npm run build` or `yarn build`
- **File Extensions**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Package Managers**: `npm`, `yarn`, `pnpm`

#### Python
- **Test Command**: `pytest` or `python -m unittest`
- **Lint Command**: `flake8 .` or `pylint .`
- **Build Command**: `python setup.py build`
- **File Extensions**: `.py`
- **Frameworks**: Django, Flask, FastAPI

#### Go
- **Test Command**: `go test ./...`
- **Lint Command**: `golint ./...` or `golangci-lint run`
- **Build Command**: `go build`
- **File Extensions**: `.go`
- **Modules**: Go modules supported

#### Java
- **Test Command**: `mvn test` or `gradle test`
- **Lint Command**: `mvn checkstyle:check`
- **Build Command**: `mvn compile` or `gradle build`
- **File Extensions**: `.java`
- **Frameworks**: Spring Boot, Jakarta EE

### Custom Domain Configuration / 自定义领域配置

You can add support for new domains by extending the config:

```json
{
  "domains": {
    "rust": {
      "test_command": "cargo test",
      "lint_command": "cargo clippy",
      "build_command": "cargo build",
      "file_extensions": [".rs"],
      "package_manager": "cargo"
    },
    "php": {
      "test_command": "composer test",
      "lint_command": "composer lint",
      "build_command": "composer install",
      "file_extensions": [".php"],
      "package_manager": "composer"
    }
  }
}
```

## Agent System / 代理系统

### Agent Types / 代理类型

#### Architect Agent / 架构师代理
- **Purpose**: Analyze requirements and create task plans
- **Capabilities**: Codebase analysis, task decomposition, dependency mapping
- **Output**: Task list in JSON format

#### Developer Agents / 开发者代理
- **Purpose**: Implement specific tasks in isolated worktrees
- **Capabilities**: Code generation, testing, documentation
- **Isolation**: Each agent works in a separate Git worktree

#### Reviewer Agent / 审查者代理
- **Purpose**: Perform Linus Torvalds-style code reviews
- **Capabilities**: Code quality analysis, security review, test generation
- **Standards**: Enforces "Good Taste" principles

#### Mediator Agent / 协调者代理
- **Purpose**: Resolve merge conflicts between agent branches
- **Capabilities**: Conflict analysis, intelligent merging, compromise finding
- **Strategy**: Analyzes both sides and finds optimal solutions

#### System Healer Agent / 系统修复者代理
- **Purpose**: Fix integration issues after merge
- **Capabilities**: Global analysis, cross-module fixes, integration testing
- **Scope**: System-wide perspective on all changes

#### CTO Agent / CTO 代理
- **Purpose**: Final architectural review and audit
- **Capabilities**: Quality scoring, architectural consistency, security audit
- **Output**: Comprehensive CTO report

### Agent Communication / 代理通信

Agents communicate through:
- **Git Commits**: Structured commit messages
- **JSON Status Files**: `.vibe_status/agent_*.json`
- **Shared Context**: Common understanding of project structure
- **Review Comments**: Structured feedback system

## Integration Hooks / 集成钩子

### Pre-Hooks / 前置钩子
```json
{
  "hooks": {
    "pre_session": [
      "npm install",
      "git pull origin main"
    ],
    "pre_task": [
      "echo Starting task: ${TASK_ID}",
      "date"
    ]
  }
}
```

### Post-Hooks / 后置钩子
```json
{
  "hooks": {
    "post_session": [
      "git push origin main",
      "npm run deploy"
    ],
    "post_task": [
      "echo Completed task: ${TASK_ID}",
      "git log -1 --oneline"
    ]
  }
}
```

## Error Handling / 错误处理

### Error Codes / 错误代码

| Code | Description | Resolution |
|------|-------------|------------|
| `V001` | Git repository not found | Run in a Git repository |
| `V002` | Claude CLI not installed | Install Claude CLI |
| `V003` | Agent timeout | Increase `TIMEOUT` value |
| `V004` | Merge conflict unresolvable | Manual intervention required |
| `V005` | Test failures persist | Check `vibe_cto_report.md` |

### Recovery Strategies / 恢复策略

#### Automatic Recovery / 自动恢复
- **Retry Logic**: Up to `MAX_RETRIES` attempts
- **Fallback Strategies**: Alternative implementation approaches
- **Partial Success**: Commit working components separately

#### Manual Recovery / 手动恢复
```bash
# Check current status
git status
git log --oneline -10

# Review failed changes
git diff HEAD~1

# Continue from last known good state
git reset --hard HEAD~1
vibe --resume
```

## Monitoring & Logging / 监控和日志

### Log Files / 日志文件

| File | Description | Format |
|------|-------------|--------|
| `.vibe_logs/session.log` | Main session log | Plain text |
| `.vibe_logs/agents/*.log` | Individual agent logs | JSON |
| `.vibe_cto_report.md` | Final CTO review | Markdown |
| `.vibe_metrics.json` | Performance metrics | JSON |

### Real-time Dashboard / 实时仪表板

Vibe Flow displays a live dashboard showing:
- 🏗️ Architect progress
- ⚡ Agent status (active/idle/completed)
- 🔍 Review results
- 🧪 Test status
- ⚠️ Issues and warnings

## Programmatic API / 编程接口

### Node.js Integration
```javascript
const { VibeFlow } = require('@jingyi_qiu/vibe-flow');

const vibe = new VibeFlow({
  maxAgents: 4,
  domain: 'javascript',
  config: './vibe.config.json'
});

// Run a session
const result = await vibe.run({
  requirements: 'Add user authentication system',
  projectPath: './my-project'
});

console.log('Session completed:', result);
```

### Python Integration
```python
from vibe_flow import VibeFlow

vibe = VibeFlow(
    max_agents=4,
    domain='python',
    config_path='./vibe.config.json'
)

result = vibe.run(
    requirements='Add user authentication system',
    project_path='./my-project'
)

print(f'Session completed: {result}')
```

## Security Considerations / 安全考虑

### Code Review Standards / 代码审查标准
- **Security Analysis**: Automated vulnerability scanning
- **Dependency Checks**: Known vulnerability detection
- **Secret Detection**: Prevent credential leakage
- **Input Validation**: Ensure proper sanitization

### Isolation / 隔离机制
- **Worktree Isolation**: Each agent in separate Git worktree
- **Process Isolation**: Agents run in separate processes
- **Network Restrictions**: Configurable network access policies

---

*Last updated: 2025-11-21*