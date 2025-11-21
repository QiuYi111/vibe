---
title: 快速开始指南
description: 几分钟内开始使用 Vibe Flow
category: getting-started
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [快速开始, 教程, 首次运行]
language: zh
---

# 快速开始指南

## 第一步 / 快速开始

### 1. 进入您的项目目录
```bash
cd your-project
```

### 2. 运行 Vibe Flow
```bash
vibe
```

就这样！Vibe Flow 将自动：
- 📚 分析您的代码库
- 🏗️ 创建任务计划
- 🤖 生成 AI 代理
- 🔍 审查所有代码更改
- 🔄 处理合并冲突
- ✅ 确保一切正常工作

## 示例会话

让我们向一个 Node.js 项目添加新功能：

### 步骤 1：创建需求文件
```bash
# 创建 REQUIREMENTS.md
echo "添加带有登录和注册端点的用户认证" > REQUIREMENTS.md
```

### 步骤 2：运行 Vibe Flow
```bash
vibe
```

### 步骤 3：见证魔法
Vibe Flow 将显示实时仪表板：

```
🚀 Vibe Flow v5.0 - Autonomous Coding Engine
📁 项目: my-node-app (Node.js)
🎯 任务: 添加用户认证...

┌─────────────────────────────────────────────────────────────┐
│ 🏗️  架构师: 正在规划任务...                                 │
│ ⚡ 代理 1: 正在实现用户模型...                              │
│ ⚡ 代理 2: 正在创建认证路由...                             │
│ ⚡ 代理 3: 正在添加中间件...                               │
│ 🔍 审查者: 正在检查代码质量...                             │
└─────────────────────────────────────────────────────────────┘

✅ 已完成任务: 2/3
🧪 测试通过: 2/2
⚠️  发现问题: 0
```

### 步骤 4：审查结果
完成后，Vibe Flow 生成：
- 已提交到 Git 的**代码更改**
- **测试覆盖率**报告
- **CTO 审查**摘要
- **集成验证**

## 基本命令

### 使用自定义设置运行
```bash
# 使用 4 个并行代理
MAX_PARALLEL_AGENTS=4 vibe

# 启用调试日志
LOG_LEVEL=debug vibe

# 自动提交更改
AUTO_COMMIT=true vibe
```

### 获取帮助
```bash
vibe --help
```

## 支持的项目类型

Vibe Flow 自动检测并支持：

- **Node.js** (JavaScript/TypeScript)
- **Python** (Django, Flask, FastAPI)
- **React/Vue/Angular** (前端)
- **Go** (Web 服务)
- **Java** (Spring Boot)
- **通用 Git 仓库**

## Vibe Flow 能做什么

### 🏗️ 架构和规划
- 分析现有代码库结构
- 将需求分解为任务
- 设计组件交互

### ⚡ 并行开发
- 生成多个 AI 代理
- 在隔离的 Git worktrees 中工作
- 并发实现功能

### 🔍 代码质量
- Linus Torvalds 风格的审查
- 自动化测试
- 安全分析

### 🔄 集成管理
- 自动合并冲突解决
- 代理间协调
- 系统级测试

### 📊 报告和审计
- 实时进度仪表板
- CTO 级别的架构审查
- 质量评分

## 使用案例

### 1. 添加新功能
```bash
echo "实现带有拖放 UI 的文件上传" > REQUIREMENTS.md
vibe
```

### 2. 修复错误
```bash
echo "修复数据处理模块中的内存泄漏" > REQUIREMENTS.md
vibe
```

### 3. 重构代码
```bash
echo "重构认证系统以提高可扩展性" > REQUIREMENTS.md
vibe
```

### 4. 添加测试
```bash
echo "为用户服务添加全面的单元测试" > REQUIREMENTS.md
vibe
```

## 最佳实践

### 1. 清晰的需求
在您的 `REQUIREMENTS.md` 中具体说明：

✅ **好的示例**：
```markdown
添加用户认证，包括：
- 邮箱/密码登录
- JWT 令牌管理
- 密码重置功能
- 访问限制
```

❌ **过于模糊**：
```markdown
添加认证相关的东西
```

### 2. 测试您的设置
在重要项目上运行之前：
```bash
# 先在示例项目上测试
git clone https://github.com/example/sample-project.git
cd sample-project
vibe
```

### 3. 审查结果
始终检查：
- 生成的提交：`git log --oneline -5`
- 测试结果：检查测试输出
- CTO 审查：`vibe_cto_report.md`

## 下一步

- [用户指南](../guides/user-guide.md) - 详细使用说明
- [配置](../references/configuration.md) - 高级设置
- [API 参考](../references/api.md) - 完整的 API 文档

## 需要帮助？

- 📖 查看[文档](../README.md)
- 🐛 [报告问题](https://github.com/yourusername/vibe/issues)
- 💬 加入我们的社区讨论

---

*准备好改变您的开发工作流程了吗？让我们一起构建令人惊叹的东西！🚀*

*最后更新：2025-11-21*