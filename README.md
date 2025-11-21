# Vibe Flow

一个实用的开发工作流自动化小工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-5.0-blue.svg)](https://github.com/yourusername/vibe)

## 这是什么

Vibe Flow 是我把个人编程工作流脚本化的工具。它不是什么"革命性引擎"，而是一把解决实际问题的锋利小刀：

*   **并行处理**: 在多个 Git Worktrees 中同时处理任务
*   **代码审查**: 简单但有效的质量检查
*   **自动修复**: 检测并处理常见的集成问题
*   **冲突解决**: 智能处理合并冲突

它擅长的是把复杂的开发任务拆解、并行执行、然后整合。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **任务分析** | 扫描代码库结构，把大任务拆解成可并行执行的小块 |
| **并行执行** | 在独立的 Git Worktrees 中同时处理多个任务 |
| **质量检查** | 简单直接的代码审查，避免明显的质量问题 |
| **智能合并** | 自动处理分支间的合并冲突 |
| **集成修复** | 检测并修复常见的集成问题 |
| **结果检查** | 最终的质量评估和问题总结 |

---

## 安装

### 前置要求
*   Git
*   Node.js & npm
*   Python 3
*   `claude` CLI (Anthropic)
*   `jq`

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/vibe.git
cd vibe

# 全局安装
npm install -g vibe-flow

# 或者本地链接
npm link
```

---

## 使用方法

### 基本使用

在项目目录里直接运行 `vibe` 就行。它会自动检测项目类型并开始工作。

```bash
vibe
```

### 配置选项

可以通过环境变量调整行为：

```bash
# 使用4个并行代理（默认2个）
MAX_PARALLEL_AGENTS=4 vibe

# 启用自动提交模式
AUTO_COMMIT=true vibe
```

---

## 工作流程

工具的执行流程很直接：

1.  **分析索引**: 扫描代码库，建立结构映射
2.  **任务规划**: 根据需求制定并行任务计划
3.  **并行执行**: 在多个独立 Worktree 中执行任务
4.  **代码审查**: 检查代码质量和一致性
5.  **分支合并**: 整合各分支的改动，处理冲突
6.  **集成修复**: 解决整体性问题
7.  **最终检查**: 生成质量报告和总结

---

## 贡献

欢迎提交问题和改进建议。这是个实用工具，不需要太复杂的设计讨论。

---

## 许可证

MIT License。详见 [LICENSE](LICENSE) 文件。