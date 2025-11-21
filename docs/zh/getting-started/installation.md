---
title: 安装指南
description: Vibe Flow 完整安装说明
category: getting-started
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [安装, 设置, 前置要求]
language: zh
---

# 安装指南

## 前置要求

在安装 Vibe Flow 之前，请确保已安装以下工具：

### 必需工具

- **Git** (版本 2.25+)
  ```bash
  git --version
  ```

- **Node.js** (版本 16+) 和 **npm**
  ```bash
  node --version
  npm --version
  ```

- **Python** (版本 3.8+)
  ```bash
  python3 --version
  ```

- **Claude CLI** (Anthropic)
  ```bash
  claude --version
  ```

- **jq** (JSON 处理器)
  ```bash
  jq --version
  ```

### 安装命令

#### macOS
```bash
# 如果尚未安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装必需工具
brew install git node python3 jq

# 安装 Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

#### Ubuntu/Debian
```bash
# 更新软件包列表
sudo apt update

# 安装必需工具
sudo apt install -y git nodejs npm python3 python3-pip jq

# 安装 Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

#### Windows (WSL)
```bash
# 在 WSL Ubuntu/Debian 中
sudo apt update
sudo apt install -y git nodejs npm python3 python3-pip jq

# 安装 Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

## 安装 Vibe Flow

### 方式 1: 全局安装（推荐）
```bash
npm install -g @jingyi_qiu/vibe-flow
```

### 方式 2: 本地开发设置
```bash
# 克隆仓库
git clone https://github.com/yourusername/vibe.git
cd vibe

# 安装依赖
npm install

# 链接用于开发
npm link
```

## 验证安装

验证您的安装：
```bash
vibe --version
vibe --help
```

预期输出：
```
Vibe Flow v5.0 - Git-Native Autonomous Coding Engine
Usage: vibe [options]

Options:
  --help, -h     Show help message
  --version, -v  Show version number
```

## 配置

### 环境变量
```bash
# 并行代理数量（默认：2）
export MAX_PARALLEL_AGENTS=4

# 代理任务最大重试次数（默认：3）
export MAX_RETRIES=5

# 启用自动提交模式
export AUTO_COMMIT=true

# 设置日志级别
export LOG_LEVEL=debug
```

### Claude CLI 设置
确保您的 Claude CLI 已正确配置：
```bash
claude auth login
claude configure
```

## 故障排除

### 常见问题

#### 1. "Command not found: vibe"
**解决方案**：确保 npm global bin 在您的 PATH 中
```bash
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

#### 2. 全局安装时出现 "Permission denied"
**解决方案**：使用 npx 或修复 npm 权限
```bash
# 选项 1：使用 npx
npx @jingyi_qiu/vibe-flow

# 选项 2：修复 npm 权限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 3. Claude CLI 不工作
**解决方案**：重新安装 Claude CLI
```bash
# 删除旧安装
rm -rf ~/.claude

# 重新安装
curl -fsSL https://claude.ai/install.sh | sh
```

### 获取帮助
如果遇到问题：
1. 查看[用户指南](../guides/user-guide.md)
2. 阅读[配置说明](../references/configuration.md)
3. 在 GitHub 上提交 issue

## 下一步

- [快速开始指南](./quick-start.md) - 学习如何使用 Vibe Flow
- [用户指南](../guides/user-guide.md) - 全面的使用文档
- [API 参考](../references/api.md) - 详细的 API 文档

---

*最后更新：2025-11-21*