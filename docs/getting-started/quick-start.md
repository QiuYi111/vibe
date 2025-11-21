---
title: Quick Start Guide
description: Get started with Vibe Flow in minutes
category: getting-started
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [quick-start, tutorial, first-run]
language: en
---

# Quick Start Guide

## First Steps / 快速开始

### 1. Navigate to Your Project / 进入项目目录
```bash
cd your-project
```

### 2. Run Vibe Flow / 运行 Vibe Flow
```bash
vibe
```

That's it! Vibe Flow will automatically:
- 📚 Analyze your codebase
- 🏗️ Create a task plan
- 🤖 Spawn AI agents
- 🔍 Review all code changes
- 🔄 Handle merge conflicts
- ✅ Ensure everything works

## Example Session / 示例会话

Let's add a new feature to a Node.js project:

### Step 1: Create a Requirements File
```bash
# Create REQUIREMENTS.md
echo "Add user authentication with login and registration endpoints" > REQUIREMENTS.md
```

### Step 2: Run Vibe Flow
```bash
vibe
```

### Step 3: Watch the Magic
Vibe Flow will display a real-time dashboard:

```
🚀 Vibe Flow v5.0 - Autonomous Coding Engine
📁 Project: my-node-app (Node.js)
🎯 Task: Add user authentication...

┌─────────────────────────────────────────────────────────────┐
│ 🏗️  Architect: Planning tasks...                             │
│ ⚡ Agent 1: Implementing user model...                       │
│ ⚡ Agent 2: Creating auth routes...                          │
│ ⚡ Agent 3: Adding middleware...                            │
│ 🔍 Reviewer: Checking code quality...                       │
└─────────────────────────────────────────────────────────────┘

✅ Tasks Completed: 2/3
🧪 Tests Passing: 2/2
⚠️  Issues Found: 0
```

### Step 4: Review Results
After completion, Vibe Flow generates:
- **Code changes** committed to Git
- **Test coverage** report
- **CTO review** summary
- **Integration verification**

## Basic Commands / 基本命令

### Run with Custom Settings / 自定义设置运行
```bash
# Use 4 parallel agents
MAX_PARALLEL_AGENTS=4 vibe

# Enable debug logging
LOG_LEVEL=debug vibe

# Auto-commit changes
AUTO_COMMIT=true vibe
```

### Get Help / 获取帮助
```bash
vibe --help
```

## Project Types Supported / 支持的项目类型

Vibe Flow automatically detects and works with:

- **Node.js** (JavaScript/TypeScript)
- **Python** (Django, Flask, FastAPI)
- **React/Vue/Angular** (Frontend)
- **Go** (Web services)
- **Java** (Spring Boot)
- **Generic Git repos**

## What Vibe Flow Can Do / Vibe Flow 能做什么

### 🏗️ Architecture & Planning
- Analyze existing codebase structure
- Break down requirements into tasks
- Design component interactions

### ⚡ Parallel Development
- Spawn multiple AI agents
- Work in isolated Git worktrees
- Implement features concurrently

### 🔍 Code Quality
- Linus Torvalds-style reviews
- Automated testing
- Security analysis

### 🔄 Integration Management
- Automatic merge conflict resolution
- Cross-agent coordination
- System-wide testing

### 📊 Reporting & Audit
- Real-time progress dashboard
- CTO-level architectural reviews
- Quality scoring

## Example Use Cases / 使用案例

### 1. Add a New Feature / 添加新功能
```bash
echo "Implement file upload with drag-and-drop UI" > REQUIREMENTS.md
vibe
```

### 2. Fix a Bug / 修复错误
```bash
echo "Fix memory leak in data processing module" > REQUIREMENTS.md
vibe
```

### 3. Refactor Code / 重构代码
```bash
echo "Refactor authentication system for better scalability" > REQUIREMENTS.md
vibe
```

### 4. Add Tests / 添加测试
```bash
echo "Add comprehensive unit tests for user service" > REQUIREMENTS.md
vibe
```

## Best Practices / 最佳实践

### 1. Clear Requirements / 清晰的需求
Be specific in your `REQUIREMENTS.md`:

✅ **Good**:
```markdown
Add user authentication with:
- Email/password login
- JWT token management
- Password reset functionality
- Rate limiting
```

❌ **Too vague**:
```markdown
Add auth stuff
```

### 2. Test Your Setup / 测试设置
Before running on important projects:
```bash
# Test on a sample project first
git clone https://github.com/example/sample-project.git
cd sample-project
vibe
```

### 3. Review the Results / 审查结果
Always check:
- Generated commits: `git log --oneline -5`
- Test results: Check test output
- CTO review: `vibe_cto_report.md`

## Next Steps / 下一步

- [User Guide](../guides/user-guide.md) - Detailed usage instructions
- [Configuration](../references/configuration.md) - Advanced settings
- [API Reference](../references/api.md) - Complete API documentation

## Need Help? / 需要帮助？

- 📖 Check the [documentation](../README.md)
- 🐛 [Report an issue](https://github.com/yourusername/vibe/issues)
- 💬 Join our community discussions

---

*Ready to transform your development workflow? Let's build something amazing! 🚀*

*Last updated: 2025-11-21*