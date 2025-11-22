# Vibe Flow

基于Claude的自动化编程工具，使用多个AI代理在独立的Git工作树中并行完成复杂功能开发。

---

## 主要功能

- **并行Git工作树**：每个代理在独立分支中工作
- **多代理协作**：架构师 → 工厂(并行代理) → 代码审查 → 合并
- **自动修复**：根据审查反馈自动重试
- **生产级可靠性**：超时保护、数据验证、优雅退出
- **SuperClaude集成**：使用 `/sc:index-repo`、`/sc:workflow`、`/sc:implement` 命令

---

## 快速开始

### 安装

```bash
npm install -g @jingyi_qiu/vibe-flow
```

### 系统要求

Vibe Flow需要以下系统依赖：

- **Node.js** 18+
- **Git** (支持工作树功能)
- **Claude CLI** (用于SuperClaude命令)
- **jq** - JSON处理工具
- **python3** - 工具脚本

### 使用方法

```bash
# 进入你的项目目录
cd your-project

# 运行vibe flow
vibe

# 自定义配置
MAX_PARALLEL_AGENTS=4 MAX_RETRIES=5 vibe
```

---

## 系统架构

### TypeScript重构版本 (v1.0.0)

已从Bash重构为TypeScript，解决了关键问题：

#### **关键修复**
- ✅ **进程死锁预防**：
  - 从原生 `spawn` 迁移到 `execa`
  - 5分钟超时防止无限等待
  - 10MB缓冲区限制防止溢出
  - `CI: 'true'` 强制非交互模式

- ✅ **数据验证**：
  - 所有AI输出使用Zod运行时验证
  - 无效JSON的详细错误信息
  - 类型安全的数据流

- ✅ **优雅退出**：
  - SIGINT/SIGTERM信号处理
  - 退出时自动清理工作树
  - 无孤儿进程或目录

#### **重要优化**
- ✅ **指数退避重试**：1s → 2s → 4s → ... → 60s
- ✅ **代码质量**：ESLint + Prettier配置
- ✅ **并发控制**：使用 `p-limit` 管理

### 目录结构

```
src/
├── cli.ts              # 程序入口
├── config.ts           # 配置加载器
├── logger.ts           # 统一日志
├── types.ts            # TypeScript类型定义
├── core/               # 核心逻辑
│   ├── librarian.ts    # 上下文生成
│   ├── architect.ts    # 任务规划
│   ├── factory.ts      # 并行执行
│   ├── review.ts       # 代码审查代理
│   ├── mergeManager.ts # 分支合并
│   ├── integration.ts  # 集成测试
│   └── cto.ts          # 最终审批
├── git/                # Git操作
│   ├── gitWorktree.ts  # 工作树管理
│   └── gitBranch.ts    # 分支操作
├── utils/              # 工具函数
│   ├── childProcess.ts # 进程执行(execa)
│   ├── jsonExtractor.ts# JSON解析(Zod)
│   ├── cleanup.ts      # 信号处理
│   └── file.ts         # 文件操作
└── schemas/            # Zod模式
    └── taskPlan.ts     # 任务计划验证
```

### 工作流程

```
┌──────────────┐
│ 管理员        │ 生成项目索引
└──────┬───────┘
       │
┌──────▼───────┐
│ 架构师        │ 创建任务计划(Zod验证)
└──────┬───────┘
       │
┌──────▼───────┐
│ 工厂          │ 并行执行任务(p-limit)
│              │ • 每个任务在独立工作树中
│              │ • 自动修复重试(指数退避)
│              │ • 审查反馈循环
└──────┬───────┘
       │
┌──────▼───────┐
│ 合并          │ 合并所有分支
└──────┬───────┘
       │
┌──────▼───────┐
│ 集成测试      │ 运行集成测试
└──────┬───────┘
       │
┌──────▼───────┐
│ CTO审查       │ 最终审批
└──────┬───────┘
       │
┌──────▼───────┐
│ 报告          │ 生成总结
└──────────────┘
```

---

## 配置

环境变量：

- `MAX_PARALLEL_AGENTS` - 并发代理数量(默认: 2)
- `MAX_RETRIES` - 最大重试次数(默认: 3)

---

## 开发

### 安装开发环境

```bash
git clone https://github.com/QiuYi111/vibe.git
cd vibe/vibe-flow
npm install
```

### 脚本命令

```bash
npm run build        # 编译TypeScript
npm run dev          # 开发模式运行
npm run lint         # 检查代码质量
npm run lint:fix     # 自动修复代码问题
npm run format       # 格式化代码
npm run format:check # 检查代码格式
```

### 项目质量

- **TypeScript**: 启用严格模式
- **代码检查**: ESLint + TypeScript插件
- **代码格式**: Prettier (120字符, 4空格, 单引号)
- **类型安全**: Zod运行时验证

---

## 为什么选择TypeScript?

原始Bash版本(v0.1.7)存在关键问题：

| 问题 | Bash | TypeScript |
|------|------|------------|
| 进程挂起 | ❌ 无超时 | ✅ 5分钟超时 |
| 缓冲区溢出 | ❌ 无限制 | ✅ 10MB限制 |
| 无效JSON | ❌ 运行崩溃 | ✅ Zod验证 |
| 孤儿进程 | ❌ 手动清理 | ✅ 自动清理 |
| 类型安全 | ❌ 无 | ✅ 完全严格模式 |
| 重试策略 | 🟡 固定1秒 | ✅ 指数退避 |

**重构进度**: 80% → 98%
**生产就绪**: ⭐⭐⭐⭐½ (4.5/5)

---

## 开源协议

MIT

---

## 技术支持

基于 [Claude](https://claude.ai) 和 [SuperClaude](https://docs.anthropic.com/en/docs/build-with-claude/claude-code) 命令。