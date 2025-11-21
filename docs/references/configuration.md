---
title: Configuration Guide
description: Complete configuration options for Vibe Flow
category: references
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [configuration, settings, options, environment]
language: en
---

# Configuration Guide

## Overview / 概述

Vibe Flow can be configured through multiple methods:
- **Environment Variables** - Runtime configuration
- **Configuration Files** - Persistent settings
- **Command Line Options** - One-time overrides
- **Domain-Specific Settings** - Project type customization

## Configuration Precedence / 配置优先级

Settings are applied in this order (highest to lowest):
1. **Command Line Options** (e.g., `vibe --verbose`)
2. **Environment Variables** (e.g., `LOG_LEVEL=debug`)
3. **Project Config File** (`./vibe.config.json`)
4. **User Config File** (`~/.vibe/config.json`)
5. **Default Values**

## Core Configuration / 核心配置

### Environment Variables / 环境变量

#### Performance Settings / 性能设置

```bash
# Number of parallel AI agents (default: 2)
export MAX_PARALLEL_AGENTS=4

# Task timeout in seconds (default: 300)
export TIMEOUT=600

# Maximum retry attempts (default: 3)
export MAX_RETRIES=5

# Memory limit per agent in MB (default: 1024)
export AGENT_MEMORY_LIMIT=2048
```

#### Behavior Settings / 行为设置

```bash
# Auto-commit successful changes (default: false)
export AUTO_COMMIT=true

# Enable dry-run mode (default: false)
export DRY_RUN=true

# Strict review mode (default: true)
export STRICT_REVIEW=true

# Enable verbose logging (default: false)
export VERBOSE=true
```

#### Claude AI Settings / Claude AI 设置

```bash
# Claude model to use (default: claude-3-sonnet)
export CLAUDE_MODEL=claude-3-opus

# Custom API endpoint (default: official Anthropic endpoint)
export CLAUDE_API_ENDPOINT=https://api.anthropic.com

# Request temperature (0.0-1.0, default: 0.1)
export CLAUDE_TEMPERATURE=0.2

# Maximum tokens per request (default: 4096)
export CLAUDE_MAX_TOKENS=8192
```

#### Logging Settings / 日志设置

```bash
# Log level (debug|info|warn|error, default: info)
export LOG_LEVEL=debug

# Log file location (default: .vibe_logs/session.log)
export LOG_FILE=./custom/vibe.log

# Enable console output (default: true)
export LOG_CONSOLE=true

# Log rotation (default: 10MB)
export LOG_MAX_SIZE=50MB
```

### Configuration File / 配置文件

#### Creating a Config File / 创建配置文件

Create `vibe.config.json` in your project root:

```json
{
  "version": "5.0",
  "project": {
    "name": "My Project",
    "description": "A sample Vibe Flow project",
    "domain": "auto"
  },
  "agents": {
    "max_parallel": 4,
    "timeout": 600,
    "retry_attempts": 3,
    "memory_limit": 2048,
    "models": {
      "architect": "claude-3-opus",
      "developer": "claude-3-sonnet",
      "reviewer": "claude-3-opus",
      "mediator": "claude-3-sonnet"
    }
  },
  "git": {
    "remote": "origin",
    "branch_prefix": "vibe/",
    "auto_commit": true,
    "auto_push": false,
    "commit_template": "Vibe: {task_type} - {description}"
  },
  "review": {
    "strict_mode": true,
    "require_tests": true,
    "coverage_threshold": 80,
    "security_scan": true,
    "style_check": true,
    "custom_rules": [
      "no-console-log",
      "prefer-const",
      "max-complexity: 10"
    ]
  },
  "testing": {
    "auto_generate": true,
    "framework": "auto",
    "coverage_threshold": 80,
    "parallel_tests": true,
    "test_timeout": 300
  },
  "integration": {
    "enable healer": true,
    "healer_attempts": 2,
    "global_tests": true,
    "cto_review": true,
    "quality_gate": true
  },
  "logging": {
    "level": "info",
    "file": ".vibe_logs/session.log",
    "console": true,
    "structured": true,
    "include_agent_logs": true
  },
  "hooks": {
    "pre_session": [],
    "post_session": [],
    "pre_task": [],
    "post_task": [],
    "on_failure": [],
    "on_success": []
  }
}
```

## Domain-Specific Configuration / 领域特定配置

### JavaScript/TypeScript / JavaScript/TypeScript

```json
{
  "domains": {
    "javascript": {
      "test_command": "npm test",
      "lint_command": "npm run lint",
      "build_command": "npm run build",
      "package_manager": "npm",
      "frameworks": ["react", "vue", "angular", "express"],
      "file_patterns": [
        "src/**/*.{js,ts,jsx,tsx}",
        "test/**/*.spec.{js,ts}",
        "**/*.json"
      ],
      "dependencies": {
        "dev": ["jest", "@types/jest", "eslint"],
        "required": ["node", "npm"]
      }
    }
  }
}
```

### Python / Python

```json
{
  "domains": {
    "python": {
      "test_command": "pytest",
      "lint_command": "flake8 .",
      "build_command": "python setup.py build",
      "package_manager": "pip",
      "frameworks": ["django", "flask", "fastapi"],
      "file_patterns": [
        "**/*.py",
        "requirements.txt",
        "pyproject.toml",
        "setup.py"
      ],
      "dependencies": {
        "dev": ["pytest", "black", "flake8"],
        "required": ["python3"]
      },
      "python_version": "3.8+"
    }
  }
}
```

### Go / Go

```json
{
  "domains": {
    "go": {
      "test_command": "go test ./...",
      "lint_command": "golangci-lint run",
      "build_command": "go build",
      "package_manager": "go",
      "frameworks": ["gin", "echo", "fiber"],
      "file_patterns": [
        "**/*.go",
        "go.mod",
        "go.sum"
      ],
      "dependencies": {
        "dev": ["golangci-lint", "goimports"],
        "required": ["go"]
      },
      "go_version": "1.19+"
    }
  }
}
```

## Custom Domains / 自定义领域

### Adding Support for New Languages / 添加新语言支持

```json
{
  "domains": {
    "rust": {
      "test_command": "cargo test",
      "lint_command": "cargo clippy",
      "build_command": "cargo build",
      "package_manager": "cargo",
      "frameworks": ["actix-web", "rocket", "warp"],
      "file_patterns": [
        "**/*.rs",
        "Cargo.toml",
        "Cargo.lock"
      ],
      "dependencies": {
        "dev": ["cargo-clippy"],
        "required": ["rustc", "cargo"]
      },
      "rust_version": "1.70+"
    }
  }
}
```

## Hooks and Automation / 钩子和自动化

### Pre-Session Hooks / 会话前钩子

```json
{
  "hooks": {
    "pre_session": [
      "echo 'Starting Vibe Flow session'",
      "git pull origin main",
      "npm install",
      "npm run clean"
    ]
  }
}
```

### Post-Session Hooks / 会话后钩子

```json
{
  "hooks": {
    "post_session": [
      "echo 'Vibe Flow session completed'",
      "git push origin main",
      "npm run deploy",
      "npm run notify-success"
    ]
  }
}
```

### Conditional Hooks / 条件钩子

```json
{
  "hooks": {
    "on_success": [
      "git push origin main",
      "npm run celebrate"
    ],
    "on_failure": [
      "echo 'Session failed - check logs'",
      "npm run notify-failure"
    ],
    "on_test_failure": [
      "npm run fix-tests",
      "git add . && git commit -m 'Fix tests'"
    ]
  }
}
```

## Review Configuration / 审查配置

### Custom Review Rules / 自定义审查规则

```json
{
  "review": {
    "custom_rules": [
      {
        "name": "no-hardcoded-secrets",
        "description": "No hardcoded API keys or secrets",
        "pattern": "(?i)(api[_-]?key|secret|password)\\s*[:=]\\s*['\"][^'\"]+['\"]",
        "severity": "critical"
      },
      {
        "name": "require-error-handling",
        "description": "All async functions must have error handling",
        "pattern": "async.*\\{[^}]*$",
        "severity": "high"
      },
      {
        "name": "max-function-length",
        "description": "Functions should not exceed 50 lines",
        "metric": "function_lines",
        "max": 50,
        "severity": "medium"
      }
    ],
    "ignore_patterns": [
      "node_modules/**",
      "dist/**",
      "*.min.js",
      "*.test.js"
    ]
  }
}
```

### Security Settings / 安全设置

```json
{
  "security": {
    "scan_dependencies": true,
    "scan_secrets": true,
    "scan_vulnerabilities": true,
    "allowed_dependencies": [
      "lodash",
      "express",
      "react"
    ],
    "blocked_dependencies": [
      "deprecated-package",
      "vulnerable-module"
    ],
    "secret_patterns": [
      "sk-ant-",
      "AIza",
      "xoxb-"
    ]
  }
}
```

## Performance Optimization / 性能优化

### Memory Management / 内存管理

```json
{
  "performance": {
    "agent_memory_limit": 2048,
    "context_window_size": 8192,
    "cache_enabled": true,
    "cache_ttl": 3600,
    "compression": true,
    "parallel_processing": true
  }
}
```

### Network Configuration / 网络配置

```json
{
  "network": {
    "timeout": 30,
    "retries": 3,
    "proxy": null,
    "rate_limit": {
      "requests_per_minute": 60,
      "burst_size": 10
    }
  }
}
```

## Troubleshooting Configuration / 配置故障排除

### Common Issues / 常见问题

#### 1. Configuration Not Loading
```bash
# Check if config file is valid JSON
cat vibe.config.json | jq .

# Verify file location
ls -la vibe.config.json

# Check permissions
ls -la vibe.config.json
```

#### 2. Environment Variables Not Applied
```bash
# Check current environment
env | grep VIBE

# Export variables correctly
export MAX_PARALLEL_AGENTS=4
export LOG_LEVEL=debug

# Verify in current session
echo $MAX_PARALLEL_AGENTS
```

#### 3. Domain Detection Fails
```bash
# Force specific domain
export VIBE_DOMAIN=javascript

# Check detected files
find . -name "*.js" -o -name "*.py" -o -name "*.go" | head -10
```

### Debug Mode / 调试模式

Enable comprehensive debugging:

```json
{
  "debug": {
    "enabled": true,
    "trace_api_calls": true,
    "log_agent_communication": true,
    "save_intermediate_states": true,
    "profile_performance": true
  }
}
```

Or via environment variable:

```bash
export DEBUG=true
export LOG_LEVEL=trace
vibe --verbose
```

## Configuration Validation / 配置验证

### Validate Your Config / 验证配置

```bash
# Check configuration syntax
vibe --validate-config

# Show effective configuration
vibe --show-config

# Test domain detection
vibe --detect-domain
```

### Schema Validation / 模式验证

The configuration follows this JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "agents": {
      "type": "object",
      "properties": {
        "max_parallel": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10
        }
      }
    }
  }
}
```

---

*Last updated: 2025-11-21*